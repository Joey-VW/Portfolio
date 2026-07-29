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
- **End to end:** Recognized records with a coherent opportunity creation, close, activation, and recognition sequence. Created-to-recognized durations are calculated record by record before median and percentile aggregation.

Incomplete records are not removed from the audit. They appear in exception counts and conversion loss, while timing statistics use only records with the two dates required for that interval.

The independent stage medians are never added and presented as an observed lifecycle median. The end-to-end median and percentiles come only from the coherent end-to-end cohort.

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

The browser control uses every valid close-to-activation interval in the activation cohort. For each integer target from 5 through 30 days, the maintained Python build precomputes:

- records and share above the target;
- total observed activation days above the target;
- the current activation median and p90; and
- the modeled activation p90 if only over-target intervals were capped at the target.

This threshold sensitivity does not alter source records, forecast revenue, or establish that an operational change would cause the modeled result. The generated browser artifact contains the scenario aggregates, so JavaScript only selects and displays a precomputed target.
