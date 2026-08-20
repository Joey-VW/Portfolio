# Procurement KPI Analysis

This case study rebuilds the legacy Procurement KPI project as a reproducible, static portfolio experience and a compact analytics-engineering evidence package. The browser still reads a committed JSON artifact, so no Kaggle or Google Cloud credentials are required to view the public case study. Separately, the same locked source and business rules are exercised through DuckDB SQL, BigQuery/GoogleSQL, and dbt-duckdb and reconciled against an independent pandas reference.

## Reproduce the browser artifact

From the repository root:

```bash
python tools/procurement/build_case_data.py
python tools/procurement/validate_case_data.py
```

The build reads `data/procurement-source.csv`, applies the contract and metric layer, and writes `data/procurement-kpi-analysis.json`. Any blocking contract violation stops the command with a nonzero exit. Measurable source exceptions, such as a missing delivery or an impossible date sequence, are counted and quarantined from the affected metric rather than silently discarded.

The legacy artifact builder can also write its validated metric layer to BigQuery when explicitly configured:

```bash
python tools/procurement/build_case_data.py \
  --gcp-project YOUR_PROJECT \
  --bigquery-table YOUR_DATASET.procurement_orders
```

That optional loading path is separate from the validated GoogleSQL evidence layer described below.

## Source and provenance

- Dataset: `shahriarkabir/procurement-kpi-analysis-dataset`
- Publisher: Shahriar Kabir on Kaggle
- Retrieved: July 28, 2026
- Downloaded file: `Procurement KPI Analysis Dataset.csv`
- Rows in the retrieved file: 777
- Date coverage: 2022–2023
- License claim: CC0 / Public Domain, as listed by the publisher
- Locked source SHA-256: `bf9a529c52cd7de254994a55d087f865d3aefc0ba66790e8ee43a26e7beb6e9c`

Kaggle's page description referred to 700 purchase orders when this project was reviewed, while the retrieved file contained 777. The maintained case study reports the actual retrieved file and does not independently verify that the records came from a real enterprise.

## Architecture

```text
                         -> pandas metric layer -> committed JSON -> static browser case study
locked procurement CSV -|
                         -> DuckDB SQL models -------> independent pandas reconciliation
                         -> BigQuery GoogleSQL models -> independent pandas reconciliation
                         -> dbt-duckdb lineage/tests -> independent pandas reconciliation
```

The browser experience remains static and credential-free. DuckDB is the local analytical execution engine; BigQuery is a separately executed GoogleSQL validation target; dbt-duckdb adds transformation structure, lineage, documentation, and tests without changing the deployed site architecture.

## Analytical model set

The version-controlled model set answers six concrete analytical questions rather than maximizing technique count.

| Model | Grain | Purpose and validation focus |
| --- | --- | --- |
| `int_procurement_order_metrics` | PO_ID | Canonical derived values, eligibility flags, and date helpers; reconciled row-by-row. |
| `mart_supplier_category_benchmark` | Supplier × Item_Category | Weighted KPI baselines, category deltas, and partitioned ranks; reconciled against pandas aggregates. |
| `mart_supplier_monthly_trends` | Supplier × Order_Month | Full supplier-month spine, period comparisons, and correctly aggregated rolling rates; reconciled across all spine rows. |
| `mart_procurement_quality_exceptions` | PO_ID × exception | Missing/invalid observations and their metric treatment; reconciled exception-by-exception. |
| `mart_status_delivery_reconciliation` | PO_ID | Source status versus observed delivery evidence; reconciled classification-by-classification. |
| `mart_supplier_priority_scenarios` | Supplier × Decision_Scenario | Explicit weight configurations, normalization, scoring, and deterministic scenario order; reconciled with scenario-weight checks. |

The monthly mart preserves all supplier/month combinations across the source range, including inactive months. This prevents `LAG` and rolling windows from skipping gaps. Delivery and defect rates are recomputed from their rolling numerators and denominators; they are not averages of monthly percentages. Supplier-priority scores are decision-support scenarios, not universal vendor grades.

## DuckDB SQL validation

Authoritative local SQL lives under [`sql/procurement/`](../../sql/procurement/). Run the complete model chain and independent pandas reconciliation from the repository root:

```bash
python tools/procurement/run_sql_evidence.py
```

The runner rebuilds a disposable `.local/procurement.duckdb`, validates the locked source contract, executes models in dependency order, asserts model grain, and compares SQL output with separately calculated pandas expectations. The Python reference does not consume SQL output.

A fresh validated run produced:

- 777 order rows / 777 unique PO_IDs
- 25 supplier-category rows
- 125 supplier-month rows, including 3 zero-order spine months
- 571 quality-exception rows
- 777 status-delivery reconciliation rows
- 20 supplier-scenario rows

## BigQuery / GoogleSQL validation

The separately maintained GoogleSQL adaptations live under [`sql/procurement/bigquery/`](../../sql/procurement/bigquery/). They are not inferred to work because DuckDB works; they were executed independently in BigQuery and reconciled back to the same pandas reference.

Local authenticated execution:

```bash
python tools/procurement/run_bigquery_evidence.py
```

The August 19, 2026 validation run rebuilt all six models in `wistoworks-analytics.procurement_sql_evidence` in the `US` location and reconciled the same six output populations listed above with no mismatches. The runner loads the locked CSV with an explicit BigQuery schema so source typing is deterministic.

## dbt Core + dbt-duckdb

The compact dbt project lives under [`dbt/procurement/`](../../dbt/procurement/). It reads the committed CSV as an external source, stages stable types, materializes the validated order-level model and five marts, and uses `ref()` relationships to expose lineage.

```text
external CSV source
  -> stg_procurement_orders
  -> int_procurement_order_metrics
      -> mart_supplier_category_benchmark
      -> mart_supplier_monthly_trends
      -> mart_procurement_quality_exceptions
      -> mart_status_delivery_reconciliation
      -> mart_supplier_priority_scenarios
```

Run locally:

```powershell
python -m pip install -r dbt/procurement/requirements.txt
python tools/procurement/run_dbt_evidence.py
```

The runner executes `dbt debug`, `dbt compile`, `dbt run`, `dbt test`, and `dbt docs generate`, then reconciles the six materialized analytical relations back to the independent pandas reference. The validated August 19, 2026 run completed 7 model builds and all 35 data tests with zero warnings or errors before the six reconciliation checks passed.

Tests cover source/model uniqueness and nullability, accepted source/status/scenario domains, key relationships, the locked canonical source population, and composite model grains. Generated dbt artifacts and the local DuckDB database are disposable and ignored.

## Inspect the implementation

- [DuckDB analytical SQL](../../sql/procurement/)
- [BigQuery / GoogleSQL adaptations](../../sql/procurement/bigquery/)
- [dbt project](../../dbt/procurement/)
- [DuckDB reconciliation runner](../../tools/procurement/run_sql_evidence.py)
- [BigQuery reconciliation runner](../../tools/procurement/run_bigquery_evidence.py)
- [dbt validation runner](../../tools/procurement/run_dbt_evidence.py)
- [Data contract](./data-contract.md)
- [Metric dictionary](./metric-dictionary.md)

## Positioning boundary

This repository demonstrates recent applied portfolio work in advanced analytical SQL, BigQuery/GoogleSQL execution, and dbt-style transformation/testing. It does not represent production ownership of an enterprise procurement warehouse, and the dataset's real-world company origin is not independently verified.

The original Looker Studio work remains historical evidence. The maintained browser experience and analytical evidence package are calculated from the committed source and code in this repository.
