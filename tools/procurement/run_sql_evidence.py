"""Rebuild and reconcile the local Procurement KPI DuckDB SQL evidence layer.

Default usage from the repository root:
    python tools/procurement/run_sql_evidence.py

The script treats the committed CSV and maintained pandas implementation as independent
references. DuckDB remains a disposable local execution engine; generated databases are
written under .local/ and are ignored by Git.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path
from typing import Any

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.procurement.build_case_data import enrich, read_source, validate_source  # noqa: E402

DEFAULT_SOURCE = ROOT / "data" / "procurement-source.csv"
DEFAULT_DATABASE = ROOT / ".local" / "procurement.duckdb"
SQL_DIR = ROOT / "sql" / "procurement"
MODEL_CHAIN = (
    ("int_procurement_order_metrics", SQL_DIR / "int_procurement_order_metrics.sql"),
    ("mart_supplier_category_benchmark", SQL_DIR / "mart_supplier_category_benchmark.sql"),
    ("mart_supplier_monthly_trends", SQL_DIR / "mart_supplier_monthly_trends.sql"),
    ("mart_procurement_quality_exceptions", SQL_DIR / "mart_procurement_quality_exceptions.sql"),
    ("mart_status_delivery_reconciliation", SQL_DIR / "mart_status_delivery_reconciliation.sql"),
    ("mart_supplier_priority_scenarios", SQL_DIR / "mart_supplier_priority_scenarios.sql"),
)

CANONICAL_SOURCE_SHA256 = "bf9a529c52cd7de254994a55d087f865d3aefc0ba66790e8ee43a26e7beb6e9c"
CANONICAL_SOURCE_EXPECTATIONS = {
    "rows": 777,
    "unique_po_ids": 777,
    "suppliers": 5,
    "categories": 5,
    "supplier_category_pairs": 25,
    "missing_deliveries": 87,
    "missing_defects": 136,
    "impossible_deliveries": 1,
}
CANONICAL_STATUS_COUNTS = {
    "Delivered": 560,
    "Partially Delivered": 73,
    "Pending": 81,
    "Cancelled": 63,
}

ORDER_RECONCILIATION_COLUMNS = (
    "PO_ID",
    "Lead_Days",
    "Gross_Value",
    "Negotiated_Value",
    "Savings_Value",
    "Impossible_Delivery",
    "Delivered",
    "On_Time",
    "Defect_Eligible",
    "Noncompliant",
    "Order_Month",
    "Order_Week_Start",
    "Delivery_Month",
    "Delivery_Week_Start",
)
DATE_COLUMNS = {
    "Order_Date",
    "Delivery_Date",
    "Order_Month",
    "Order_Week_Start",
    "Delivery_Month",
    "Delivery_Week_Start",
}
BOOLEAN_COLUMNS = {
    "Impossible_Delivery",
    "Delivered",
    "On_Time",
    "Defect_Eligible",
    "Noncompliant",
}


class ReconciliationError(AssertionError):
    """Raised when DuckDB output diverges from an independent expectation."""


def _sql_literal(path: Path) -> str:
    return path.resolve().as_posix().replace("'", "''")


def _query_frame(database: Path, sql: str) -> pd.DataFrame:
    with duckdb.connect(str(database), read_only=True) as connection:
        return connection.execute(sql).fetchdf()


def validate_source_contract(source: Path) -> dict[str, int | str]:
    """Assert that SQL evidence is running against the locked canonical source snapshot."""
    frame = read_source(source)
    quality = validate_source(frame)
    normalized_source = source.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
    observed_sha256 = hashlib.sha256(normalized_source).hexdigest()

    observed: dict[str, int | str] = {
        "sha256": observed_sha256,
        "rows": int(len(frame)),
        "unique_po_ids": int(frame["PO_ID"].nunique()),
        "suppliers": int(frame["Supplier"].nunique()),
        "categories": int(frame["Item_Category"].nunique()),
        "supplier_category_pairs": int(
            frame[["Supplier", "Item_Category"]].drop_duplicates().shape[0]
        ),
        "missing_deliveries": int(quality["missingDeliveries"]),
        "missing_defects": int(quality["missingDefectCounts"]),
        "impossible_deliveries": int(quality["impossibleDeliverySequences"]),
    }

    mismatches: list[str] = []
    if observed_sha256 != CANONICAL_SOURCE_SHA256:
        mismatches.append(
            f"sha256 expected {CANONICAL_SOURCE_SHA256}, observed {observed_sha256}"
        )
    for key, expected in CANONICAL_SOURCE_EXPECTATIONS.items():
        if observed[key] != expected:
            mismatches.append(f"{key} expected {expected}, observed {observed[key]}")

    status_counts = {
        str(status): int(count)
        for status, count in frame["Order_Status"].value_counts().items()
    }
    if status_counts != CANONICAL_STATUS_COUNTS:
        mismatches.append(
            f"status counts expected {CANONICAL_STATUS_COUNTS}, observed {status_counts}"
        )

    if mismatches:
        raise ReconciliationError(
            "Canonical procurement source contract mismatch: " + "; ".join(mismatches)
        )

    return observed


def rebuild_database(database: Path, source: Path) -> None:
    database.parent.mkdir(parents=True, exist_ok=True)
    for disposable in (database, Path(f"{database}.wal")):
        if disposable.exists():
            disposable.unlink()

    source_sql = _sql_literal(source)
    with duckdb.connect(str(database)) as connection:
        connection.execute(
            f"""
            CREATE TABLE procurement_orders AS
            SELECT *
            FROM read_csv(
                '{source_sql}',
                header = true,
                types = {{'Compliance': 'VARCHAR'}}
            );
            """
        )

        for model_name, model_path in MODEL_CHAIN:
            model_sql = model_path.read_text(encoding="utf-8").strip().rstrip(";")
            connection.execute(f"CREATE TABLE {model_name} AS\n{model_sql};\n")


def _normalize_boolean(series: pd.Series) -> pd.Series:
    if pd.api.types.is_bool_dtype(series.dtype):
        return series.astype("boolean")
    normalized = series.astype("string").str.strip().str.lower()
    mapped = normalized.map(
        {
            "true": True,
            "false": False,
            "1": True,
            "0": False,
        }
    )
    return mapped.astype("boolean")


def _assert_series_match(actual: pd.Series, expected: pd.Series, column: str) -> None:
    if column in DATE_COLUMNS:
        # DuckDB's dataframe bridge currently returns date-like values with
        # microsecond resolution; pandas source dates use nanoseconds.
        # Normalize both before comparison so identical calendar dates do not
        # fail due solely to their transport resolution.
        actual = pd.to_datetime(actual, errors="coerce").astype("datetime64[ns]").dt.normalize()
        expected = pd.to_datetime(expected, errors="coerce").astype("datetime64[ns]").dt.normalize()
    elif column in BOOLEAN_COLUMNS:
        actual = _normalize_boolean(actual)
        expected = _normalize_boolean(expected)
    elif (
        pd.api.types.is_numeric_dtype(actual.dtype)
        and pd.api.types.is_numeric_dtype(expected.dtype)
        and (actual.isna().any() or expected.isna().any())
    ):
        # Pandas nullable integer output from DuckDB uses <NA>, whereas an
        # independently calculated shifted numeric series naturally uses NaN.
        # Compare the values on one floating null representation.
        actual = actual.astype("float64")
        expected = expected.astype("float64")

    try:
        pd.testing.assert_series_equal(
            actual.reset_index(drop=True),
            expected.reset_index(drop=True),
            check_names=False,
            check_dtype=False,
            check_exact=False,
            rtol=1e-10,
            atol=1e-10,
        )
    except AssertionError as exc:
        raise ReconciliationError(f"Column mismatch: {column}\n{exc}") from exc


def _assert_frame_match(
    actual: pd.DataFrame,
    expected: pd.DataFrame,
    sort_columns: list[str],
    label: str,
) -> None:
    if set(actual.columns) != set(expected.columns):
        raise ReconciliationError(
            f"{label} column mismatch: SQL-only={sorted(set(actual.columns) - set(expected.columns))}; "
            f"pandas-only={sorted(set(expected.columns) - set(actual.columns))}"
        )
    actual = actual.sort_values(sort_columns).reset_index(drop=True)
    expected = expected.loc[:, actual.columns].sort_values(sort_columns).reset_index(drop=True)
    if len(actual) != len(expected):
        raise ReconciliationError(f"{label} row count mismatch: SQL={len(actual)}, pandas={len(expected)}")
    for column in actual.columns:
        _assert_series_match(actual[column], expected[column], column)


def reconcile_order_metrics(database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(
        database,
        "SELECT " + ", ".join(ORDER_RECONCILIATION_COLUMNS)
        + " FROM int_procurement_order_metrics ORDER BY PO_ID",
    )
    reference = enrich(read_source(source)).loc[:, ORDER_RECONCILIATION_COLUMNS]
    reference = reference.sort_values("PO_ID").reset_index(drop=True)

    if len(sql) != len(reference):
        raise ReconciliationError(
            f"Order row count mismatch: SQL={len(sql)}, pandas={len(reference)}"
        )
    if sql["PO_ID"].duplicated().any():
        raise ReconciliationError("DuckDB order metric layer contains duplicate PO_ID values")

    for column in ORDER_RECONCILIATION_COLUMNS:
        _assert_series_match(sql[column], reference[column], column)

    return {
        "rows": len(sql),
        "unique_po_ids": int(sql["PO_ID"].nunique()),
        "impossible_deliveries": int(_normalize_boolean(sql["Impossible_Delivery"]).sum()),
        "delivered": int(_normalize_boolean(sql["Delivered"]).sum()),
        "on_time": int(_normalize_boolean(sql["On_Time"]).sum()),
        "defect_eligible": int(_normalize_boolean(sql["Defect_Eligible"]).sum()),
        "noncompliant": int(_normalize_boolean(sql["Noncompliant"]).sum()),
    }


def _aggregate_reference(group: pd.DataFrame) -> dict[str, Any]:
    delivered = group[group["Delivered"]]
    defect_eligible = group[group["Defect_Eligible"]]
    gross_value = float(group["Gross_Value"].sum())
    savings_value = float(group["Savings_Value"].sum())
    delivered_count = int(group["Delivered"].sum())
    defect_units = float(defect_eligible["Quantity"].sum())
    defective_units = float(defect_eligible["Defective_Units"].sum())

    return {
        "Order_Count": int(len(group)),
        "Negotiated_Spend": float(group["Negotiated_Value"].sum()),
        "Gross_Value": gross_value,
        "Savings_Value": savings_value,
        "Savings_Rate": None if gross_value == 0 else savings_value / gross_value,
        "Delivered_Order_Count": delivered_count,
        "On_Time_Order_Count": int(group["On_Time"].sum()),
        "Avg_Lead_Days": None if delivered.empty else float(delivered["Lead_Days"].mean()),
        "On_Time_Rate": (
            None if delivered_count == 0 else float(group["On_Time"].sum() / delivered_count)
        ),
        "Defect_Eligible_Order_Count": int(group["Defect_Eligible"].sum()),
        "Defect_Eligible_Units": defect_units,
        "Defective_Units": defective_units,
        "Defect_Rate": None if defect_units == 0 else defective_units / defect_units,
        "Compliant_Order_Count": int(group["Compliance"].eq("Yes").sum()),
        "Compliance_Rate": float(group["Compliance"].eq("Yes").sum() / len(group)),
    }


def _supplier_category_reference(source: Path) -> pd.DataFrame:
    model = enrich(read_source(source))
    supplier_rows: list[dict[str, Any]] = []
    for (supplier, category), group in model.groupby(["Supplier", "Item_Category"], sort=True):
        supplier_rows.append(
            {
                "Supplier": supplier,
                "Item_Category": category,
                **_aggregate_reference(group),
            }
        )
    suppliers = pd.DataFrame(supplier_rows)

    category_rows: list[dict[str, Any]] = []
    for category, group in model.groupby("Item_Category", sort=True):
        metrics = _aggregate_reference(group)
        category_rows.append(
            {
                "Item_Category": category,
                "Category_Supplier_Count": int(group["Supplier"].nunique()),
                **{f"Category_{key}": value for key, value in metrics.items()},
            }
        )
    categories = pd.DataFrame(category_rows)
    reference = suppliers.merge(categories, on="Item_Category", how="inner", validate="many_to_one")
    reference["Savings_Rate_vs_Category"] = (
        reference["Savings_Rate"] - reference["Category_Savings_Rate"]
    )
    reference["Avg_Lead_Days_vs_Category"] = (
        reference["Avg_Lead_Days"] - reference["Category_Avg_Lead_Days"]
    )
    reference["On_Time_Rate_vs_Category"] = (
        reference["On_Time_Rate"] - reference["Category_On_Time_Rate"]
    )
    reference["Defect_Rate_vs_Category"] = (
        reference["Defect_Rate"] - reference["Category_Defect_Rate"]
    )
    reference["Compliance_Rate_vs_Category"] = (
        reference["Compliance_Rate"] - reference["Category_Compliance_Rate"]
    )
    rank_columns = (
        ("Savings_Rate", "Savings_Rate_Category_Rank", False),
        ("On_Time_Rate", "On_Time_Rate_Category_Rank", False),
        ("Defect_Rate", "Defect_Rate_Category_Rank", True),
        ("Compliance_Rate", "Compliance_Rate_Category_Rank", False),
    )
    for metric, rank_column, ascending in rank_columns:
        reference[rank_column] = reference.groupby("Item_Category")[metric].rank(
            method="min",
            ascending=ascending,
            na_option="keep",
        )
    return reference.sort_values(["Item_Category", "Supplier"]).reset_index(drop=True)


def reconcile_supplier_category(
    database: Path, source: Path
) -> dict[str, int]:
    sql = _query_frame(
        database,
        "SELECT * FROM mart_supplier_category_benchmark ORDER BY Item_Category, Supplier",
    )
    reference = _supplier_category_reference(source)

    if len(sql) != len(reference):
        raise ReconciliationError(
            f"Supplier/category row count mismatch: SQL={len(sql)}, pandas={len(reference)}"
        )
    if sql.duplicated(["Supplier", "Item_Category"]).any():
        raise ReconciliationError("DuckDB supplier/category mart contains duplicate grain rows")

    missing_columns = [column for column in sql.columns if column not in reference.columns]
    if missing_columns:
        raise ReconciliationError(
            "Python reconciliation reference is missing SQL columns: " + ", ".join(missing_columns)
        )

    for column in sql.columns:
        _assert_series_match(sql[column], reference[column], column)

    return {
        "rows": len(sql),
        "unique_grain_rows": int(sql[["Supplier", "Item_Category"]].drop_duplicates().shape[0]),
        "orders": int(sql["Order_Count"].sum()),
        "delivered": int(sql["Delivered_Order_Count"].sum()),
        "on_time": int(sql["On_Time_Order_Count"].sum()),
        "defect_eligible": int(sql["Defect_Eligible_Order_Count"].sum()),
        "compliant": int(sql["Compliant_Order_Count"].sum()),
    }


def _rate(numerator: float, denominator: float) -> float | None:
    return None if denominator == 0 else float(numerator / denominator)


def _supplier_monthly_reference(source: Path) -> pd.DataFrame:
    model = enrich(read_source(source))
    months = pd.date_range(
        model["Order_Month"].min(), model["Order_Month"].max(), freq="MS"
    )
    rows: list[dict[str, Any]] = []
    for supplier in sorted(model["Supplier"].unique()):
        supplier_rows = model[model["Supplier"].eq(supplier)]
        for month in months:
            group = supplier_rows[supplier_rows["Order_Month"].eq(month)]
            delivered = group[group["Delivered"]]
            defect_eligible = group[group["Defect_Eligible"]]
            order_count = len(group)
            gross_value = float(group["Gross_Value"].sum())
            savings_value = float(group["Savings_Value"].sum())
            delivered_count = int(group["Delivered"].sum())
            on_time_count = int(group["On_Time"].sum())
            defect_eligible_units = float(defect_eligible["Quantity"].sum())
            defective_units = float(defect_eligible["Defective_Units"].sum())
            rows.append(
                {
                    "Supplier": supplier,
                    "Order_Month": month,
                    "Order_Count": order_count,
                    "Negotiated_Spend": float(group["Negotiated_Value"].sum()),
                    "Gross_Value": gross_value,
                    "Savings_Value": savings_value,
                    "Delivered_Order_Count": delivered_count,
                    "On_Time_Order_Count": on_time_count,
                    "Avg_Lead_Days": None if delivered.empty else float(delivered["Lead_Days"].mean()),
                    "Defect_Eligible_Order_Count": int(group["Defect_Eligible"].sum()),
                    "Defect_Eligible_Units": defect_eligible_units,
                    "Defective_Units": defective_units,
                    "Compliant_Order_Count": int(group["Compliance"].eq("Yes").sum()),
                    "Savings_Rate": _rate(savings_value, gross_value),
                    "On_Time_Rate": _rate(on_time_count, delivered_count),
                    "Defect_Rate": _rate(defective_units, defect_eligible_units),
                    "Compliance_Rate": _rate(int(group["Compliance"].eq("Yes").sum()), order_count),
                }
            )
    reference = pd.DataFrame(rows).sort_values(["Supplier", "Order_Month"])
    grouped = reference.groupby("Supplier", sort=False)
    for column in ("Order_Count", "Negotiated_Spend", "Savings_Rate", "On_Time_Rate"):
        reference[f"Prior_Month_{column}"] = grouped[column].shift(1)
    reference["Order_Count_MoM_Change"] = (
        reference["Order_Count"] - reference["Prior_Month_Order_Count"]
    )
    reference["Negotiated_Spend_MoM_Change"] = (
        reference["Negotiated_Spend"] - reference["Prior_Month_Negotiated_Spend"]
    )
    reference["Savings_Rate_MoM_Change"] = (
        reference["Savings_Rate"] - reference["Prior_Month_Savings_Rate"]
    )
    reference["On_Time_Rate_MoM_Change"] = (
        reference["On_Time_Rate"] - reference["Prior_Month_On_Time_Rate"]
    )
    reference["Rolling_3_Month_Negotiated_Spend"] = grouped["Negotiated_Spend"].transform(
        lambda values: values.rolling(3, min_periods=1).sum()
    )
    rolling_on_time = grouped["On_Time_Order_Count"].transform(
        lambda values: values.rolling(3, min_periods=1).sum()
    )
    rolling_delivered = grouped["Delivered_Order_Count"].transform(
        lambda values: values.rolling(3, min_periods=1).sum()
    )
    rolling_defective = grouped["Defective_Units"].transform(
        lambda values: values.rolling(3, min_periods=1).sum()
    )
    rolling_defect_eligible = grouped["Defect_Eligible_Units"].transform(
        lambda values: values.rolling(3, min_periods=1).sum()
    )
    reference["Rolling_3_Month_On_Time_Rate"] = rolling_on_time / rolling_delivered.replace(0, pd.NA)
    reference["Rolling_3_Month_Defect_Rate"] = (
        rolling_defective / rolling_defect_eligible.replace(0, pd.NA)
    )
    return reference.reset_index(drop=True)


def reconcile_supplier_monthly(database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(database, "SELECT * FROM mart_supplier_monthly_trends")
    reference = _supplier_monthly_reference(source)
    if sql.duplicated(["Supplier", "Order_Month"]).any():
        raise ReconciliationError("Supplier/month mart contains duplicate grain rows")
    _assert_frame_match(sql, reference, ["Supplier", "Order_Month"], "Supplier/month mart")
    return {
        "rows": len(sql),
        "suppliers": int(sql["Supplier"].nunique()),
        "months": int(sql["Order_Month"].nunique()),
        "zero_order_months": int(sql["Order_Count"].eq(0).sum()),
    }


def _quality_exception_reference(source: Path) -> pd.DataFrame:
    model = enrich(read_source(source))
    rows: list[dict[str, Any]] = []
    definitions = (
        (
            "missing_delivery_date", lambda row: pd.isna(row.Delivery_Date),
            "Delivery date is absent.", "lead time; on-time delivery",
            "Excluded from delivery and on-time denominators; retained elsewhere.",
        ),
        (
            "impossible_delivery_chronology", lambda row: row.Impossible_Delivery,
            "Delivery date precedes order date.", "lead time; on-time delivery; delivery period analysis",
            "Excluded from delivery, on-time, and delivery-period denominators; retained elsewhere.",
        ),
        (
            "missing_defect_observation", lambda row: not row.Defect_Eligible,
            "Defective-units observation is absent.", "defect rate",
            "Excluded from defect-rate numerator and denominator; retained elsewhere.",
        ),
        (
            "pending_order_status", lambda row: row.Order_Status == "Pending",
            "Source Order_Status is Pending.", "status interpretation",
            "No status-only exclusion is applied; inspect alongside observed delivery state.",
        ),
        (
            "cancelled_order_status", lambda row: row.Order_Status == "Cancelled",
            "Source Order_Status is Cancelled.", "status interpretation",
            "No status-only exclusion is applied; inspect alongside observed delivery state.",
        ),
        (
            "completion_status_missing_delivery",
            lambda row: row.Order_Status in {"Delivered", "Partially Delivered"} and pd.isna(row.Delivery_Date),
            "Completion-oriented status has no delivery date.",
            "status interpretation; lead time; on-time delivery",
            "Excluded from delivery and on-time denominators because delivery evidence is absent.",
        ),
        (
            "noncompletion_status_with_delivery",
            lambda row: row.Order_Status in {"Pending", "Cancelled"} and row.Delivered,
            "Pending or cancelled status has a valid delivery date.", "status interpretation",
            "Included in delivery metrics based on valid observed delivery, not status alone.",
        ),
    )
    for row in model.itertuples(index=False):
        for code, predicate, description, metrics, treatment in definitions:
            if predicate(row):
                rows.append(
                    {
                        "PO_ID": row.PO_ID,
                        "Supplier": row.Supplier,
                        "Item_Category": row.Item_Category,
                        "Order_Status": row.Order_Status,
                        "Order_Date": row.Order_Date,
                        "Delivery_Date": row.Delivery_Date,
                        "Exception_Code": code,
                        "Exception_Description": description,
                        "Affected_Metrics": metrics,
                        "Metric_Treatment": treatment,
                    }
                )
    return pd.DataFrame(rows)


def reconcile_quality_exceptions(database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(database, "SELECT * FROM mart_procurement_quality_exceptions")
    reference = _quality_exception_reference(source)
    if sql.duplicated(["PO_ID", "Exception_Code"]).any():
        raise ReconciliationError("Quality exceptions mart contains duplicate PO_ID/exception rows")
    _assert_frame_match(sql, reference, ["PO_ID", "Exception_Code"], "Quality exceptions mart")
    return {
        "rows": len(sql),
        "missing_deliveries": int(sql["Exception_Code"].eq("missing_delivery_date").sum()),
        "missing_defects": int(sql["Exception_Code"].eq("missing_defect_observation").sum()),
        "impossible_deliveries": int(sql["Exception_Code"].eq("impossible_delivery_chronology").sum()),
    }


def _status_delivery_reference(source: Path) -> pd.DataFrame:
    model = enrich(read_source(source)).copy()

    def observed(row: pd.Series) -> str:
        if row["Impossible_Delivery"]:
            return "impossible_delivery_chronology"
        return "missing_delivery_date" if pd.isna(row["Delivery_Date"]) else "valid_delivery_date"

    def classification(row: pd.Series) -> str:
        if row["Impossible_Delivery"]:
            return "impossible_delivery_chronology"
        completion = row["Order_Status"] in {"Delivered", "Partially Delivered"}
        if completion:
            return "completion_status_with_valid_delivery" if row["Delivered"] else "completion_status_missing_delivery"
        return "noncompletion_status_with_valid_delivery" if row["Delivered"] else "noncompletion_status_missing_delivery"

    model["Observed_Delivery_State"] = model.apply(observed, axis=1)
    model["Reconciliation_Classification"] = model.apply(classification, axis=1)
    return model.loc[:, [
        "PO_ID", "Supplier", "Item_Category", "Order_Status", "Order_Date", "Delivery_Date",
        "Impossible_Delivery", "Delivered", "On_Time", "Observed_Delivery_State",
        "Reconciliation_Classification",
    ]]


def reconcile_status_delivery(database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(database, "SELECT * FROM mart_status_delivery_reconciliation")
    reference = _status_delivery_reference(source)
    if sql["PO_ID"].duplicated().any():
        raise ReconciliationError("Status/delivery reconciliation mart contains duplicate PO_ID values")
    _assert_frame_match(sql, reference, ["PO_ID"], "Status/delivery reconciliation mart")
    classifications = sql["Reconciliation_Classification"]
    return {
        "rows": len(sql),
        "classifications": int(classifications.nunique()),
        "completion_status_missing_delivery": int(
            classifications.eq("completion_status_missing_delivery").sum()
        ),
        "noncompletion_status_with_valid_delivery": int(
            classifications.eq("noncompletion_status_with_valid_delivery").sum()
        ),
    }


SCENARIO_WEIGHTS = {
    "balanced_performance": (0.25, 0.25, 0.25, 0.25),
    "cost_savings_priority": (0.55, 0.15, 0.15, 0.15),
    "delivery_reliability_priority": (0.15, 0.55, 0.15, 0.15),
    "quality_compliance_priority": (0.15, 0.15, 0.40, 0.30),
}


def _supplier_scenario_reference(source: Path) -> pd.DataFrame:
    model = enrich(read_source(source))
    rows: list[dict[str, Any]] = []
    for supplier, group in model.groupby("Supplier", sort=True):
        delivered = group[group["Delivered"]]
        eligible = group[group["Defect_Eligible"]]
        rows.append({
            "Supplier": supplier,
            "Savings_Rate": _rate(group["Savings_Value"].sum(), group["Gross_Value"].sum()),
            "On_Time_Rate": _rate(group["On_Time"].sum(), len(delivered)),
            "Defect_Rate": _rate(eligible["Defective_Units"].sum(), eligible["Quantity"].sum()),
            "Compliance_Rate": _rate(group["Compliance"].eq("Yes").sum(), len(group)),
        })
    suppliers = pd.DataFrame(rows)
    normalizations = (
        ("Savings_Rate", "Normalized_Savings_Rate", True),
        ("On_Time_Rate", "Normalized_On_Time_Rate", True),
        ("Defect_Rate", "Normalized_Defect_Rate", False),
        ("Compliance_Rate", "Normalized_Compliance_Rate", True),
    )
    for metric, normalized, higher_is_better in normalizations:
        low, high = suppliers[metric].min(), suppliers[metric].max()
        if pd.isna(low) or pd.isna(high):
            suppliers[normalized] = pd.NA
        elif high == low:
            suppliers[normalized] = 1.0
        else:
            values = (suppliers[metric] - low) / (high - low)
            suppliers[normalized] = values if higher_is_better else 1 - values
    scenario_rows: list[dict[str, Any]] = []
    for supplier in suppliers.to_dict("records"):
        available = all(pd.notna(supplier[key]) for key, _, _ in normalizations)
        for scenario, weights in SCENARIO_WEIGHTS.items():
            score = None
            if available:
                score = sum(
                    supplier[normalized] * weight
                    for (_, normalized, _), weight in zip(normalizations, weights, strict=True)
                )
            scenario_rows.append({
                **supplier,
                "Decision_Scenario": scenario,
                "Savings_Weight": weights[0],
                "On_Time_Weight": weights[1],
                "Defect_Weight": weights[2],
                "Compliance_Weight": weights[3],
                "Score_Status": "available" if available else "insufficient_data",
                "Weighted_Score": score,
            })
    reference = pd.DataFrame(scenario_rows)
    reference["Scenario_Rank"] = pd.NA
    for scenario, indexes in reference.groupby("Decision_Scenario").groups.items():
        ranked = reference.loc[list(indexes)].dropna(subset=["Weighted_Score"]).sort_values(
            ["Weighted_Score", "Supplier"], ascending=[False, True]
        )
        reference.loc[ranked.index, "Scenario_Rank"] = range(1, len(ranked) + 1)
    return reference


def reconcile_supplier_scenarios(database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(database, "SELECT * FROM mart_supplier_priority_scenarios")
    reference = _supplier_scenario_reference(source)
    if sql.duplicated(["Supplier", "Decision_Scenario"]).any():
        raise ReconciliationError("Supplier scenario mart contains duplicate Supplier/scenario rows")
    _assert_frame_match(sql, reference, ["Decision_Scenario", "Supplier"], "Supplier scenario mart")
    weight_totals = sql.assign(
        weight_total=sql[["Savings_Weight", "On_Time_Weight", "Defect_Weight", "Compliance_Weight"]].sum(axis=1)
    )["weight_total"]
    if not weight_totals.round(10).eq(1.0).all():
        raise ReconciliationError("Supplier scenario weights do not total 1.0")
    return {
        "rows": len(sql),
        "suppliers": int(sql["Supplier"].nunique()),
        "scenarios": int(sql["Decision_Scenario"].nunique()),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild the Procurement DuckDB SQL model chain and reconcile it to pandas."
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Rebuild the DuckDB model chain without running reconciliation checks.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.source.resolve()
    database = args.database.resolve()

    if not source.exists():
        raise FileNotFoundError(f"Procurement source not found: {source}")

    source_contract = validate_source_contract(source)
    rebuild_database(database, source)
    print(
        "Canonical source contract passed: "
        f"{source_contract['rows']} rows / {source_contract['unique_po_ids']} unique PO_IDs / "
        f"{source_contract['suppliers']} suppliers / {source_contract['categories']} categories"
    )
    print(f"Rebuilt DuckDB {duckdb.__version__} model chain: {database}")
    if args.build_only:
        return 0

    order = reconcile_order_metrics(database, source)
    benchmark = reconcile_supplier_category(database, source)
    monthly = reconcile_supplier_monthly(database, source)
    exceptions = reconcile_quality_exceptions(database, source)
    reconciliation = reconcile_status_delivery(database, source)
    scenarios = reconcile_supplier_scenarios(database, source)
    print(
        "Order metrics reconciled: "
        f"{order['rows']} rows / {order['unique_po_ids']} unique PO_IDs / "
        f"{order['impossible_deliveries']} impossible / {order['delivered']} delivered / "
        f"{order['on_time']} on time / {order['defect_eligible']} defect-eligible / "
        f"{order['noncompliant']} noncompliant"
    )
    print(
        "Supplier/category mart reconciled: "
        f"{benchmark['rows']} rows / {benchmark['unique_grain_rows']} unique grain rows / "
        f"{benchmark['orders']} orders / {benchmark['delivered']} delivered / "
        f"{benchmark['on_time']} on time / {benchmark['defect_eligible']} defect-eligible / "
        f"{benchmark['compliant']} compliant"
    )
    print(
        "Supplier/month mart reconciled: "
        f"{monthly['rows']} rows / {monthly['suppliers']} suppliers / "
        f"{monthly['months']} months / {monthly['zero_order_months']} zero-order spine months"
    )
    print(
        "Quality exceptions reconciled: "
        f"{exceptions['rows']} rows / {exceptions['missing_deliveries']} missing deliveries / "
        f"{exceptions['missing_defects']} missing defect observations / "
        f"{exceptions['impossible_deliveries']} impossible deliveries"
    )
    print(
        "Status/delivery reconciliation: "
        f"{reconciliation['rows']} rows / {reconciliation['classifications']} classifications / "
        f"{reconciliation['completion_status_missing_delivery']} completion statuses missing delivery / "
        f"{reconciliation['noncompletion_status_with_valid_delivery']} noncompletion statuses with valid delivery"
    )
    print(
        "Supplier scenarios reconciled: "
        f"{scenarios['rows']} rows / {scenarios['suppliers']} suppliers / "
        f"{scenarios['scenarios']} scenarios"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
