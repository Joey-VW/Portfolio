# PHX Transit Pulse metric dictionary

**Evidence boundary:** Pass 13.0 verified technical feed usability, joins,
daytime cadence, and initial formal validation. These are PHX Transit definitions,
not official Valley Metro KPIs or production approval.

## Classification and freshness rules

Every metric uses exactly one classification:

- **Directly supported:** available from a verified realtime feed without static
  enrichment.
- **Supported after static enrichment:** available only after verified static ID
  joins.
- **Provisional methodology:** inputs exist, but aggregation or eligibility rules
  still need targeted validation.
- **Deferred pending retained observations:** requires history not approved or
  collected for repository use.
- **Unavailable or unsupported:** evidence cannot support the claim.

Evidence supports these current freshness definitions:

- active vehicle: vehicle timestamp age is no more than 90 seconds;
- stale vehicle: vehicle timestamp age is greater than 90 seconds;
- very stale vehicle: vehicle timestamp age is greater than 300 seconds;
- healthy realtime feed: feed-header age is no more than 30 seconds;
- degraded realtime feed: feed-header age is greater than 60 seconds.

The 30-to-60-second feed interval is neither healthy nor degraded; label it
intermediate/stale without inventing an SLA. Missing or invalid timestamps are
unknown. Feed-header age never substitutes for vehicle age.

## Metrics

| Metric | Classification | Grain and method | Limits |
| --- | --- | --- | --- |
| Feed freshness and health | Directly supported | Per feed, compare relay observation time with `FeedHeader.timestamp`; expose age and status. | Clock skew, absent timestamps, and frozen snapshots must remain explicit. |
| Active vehicles | Directly supported | Per Vehicle Positions snapshot, count eligible unique IDs with plausible coordinates and vehicle age at most 90 seconds. | Duplicate-ID precedence and implausibility thresholds still require a decision; report excluded/unknown counts. |
| Stale and very stale vehicles | Directly supported | Classify each timestamped vehicle at greater than 90 seconds and greater than 300 seconds respectively. | Missing timestamp is unknown, not fresh. |
| Active service alerts | Directly supported | Count alerts whose source active periods include the evaluation time; preserve alerts with open/multiple periods and all targeting. | Missing URL is valid; define unbounded-period handling before implementation. |
| Cancelled trips and skipped stops | Directly supported | Count explicit Trip Update schedule relationships at snapshot grain. | These are feed states, not proof of realized service outcomes. |
| Vehicles by mode or route | Supported after static enrichment | Join Vehicle Position route ID to static route metadata, grouping missing joins as unknown. | Position-only vehicles remain visible but unclassified. |
| Route/trip/stop detail | Supported after static enrichment | Join verified opaque IDs to static route, trip, stop, service, and schedule records. | Never infer missing IDs or force failed joins. |
| Route-level predicted delay | Provisional methodology | For each eligible active trip, select one representative upcoming scheduled stop prediction, calculate signed delay against the correctly joined schedule, then aggregate those trip-level observations by route. | Representative-stop selection, cancellation/skipped-stop eligibility, duplicate handling, coverage minimums, and aggregate statistic require targeted tests. Early/on-time/late thresholds are not accepted and remain unset. |
| Early/on-time/late categories | Unavailable or unsupported | No metric is published until tolerance thresholds and predictive-versus-observed semantics are accepted. | GTFS-Realtime predictions do not prove actual arrival performance. |
| On-time performance | Unavailable or unsupported | No production-quality percentage is supported by current snapshot evidence. | Requires accepted thresholds, retained complete observations, schedule joins, and realized-event methodology. |
| Actual versus scheduled headway | Deferred pending retained observations | Requires ordered route/direction/stop observations and matched schedules over time. | GPS proximity is not automatically a stop passage; branches, short turns, and calendars matter. |
| Vehicle bunching | Deferred pending retained observations | Requires validated headway series and an accepted threshold. | No threshold is established. |
| Service gaps | Deferred pending retained observations | Requires validated headway series, completeness evidence, and an accepted threshold. | Cancellations, detours, and missing observations can mimic gaps. |
| Route reliability and rankings | Deferred pending retained observations | Requires validated delay/headway coverage over comparable service windows. | Do not rank routes from unequal or incomplete snapshots. |
| Historical and rolling trends | Deferred pending retained observations | Requires authorized retention and documented window completeness. | Never interpolate missing history into a claimed live trend. |

Synthetic Pass 13.1 fixtures may exercise display states and formulas but cannot
upgrade a metric's evidence classification or support provider-performance claims.
