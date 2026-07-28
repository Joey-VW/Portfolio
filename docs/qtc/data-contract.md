# Quote-to-Cash data contract

## CRM opportunities

| Field | Rule |
| --- | --- |
| `opportunity_id` | Unique CRM key |
| `created_date` | Required ISO date |
| `close_date` | Required for closed stages; blank for open |
| `stage` | `Closed Won`, `Closed Lost`, or `Open` |
| `segment` | `SMB`, `Mid-market`, or `Enterprise` |
| `plan` | Generated product/plan |
| `amount` | Positive fictional annual contract value |

## Billing subscriptions

| Field | Rule |
| --- | --- |
| `subscription_id` | Unique billing key |
| `opportunity_id` | Foreign key to a Closed Won opportunity |
| `start_date` | Activation date; may be blank to model a stall |
| `status` | `Active`, `Suspended`, or `Pending` |
| `billing_status` | `Current` or `Hold` |
| `plan` | Expected to align with the opportunity |
| `annual_value` | Fictional annual value |

## Revenue recognition

| Field | Rule |
| --- | --- |
| `revenue_id` | Unique revenue key |
| `subscription_id` | Foreign key to a subscription |
| `recognition_date` | Must be on or after valid activation |
| `recognized_amount` | Positive fictional recognized amount |
| `status` | `Recognized` in the current model |

The generator deliberately injects a small number of invalid records. The analytical build detects and reports those exceptions, then keeps them out of cohorts whose rules they violate.
