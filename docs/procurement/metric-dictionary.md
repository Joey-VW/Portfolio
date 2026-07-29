# Procurement metric dictionary

| Metric | Formula | Denominator and missing-data behavior | Assumption |
| --- | --- | --- | --- |
| Negotiated spend | Sum of `Negotiated_Price * Quantity` | All valid rows | Prices represent comparable unit amounts |
| Negotiation savings | Sum of `(Unit_Price - Negotiated_Price) * Quantity` divided by gross value | All valid rows with positive gross value | Weighted by ordered quantity |
| Average lead days | Mean of `Delivery_Date - Order_Date` | Valid, non-impossible delivered rows | Calendar days |
| On-time delivery | Delivered rows at or below 10 lead days divided by valid delivered rows | Missing/impossible delivery dates excluded | 10 days is a case-study target, not a contractual SLA |
| Defect rate | Sum of defective units divided by sum of quantity | Rows with a reported defect count | Missing defect counts are unknown, not zero |
| Compliance rate | Rows with `Compliance = Yes` divided by all rows | All valid rows | Source value is treated as a record-level flag |
| Missing delivery rate | Missing delivery dates divided by all rows | All valid rows | A missing date is an audit signal |
| Supplier priority score | Weighted sum of min-max-normalized savings, on-time rate, inverse defect rate, and compliance rate | Suppliers with all four required KPIs available; an incomplete supplier receives `insufficient-data` and no comparable score | A comparison aid, not a universal vendor recommendation |

## Priority presets

| Preset | Savings | Reliability | Quality | Compliance |
| --- | ---: | ---: | ---: | ---: |
| Balanced | 25% | 25% | 25% | 25% |
| Cost first | 55% | 15% | 15% | 15% |
| Reliability first | 15% | 55% | 15% | 15% |
| Quality + compliance | 15% | 15% | 40% | 30% |

Scores are recalculated from complete suppliers present in the committed artifact. Missing data is never imputed as zero or rewarded through normalization. A supplier missing savings, on-time delivery, defect rate, or compliance is labeled as insufficient data and excluded from comparative ranking. Scores describe tradeoffs within this dataset only.
