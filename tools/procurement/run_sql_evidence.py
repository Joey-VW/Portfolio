"""Rebuild and reconcile the local Procurement KPI DuckDB SQL evidence layer.

Default usage from the repository root:
    python tools/procurement/run_sql_evidence.py

The script treats the committed CSV and maintained pandas implementation as independent
references. DuckDB remains a disposable local execution engine; generated databases are
written under .local/ and are ignored by Git.
"""

from __future__ import annotations

import argparse
from io import StringIO
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.procurement.build_case_data import enrich, read_source

DEFAULT_SOURCE = ROOT / "data" / "procurement-source.csv"
DEFAULT_DATABASE = ROOT / ".local" / "procurement.duckdb"
SQL_DIR = ROOT / "sql" / "procurement"
MODEL_CHAIN = (
    ("int_procurement_order_metrics", SQL_DIR / "int_procurement_order_metrics.sql"),
    ("mart_supplier_category_benchmark", SQL_DIR / "mart_supplier_category_benchmark.sql"),
)

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
    """Raised when DuckDB output diverges from the maintained pandas reference."""


def _sql_literal(path: Path) -> str:
    return path.resolve().as_posix().replace("'", "''")


def _resolve_duckdb(explicit: str | None) -> str:
    candidate = explicit or os.environ.get("DUCKDB_BIN")
    if candidate:
        resolved = shutil.which(candidate) or candidate
        if Path(resolved).exists() or shutil.which(resolved):
            return str(resolved)
        raise FileNotFoundError(f"DuckDB executable not found: {candidate}")

    resolved = shutil.which("duckdb") or shutil.which("duckdb.exe")
    if resolved:
        return resolved
    raise FileNotFoundError(
        "DuckDB CLI was not found on PATH. Install DuckDB or set DUCKDB_BIN to its executable."
    )


def _run_sql(duckdb_bin: str, database: Path, sql: str) -> None:
    result = subprocess.run(
        [duckdb_bin, "-batch", "-bail", str(database)],
        input=sql,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown DuckDB error"
        raise RuntimeError(detail)


def _query_frame(duckdb_bin: str, database: Path, sql: str) -> pd.DataFrame:
    result = subprocess.run(
        [duckdb_bin, "-batch", "-bail", "-csv", "-header", str(database), sql],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown DuckDB error"
        raise RuntimeError(detail)
    if not result.stdout.strip():
        return pd.DataFrame()
    return pd.read_csv(StringIO(result.stdout))


def rebuild_database(duckdb_bin: str, database: Path, source: Path) -> None:
    database.parent.mkdir(parents=True, exist_ok=True)
    for disposable in (database, Path(f"{database}.wal")):
        if disposable.exists():
            disposable.unlink()

    source_sql = _sql_literal(source)
    _run_sql(
        duckdb_bin,
        database,
        f"""
        CREATE TABLE procurement_orders AS
        SELECT *
        FROM read_csv(
            '{source_sql}',
            header = true,
            types = {{'Compliance': 'VARCHAR'}}
        );
        """,
    )

    for model_name, model_path in MODEL_CHAIN:
        model_sql = model_path.read_text(encoding="utf-8").strip().rstrip(";")
        _run_sql(
            duckdb_bin,
            database,
            f"CREATE TABLE {model_name} AS\n{model_sql};\n",
        )


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
        actual = pd.to_datetime(actual, errors="coerce").dt.normalize()
        expected = pd.to_datetime(expected, errors="coerce").dt.normalize()
    elif column in BOOLEAN_COLUMNS:
        actual = _normalize_boolean(actual)
        expected = _normalize_boolean(expected)

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


def reconcile_order_metrics(duckdb_bin: str, database: Path, source: Path) -> dict[str, int]:
    sql = _query_frame(
        duckdb_bin,
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
    return reference.sort_values(["Item_Category", "Supplier"]).reset_index(drop=True)


def reconcile_supplier_category(
    duckdb_bin: str, database: Path, source: Path
) -> dict[str, int]:
    sql = _query_frame(
        duckdb_bin,
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild the Procurement DuckDB SQL model chain and reconcile it to pandas."
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--duckdb-bin", help="DuckDB CLI path/name; defaults to PATH or DUCKDB_BIN")
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Rebuild the DuckDB model chain without running reconciliation checks.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    duckdb_bin = _resolve_duckdb(args.duckdb_bin)
    source = args.source.resolve()
    database = args.database.resolve()

    if not source.exists():
        raise FileNotFoundError(f"Procurement source not found: {source}")

    rebuild_database(duckdb_bin, database, source)
    print(f"Rebuilt DuckDB model chain: {database}")
    if args.build_only:
        return 0

    order = reconcile_order_metrics(duckdb_bin, database, source)
    benchmark = reconcile_supplier_category(duckdb_bin, database, source)
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
