# Procurement SQL evidence — BigQuery / GoogleSQL

This directory contains the BigQuery/GoogleSQL execution slice for the validated
Procurement KPI SQL evidence package.

The authoritative local analytical implementation remains the DuckDB SQL in the parent
`sql/procurement/` directory. These files are deliberate dialect adaptations so BigQuery
execution is proven separately rather than inferred from DuckDB compatibility.

## Dialect adaptations

The GoogleSQL versions preserve the same model grains, business rules, null treatment,
denominators, ranking semantics, date spine, rolling windows, exception handling, and
scenario logic. The main syntax differences are:

- `DATE_DIFF(end_date, start_date, DAY)` for lead-day calculations.
- `DATE_TRUNC(date, WEEK(SUNDAY))` for the established Sunday-start week helper.
- `GENERATE_DATE_ARRAY(...)` with `UNNEST(...)` for the complete month spine.
- `COUNTIF(...)` and `SUM(IF(...))` instead of DuckDB aggregate `FILTER` clauses.
- `UNNEST([STRUCT(...)])` for the small supplier-scenario weight relation.
- BigQuery-qualified table references rendered by the validation runner.

## Reproducible validation

Prerequisites:

1. Google Cloud CLI configured for the intended project.
2. Application Default Credentials available locally.
3. BigQuery API enabled.
4. Python BigQuery dependencies installed, for example:

```powershell
python -m pip install --upgrade google-cloud-bigquery
```

The default validation target is:

- Project: `wistoworks-analytics`
- Dataset: `procurement_sql_evidence`
- Location: `US`

Run from the repository root:

```powershell
python tools/procurement/run_bigquery_evidence.py
```

Each run:

1. validates the locked 777-row canonical source contract;
2. loads `data/procurement-source.csv` with an explicit BigQuery schema;
3. replaces the six GoogleSQL model tables in dependency order;
4. reads the results back from BigQuery; and
5. reconciles every model against the independently maintained pandas reference used by
   the DuckDB evidence harness.

The BigQuery dataset is execution/validation infrastructure. Generated cloud tables are
not committed; the durable evidence is the source snapshot, version-controlled SQL,
runner, and recorded reconciliation result.
