# Procurement data contract

| Field | Type | Nulls | Rule |
| --- | --- | --- | --- |
| `PO_ID` | string | No | Unique purchase-order identifier |
| `Supplier` | string | No | Supplier label |
| `Order_Date` | date | No | Parseable source order date |
| `Delivery_Date` | date | Yes | Missing dates are measured; dates before order date are quarantined from delivery metrics |
| `Item_Category` | string | No | Product category |
| `Order_Status` | enum | No | `Delivered`, `Partially Delivered`, `Pending`, or `Cancelled` |
| `Quantity` | integer | No | Greater than zero |
| `Unit_Price` | number | No | Greater than zero |
| `Negotiated_Price` | number | No | Greater than zero |
| `Defective_Units` | number | Yes | Between zero and quantity when present |
| `Compliance` | enum | No | `Yes` or `No` |

Derived fields are created in `tools/procurement/build_case_data.py`. The same metric layer supplies supplier, category, and monthly output.

## Quality behavior

Blocking structural or domain failures stop the build. Missing deliveries, missing defect counts, pending/cancelled orders, and impossible delivery sequences are audit signals recorded under `quality`. They are not silently removed from the dataset:

- a missing or impossible delivery is excluded only from lead-time and on-time denominators;
- a missing defect count is excluded only from the defect-rate denominator;
- every row remains in order, spend, savings, and compliance summaries when its required fields are valid.

## Weekly-period semantics

The legacy code used pandas `to_period("W-SAT").start_time`. `W-SAT` means the period ends on Saturday, so the derived start day is Sunday. The maintained code records that exact meaning and does not call it a Saturday week start.
