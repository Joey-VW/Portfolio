"""Rebuild and reconcile the Procurement KPI SQL evidence layer in BigQuery.

Default usage from the repository root:
    python tools/procurement/run_bigquery_evidence.py

The runner loads the locked canonical CSV with an explicit BigQuery schema, materializes
the GoogleSQL model chain, and compares every output with the independently maintained
pandas reference used by the local DuckDB evidence harness.

Authentication uses Google Application Default Credentials (ADC).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from google.api_core.exceptions import NotFound
from google.cloud import bigquery

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.procurement.build_case_data import enrich, read_source  # noqa: E402
from tools.procurement.run_sql_evidence import (  # noqa: E402
    ORDER_RECONCILIATION_COLUMNS,
    ReconciliationError,
    _assert_frame_match,
    _assert_series_match,
    _normalize_boolean,
    _quality_exception_reference,
    _status_delivery_reference,
    _supplier_category_reference,
    _supplier_monthly_reference,
    _supplier_scenario_reference,
    validate_source_contract,
)

DEFAULT_SOURCE = ROOT / "data" / "procurement-source.csv"
DEFAULT_PROJECT = "wistoworks-analytics"
DEFAULT_DATASET = "procurement_sql_evidence"
DEFAULT_LOCATION = "US"
SQL_DIR = ROOT / "sql" / "procurement" / "bigquery"

MODEL_CHAIN = (
    ("int_procurement_order_metrics", SQL_DIR / "int_procurement_order_metrics.sql"),
    (
        "mart_supplier_category_benchmark",
        SQL_DIR / "mart_supplier_category_benchmark.sql",
    ),
    ("mart_supplier_monthly_trends", SQL_DIR / "mart_supplier_monthly_trends.sql"),
    (
        "mart_procurement_quality_exceptions",
        SQL_DIR / "mart_procurement_quality_exceptions.sql",
    ),
    (
        "mart_status_delivery_reconciliation",
        SQL_DIR / "mart_status_delivery_reconciliation.sql",
    ),
    (
        "mart_supplier_priority_scenarios",
        SQL_DIR / "mart_supplier_priority_scenarios.sql",
    ),
)

SOURCE_SCHEMA = (
    bigquery.SchemaField("PO_ID", "STRING"),
    bigquery.SchemaField("Supplier", "STRING"),
    bigquery.SchemaField("Order_Date", "DATE"),
    bigquery.SchemaField("Delivery_Date", "DATE"),
    bigquery.SchemaField("Item_Category", "STRING"),
    bigquery.SchemaField("Order_Status", "STRING"),
    bigquery.SchemaField("Quantity", "INTEGER"),
    bigquery.SchemaField("Unit_Price", "FLOAT"),
    bigquery.SchemaField("Negotiated_Price", "FLOAT"),
    bigquery.SchemaField("Defective_Units", "FLOAT"),
    bigquery.SchemaField("Compliance", "STRING"),
)


def _table_id(project: str, dataset: str, table: str) -> str:
    return f"{project}.{dataset}.{table}"


def _render_sql(path: Path, project: str, dataset: str) -> str:
    sql = path.read_text(encoding="utf-8")
    rendered = (
        sql.replace("{{ project_id }}", project)
        .replace("{{ dataset_id }}", dataset)
        .strip()
        .rstrip(";")
    )
    if "{{" in rendered or "}}" in rendered:
        raise ValueError(f"Unresolved SQL template marker in {path}")
    return rendered


def ensure_dataset(
    client: bigquery.Client,
    project: str,
    dataset: str,
    location: str,
) -> bigquery.Dataset:
    dataset_id = f"{project}.{dataset}"
    try:
        current = client.get_dataset(dataset_id)
    except NotFound:
        current = bigquery.Dataset(dataset_id)
        current.location = location
        current.description = (
            "BigQuery validation environment for the Procurement KPI SQL evidence package."
        )
        current = client.create_dataset(current)

    observed_location = (current.location or "").upper()
    if observed_location and observed_location != location.upper():
        raise ReconciliationError(
            f"Dataset {dataset_id} is in {current.location}, expected {location}."
        )
    return current


def load_source(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> int:
    destination = _table_id(project, dataset, "procurement_orders")
    job_config = bigquery.LoadJobConfig(
        schema=list(SOURCE_SCHEMA),
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )
    with source.open("rb") as handle:
        job = client.load_table_from_file(
            handle,
            destination,
            job_config=job_config,
            location=location,
        )
        job.result()

    table = client.get_table(destination)
    return int(table.num_rows)


def rebuild_models(
    client: bigquery.Client,
    project: str,
    dataset: str,
    location: str,
) -> None:
    for model_name, model_path in MODEL_CHAIN:
        model_sql = _render_sql(model_path, project, dataset)
        destination = _table_id(project, dataset, model_name)
        ddl = f"CREATE OR REPLACE TABLE `{destination}` AS\n{model_sql}"
        client.query(ddl, location=location).result()


def _query_frame(
    client: bigquery.Client,
    project: str,
    dataset: str,
    table: str,
    location: str,
) -> pd.DataFrame:
    rows = client.query(
        f"SELECT * FROM `{_table_id(project, dataset, table)}`",
        location=location,
    ).result()
    columns = [field.name for field in rows.schema]
    return pd.DataFrame([dict(row.items()) for row in rows], columns=columns)


def reconcile_order_metrics(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "int_procurement_order_metrics",
        location,
    ).loc[:, ORDER_RECONCILIATION_COLUMNS]
    reference = enrich(read_source(source)).loc[:, ORDER_RECONCILIATION_COLUMNS]
    sql = sql.sort_values("PO_ID").reset_index(drop=True)
    reference = reference.sort_values("PO_ID").reset_index(drop=True)

    if len(sql) != len(reference):
        raise ReconciliationError(
            f"BigQuery order row count mismatch: SQL={len(sql)}, pandas={len(reference)}"
        )
    if sql["PO_ID"].duplicated().any():
        raise ReconciliationError("BigQuery order metric layer contains duplicate PO_ID values")

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


def reconcile_supplier_category(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "mart_supplier_category_benchmark",
        location,
    )
    reference = _supplier_category_reference(source)
    if sql.duplicated(["Supplier", "Item_Category"]).any():
        raise ReconciliationError("BigQuery supplier/category mart has duplicate grain rows")
    _assert_frame_match(
        sql,
        reference,
        ["Item_Category", "Supplier"],
        "BigQuery supplier/category mart",
    )
    return {
        "rows": len(sql),
        "unique_grain_rows": int(
            sql[["Supplier", "Item_Category"]].drop_duplicates().shape[0]
        ),
        "orders": int(sql["Order_Count"].sum()),
        "delivered": int(sql["Delivered_Order_Count"].sum()),
        "on_time": int(sql["On_Time_Order_Count"].sum()),
        "defect_eligible": int(sql["Defect_Eligible_Order_Count"].sum()),
        "compliant": int(sql["Compliant_Order_Count"].sum()),
    }


def reconcile_supplier_monthly(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "mart_supplier_monthly_trends",
        location,
    )
    reference = _supplier_monthly_reference(source)
    if sql.duplicated(["Supplier", "Order_Month"]).any():
        raise ReconciliationError("BigQuery supplier/month mart has duplicate grain rows")
    _assert_frame_match(
        sql,
        reference,
        ["Supplier", "Order_Month"],
        "BigQuery supplier/month mart",
    )
    return {
        "rows": len(sql),
        "suppliers": int(sql["Supplier"].nunique()),
        "months": int(sql["Order_Month"].nunique()),
        "zero_order_months": int(sql["Order_Count"].eq(0).sum()),
    }


def reconcile_quality_exceptions(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "mart_procurement_quality_exceptions",
        location,
    )
    reference = _quality_exception_reference(source)
    if sql.duplicated(["PO_ID", "Exception_Code"]).any():
        raise ReconciliationError(
            "BigQuery quality exceptions mart has duplicate PO_ID/exception rows"
        )
    _assert_frame_match(
        sql,
        reference,
        ["PO_ID", "Exception_Code"],
        "BigQuery quality exceptions mart",
    )
    return {
        "rows": len(sql),
        "missing_deliveries": int(
            sql["Exception_Code"].eq("missing_delivery_date").sum()
        ),
        "missing_defects": int(
            sql["Exception_Code"].eq("missing_defect_observation").sum()
        ),
        "impossible_deliveries": int(
            sql["Exception_Code"].eq("impossible_delivery_chronology").sum()
        ),
    }


def reconcile_status_delivery(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "mart_status_delivery_reconciliation",
        location,
    )
    reference = _status_delivery_reference(source)
    if sql["PO_ID"].duplicated().any():
        raise ReconciliationError(
            "BigQuery status/delivery reconciliation has duplicate PO_ID values"
        )
    _assert_frame_match(
        sql,
        reference,
        ["PO_ID"],
        "BigQuery status/delivery reconciliation",
    )
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


def reconcile_supplier_scenarios(
    client: bigquery.Client,
    source: Path,
    project: str,
    dataset: str,
    location: str,
) -> dict[str, int]:
    sql = _query_frame(
        client,
        project,
        dataset,
        "mart_supplier_priority_scenarios",
        location,
    )
    reference = _supplier_scenario_reference(source)
    if sql.duplicated(["Supplier", "Decision_Scenario"]).any():
        raise ReconciliationError(
            "BigQuery supplier scenario mart has duplicate Supplier/scenario rows"
        )
    _assert_frame_match(
        sql,
        reference,
        ["Decision_Scenario", "Supplier"],
        "BigQuery supplier scenario mart",
    )
    weight_columns = [
        "Savings_Weight",
        "On_Time_Weight",
        "Defect_Weight",
        "Compliance_Weight",
    ]
    weight_totals = sql.assign(weight_total=sql[weight_columns].sum(axis=1))[
        "weight_total"
    ]
    if not weight_totals.round(10).eq(1.0).all():
        raise ReconciliationError("BigQuery supplier scenario weights do not total 1.0")
    return {
        "rows": len(sql),
        "suppliers": int(sql["Supplier"].nunique()),
        "scenarios": int(sql["Decision_Scenario"].nunique()),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild the Procurement BigQuery model chain and reconcile it to pandas."
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--location", default=DEFAULT_LOCATION)
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Load/rebuild the BigQuery model chain without reconciliation checks.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.source.resolve()

    if not source.exists():
        raise FileNotFoundError(f"Procurement source not found: {source}")

    source_contract = validate_source_contract(source)
    client = bigquery.Client(project=args.project, location=args.location)
    ensure_dataset(client, args.project, args.dataset, args.location)

    loaded_rows = load_source(
        client,
        source,
        args.project,
        args.dataset,
        args.location,
    )
    if loaded_rows != source_contract["rows"]:
        raise ReconciliationError(
            f"BigQuery source load expected {source_contract['rows']} rows, observed {loaded_rows}"
        )

    rebuild_models(client, args.project, args.dataset, args.location)

    print(
        "Canonical source contract passed: "
        f"{source_contract['rows']} rows / "
        f"{source_contract['unique_po_ids']} unique PO_IDs / "
        f"{source_contract['suppliers']} suppliers / "
        f"{source_contract['categories']} categories"
    )
    print(
        "Rebuilt BigQuery GoogleSQL model chain: "
        f"{args.project}.{args.dataset} ({args.location})"
    )
    if args.build_only:
        return 0

    order = reconcile_order_metrics(
        client, source, args.project, args.dataset, args.location
    )
    benchmark = reconcile_supplier_category(
        client, source, args.project, args.dataset, args.location
    )
    monthly = reconcile_supplier_monthly(
        client, source, args.project, args.dataset, args.location
    )
    exceptions = reconcile_quality_exceptions(
        client, source, args.project, args.dataset, args.location
    )
    reconciliation = reconcile_status_delivery(
        client, source, args.project, args.dataset, args.location
    )
    scenarios = reconcile_supplier_scenarios(
        client, source, args.project, args.dataset, args.location
    )

    print(
        "BigQuery order metrics reconciled: "
        f"{order['rows']} rows / {order['unique_po_ids']} unique PO_IDs / "
        f"{order['impossible_deliveries']} impossible / "
        f"{order['delivered']} delivered / {order['on_time']} on time / "
        f"{order['defect_eligible']} defect-eligible / "
        f"{order['noncompliant']} noncompliant"
    )
    print(
        "BigQuery supplier/category mart reconciled: "
        f"{benchmark['rows']} rows / "
        f"{benchmark['unique_grain_rows']} unique grain rows / "
        f"{benchmark['orders']} orders / {benchmark['delivered']} delivered / "
        f"{benchmark['on_time']} on time / "
        f"{benchmark['defect_eligible']} defect-eligible / "
        f"{benchmark['compliant']} compliant"
    )
    print(
        "BigQuery supplier/month mart reconciled: "
        f"{monthly['rows']} rows / {monthly['suppliers']} suppliers / "
        f"{monthly['months']} months / "
        f"{monthly['zero_order_months']} zero-order spine months"
    )
    print(
        "BigQuery quality exceptions reconciled: "
        f"{exceptions['rows']} rows / "
        f"{exceptions['missing_deliveries']} missing deliveries / "
        f"{exceptions['missing_defects']} missing defect observations / "
        f"{exceptions['impossible_deliveries']} impossible deliveries"
    )
    print(
        "BigQuery status/delivery reconciliation: "
        f"{reconciliation['rows']} rows / "
        f"{reconciliation['classifications']} classifications / "
        f"{reconciliation['completion_status_missing_delivery']} "
        "completion statuses missing delivery / "
        f"{reconciliation['noncompletion_status_with_valid_delivery']} "
        "noncompletion statuses with valid delivery"
    )
    print(
        "BigQuery supplier scenarios reconciled: "
        f"{scenarios['rows']} rows / {scenarios['suppliers']} suppliers / "
        f"{scenarios['scenarios']} scenarios"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
