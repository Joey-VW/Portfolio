# PHX Transit Pulse normalized frontend data contract

**Version:** `0.3-draft`
**Basis:** Pass 13.0 static, Vehicle Positions, Trip Updates, Service Alerts,
cadence, validator evidence, and the synthetic geographic-map implementation.

This contract describes a future normalized boundary; it does not implement live
ingestion. IDs remain opaque strings. Timestamps normalize to RFC 3339 UTC while
retaining their source and meaning. `null` means no usable source value was
provided. Valid zero and negative values must survive presence checks and
normalization.

## Envelope and health

Every response contains `contractVersion`, `meta`, and `data`. `meta.generatedAt`
is the normalizer time and must not replace an upstream timestamp.

Each feed records independently:

- `feedTimestamp`, from `FeedHeader.timestamp`;
- `fetchedAt`, from the future relay clock;
- `oldestEntityTimestamp` and `newestEntityTimestamp`, when entities provide
  timestamps;
- `entityCount`, diagnostics, and a feed status.

Vehicle and Trip Update entity timestamps are retained on their entities. Feed
freshness and entity freshness are separate: a fresh header does not make an old
vehicle current. Missing timestamps remain unknown rather than inheriting a
fabricated source time.

The normalized state vocabulary is explicit:

| State | Meaning |
| --- | --- |
| `live` | Usable current source data under the documented freshness rules. |
| `stale` | Usable entity or feed data beyond its stale threshold. |
| `very_stale` | Vehicle data older than 300 seconds; never portray it as current movement. |
| `feed_error` | Fetch, HTTP, decode, or schema validation failed. |
| `replay` | Clearly labeled synthetic fixture or, only if later permitted, captured replay. |
| `offline` | The client cannot reach the future normalized service. |
| `no_data` | Request succeeded but yielded no eligible records; do not convert this to zero service. |

An error can expose last-known data only with its original timestamps and stale
state. Empty arrays require a matching state and explanation.

## Vehicle records

A vehicle may contain an ID, position, bearing, speed, vehicle timestamp, route,
trip, direction, stop, current status, and static enrichment. The observed feed
contains valid position-only records. A stable vehicle ID plus plausible
coordinates is sufficient to retain a vehicle even when route, trip, stop,
direction, or status enrichment is missing. Missing enrichment stays `null` or
`unknown`; it is not inferred from display text.

Duplicate `vehicle.id` values and implausible coordinates or speeds were observed
by formal validation. Consumers must flag them and keep source values available
for diagnostics, but must not silently repair them. The exact canonical-record
deduplication policy and the exact map/metric exclusion thresholds remain
decisions required before live implementation. Until then, duplicates and
implausible records are ineligible for aggregate claims rather than arbitrarily
corrected. Zero speed is valid and must not be treated as missing.

## Trip updates and predictions

Retain trip ID, route ID, service date, vehicle ID, entity timestamp,
`schedule_relationship`, and stop-time updates when present. Cancelled trips and
skipped stops are explicit source states, not missing data and not silently
removed. Arrival/departure epoch times and signed delay values preserve zero and
negative values.

One formal finding showed non-monotonic sequential stop prediction timestamps.
Do not reorder or rewrite source predictions as though corrected. Flag the
sequence, retain original stop sequence and time provenance, and exclude it from
calculations that require monotonicity until a documented policy is accepted.
Exact exclusion or repair behavior remains a decision required.

Static schedule enrichment may add route, trip, stop, scheduled time, headsign,
shape, and service information only after a successful ID and service-date join.
A failed or absent join produces `null` enrichment and a diagnostic, never an
invented assignment or scheduled value.

## Service alerts

Retain alert ID, localized header and description, optional localized URL, cause,
effect, all active periods, and all informed-entity selectors. The observed feeds
require support for multiple active periods and route, stop, direction, and trip
targeting. Open periods and missing URLs are valid.

Substantive alert comparison must ignore feed-header-only timestamp changes. It
compares normalized alert content and targeting while retaining the new header
timestamp for freshness. The exact stable alert-content hash and locale ordering
remain implementation decisions; comparison must not discard meaningful period,
text, cause, effect, URL, or selector changes.

## Defensive processing rules

1. Preserve raw source meaning and provenance; never fabricate corrected values.
2. Distinguish absent scalar fields from present zero or negative values.
3. Validate coordinates, speeds, IDs, enum values, timestamps, and joins, and
   report quality counts separately from service metrics.
4. Retain position-only vehicles while labeling missing context.
5. Preserve cancellation, skipped-stop, and multi-period alert states.
6. Never infer that a frozen-snapshot stale-header warning describes the original
   live response.
7. Treat uncertain cross-feed validator findings as unresolved until reproduced
   with a controlled paired-feed test.
8. Do not expose provider-derived replay data unless provider terms permit it.

Deduplication precedence, implausibility thresholds, prediction exclusion/repair,
locale selection, history retention, and cross-feed reconciliation require later
methodology decisions and tests.

## Synthetic geographic presentation contract

`data/phx-transit/synthetic/operations-replay.json` is a separate, browser-facing
demonstration fixture. It remains `providerData: false` and uses the geography
label `fictional-phoenix-area-overlay`. Its longitude and latitude values were
manually authored for this portfolio demonstration; they are not copied from
provider routes, stops, vehicles, alerts, or shapes.

The top-level `map` object defines the fictional network center, initial zoom,
approved bounds, zoom limits, bearing, and pitch. Each route retains its legacy
schematic `path` and adds a GeoJSON-compatible `LineString` `geometry`. Stops,
vehicles in every replay frame, and geographic alerts retain their legacy `x`
and `y` fields and add finite `longitude` and `latitude` values within the
approved bounds.

The interactive map and schematic fallback must consume the same route, stop,
vehicle, alert, filter, scenario, and selection IDs. Replay timestamps,
freshness, and application states retain their existing meaning. A real
Phoenix-area basemap provides context only; it does not make the fictional
operational overlay provider-derived or live.
