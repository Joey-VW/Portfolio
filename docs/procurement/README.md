# Procurement KPI Analysis

This case study rebuilds the legacy Procurement KPI project as a reproducible, static portfolio experience. The browser reads a committed JSON artifact; no Kaggle or Google Cloud credentials are needed to view it.

## Reproduce the artifact

From the repository root:

```bash
python tools/procurement/build_case_data.py
python tools/procurement/validate_case_data.py
```

The build reads `data/procurement-source.csv`, applies the contract and metric layer, and writes `data/procurement-kpi-analysis.json`. Any blocking contract violation stops the command with a nonzero exit. Measurable source exceptions, such as a missing delivery or an impossible date sequence, are counted and quarantined from the affected metric rather than silently discarded.

BigQuery remains an optional implementation target:

```bash
python tools/procurement/build_case_data.py \
  --gcp-project YOUR_PROJECT \
  --bigquery-table YOUR_DATASET.procurement_orders
```

The optional path imports `pandas-gbq` only when requested. Cloud settings are command-line configuration, not hard-coded values.

## Source and provenance

- Dataset: `shahriarkabir/procurement-kpi-analysis-dataset`
- Publisher: Shahriar Kabir on Kaggle
- Retrieved: July 28, 2026
- Downloaded file: `Procurement KPI Analysis Dataset.csv`
- Rows in the retrieved file: 777
- Date coverage: 2022–2023
- License claim: CC0 / Public Domain, as listed by the publisher
- Committed source SHA-256: recorded in the generated JSON

Kaggle's page description referred to 700 purchase orders when this project was reviewed, while the retrieved file contained 777. The maintained case study reports the actual retrieved file and does not independently verify that the records came from a real enterprise.

## Architecture

```text
Kaggle CSV
  -> contract and quality checks
  -> pandas metric layer
  -> supplier, category, and monthly summaries
  -> committed browser JSON
  -> static interactive case study

Optional: validated metric layer -> BigQuery
```

The original Looker Studio work remains historical evidence. The maintained browser experience is calculated from the code and source in this repository.
