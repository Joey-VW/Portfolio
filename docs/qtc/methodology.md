# Quote-to-Cash methodology

## Funnel denominators

| Stage | Definition |
| --- | --- |
| Opportunities | Every unique generated CRM opportunity |
| Closed won | Opportunities with stage `Closed Won` |
| Activated | Closed-won opportunities with a unique, linked subscription and a valid activation on or after close |
| Recognized | Valid activated subscriptions with a unique, linked revenue record recognized on or after activation |

The displayed rate at each downstream stage uses the immediately prior eligible stage as its denominator.

## Timing cohorts

- **Days to close:** Closed-won opportunities with creation and valid close dates.
- **Days to activate:** Eligible closed-won opportunities with a valid linked subscription start.
- **Days to recognize:** Valid activated subscriptions with valid linked recognition.

Incomplete records are not removed from the audit. They appear in exception counts and conversion loss, while timing statistics use only records with the two dates required for that interval.

## Audit rules

The build detects:

- duplicate identifiers;
- broken opportunity and subscription foreign keys;
- subscriptions attached to non-won opportunities;
- missing activation;
- activation before close;
- recognition without valid activation;
- recognition before activation;
- suspended subscriptions;
- recognition backlog;
- slow close over 45 days;
- slow activation over 30 days;
- slow recognition over 35 days.

Thresholds are demonstration rules, not contractual service levels.

## Scenario

The browser control subtracts up to the selected number of days from the median activation interval, with a floor of zero. It does not forecast revenue or change the generated source. It illustrates how one operational improvement changes median end-to-end elapsed time while the other stages remain constant.
