# Procurement dbt evidence

This is a deliberately small dbt Core + dbt-duckdb implementation of the already validated Procurement KPI analytical model. It demonstrates transformation structure, lineage, documentation, and meaningful tests without inventing warehouse infrastructure or new business logic.

The committed `data/procurement-source.csv` remains the canonical input. dbt-duckdb reads that CSV as an external source, stages stable data types, builds the validated order-level metric model, and materializes the five existing analytical marts.

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

The dbt layer intentionally mirrors the validated DuckDB business rules. It does not add new KPIs or marts.

## Run locally

From the repository root:

```powershell
python -m pip install -r dbt/procurement/requirements.txt
python tools/procurement/run_dbt_evidence.py
```

The runner uses the project-local `profiles.yml`, rebuilds the disposable `.local/procurement_dbt.duckdb`, runs `dbt debug`, `dbt compile`, `dbt run`, `dbt test`, and `dbt docs generate`, then independently reconciles the six analytical relations against the maintained pandas reference.

Generated dbt build artifacts and the local DuckDB database are disposable and ignored.
