# PHX Transit Pulse normalized frontend data contract

**Version:** `0.1-draft`
**Basis:** GTFS Schedule and GTFS-Realtime specifications; Valley Metro field population is unverified as of 2026-07-24.

All timestamps are RFC 3339 UTC strings in normalized JSON. `null` means the source did not provide a usable value; an omitted optional property means it was not applicable or intentionally not exposed. IDs are opaque strings and must never be numerically coerced. A response must include `meta`; entities may be empty only with an explicit health/mode explanation.

## Envelope and feed metadata

| Field | Type | Class / source | Required | Missing and timestamp behavior | Normalization / example |
| --- | --- | --- | --- | --- | --- |
| `contractVersion` | string | Direct, relay | Yes | Reject unknown major version. | `0.1-draft` |
| `meta.generatedAt` | string | Derived, relay clock | Yes | Time relay finished normalization. | `2026-07-24T00:00:00Z` |
| `meta.mode` | enum | Derived | Yes | `live`, `replay`, `stale`, `offline`, `error`. | `error` |
| `meta.source` | object | Direct/relay provenance | Yes | Keep source URL only when approved for public display. | `{"agency":"Valley Metro"}` |
| `meta.feeds.<name>` | object | Direct + derived health | Yes | One object per requested feed; unavailable is explicit. | See `feed-health.json`. |
| `meta.feeds.<name>.feedTimestamp` | string/null | GTFS-RT `FeedHeader.timestamp` | No | `null` when absent/unreadable. Semantics: producer creation time. | `null` |
| `meta.feeds.<name>.fetchedAt` | string | Derived, relay clock | Yes | Time relay received upstream response. | `2026-07-24T00:00:00Z` |
| `meta.feeds.<name>.ageSeconds` | number/null | Derived | No | `generatedAt - feedTimestamp`; null if timestamp absent. | `null` |
| `meta.feeds.<name>.entityCount` | integer/null | Derived | No | Count decoded entities; null on failed decode. | `0` |
| `meta.feeds.<name>.status` | enum | Derived HTTP/decode state | Yes | `unverified`, `healthy`, `stale`, `error`, `unavailable`. | `unavailable` |

## Vehicles

| Field | Type | Class / source | Required | Missing and timestamp behavior | Normalization / example |
| --- | --- | --- | --- | --- | --- |
| `id` | string | Direct `vehicle.vehicle.id` or entity ID | Yes | Exclude entity if no stable ID after documented fallback. | `vehicle-opaque-id` |
| `tripId`, `routeId` | string/null | Direct `TripDescriptor` | No | Null when feed omits it; do not infer route from display text. | `null` |
| `latitude`, `longitude` | number | Direct `VehiclePosition.position` | Yes for map | Exclude from map when either missing/out of bounds. | `33.4484` |
| `bearing`, `speedMetersPerSecond` | number/null | Direct position fields | No | Null if absent; no zero substitution. | `null` |
| `occupancyStatus`, `currentStatus` | string/null | Direct GTFS-RT enums | No | Convert enum to stable lower-case token. | `null` |
| `observedAt` | string/null | Direct `VehiclePosition.timestamp` | No | Vehicle observation time; fall back to feed timestamp only in separate `effectiveObservedAt` with provenance. | `null` |
| `route` | object/null | Joined static/live | No | Null if `routeId` cannot join. | `{"shortName":"72","mode":"bus"}` |
| `isStale` | boolean | Derived | Yes | True only by validated future threshold; otherwise false with no SLA claim. | `false` |

## Routes, trips, stops, and alerts

| Entity / field | Type | Class / source | Required | Missing and timestamp behavior | Normalization / example |
| --- | --- | --- | --- | --- | --- |
| `routes[].id`, `shortName`, `longName`, `mode` | strings/null | Joined static `routes.txt` | `id` Yes | Keep source text; map `route_type` to documented mode token. | `72`, `bus` |
| `trips[].id`, `routeId`, `serviceId`, `headsign`, `shapeId` | strings/null | Joined static `trips.txt` | `id`, `routeId` Yes in lookup | No guessed service. `serviceId` uses calendar/calendar_dates evaluation. | `weekday-service` |
| `stops[].id`, `name`, `latitude`, `longitude` | strings/numbers | Joined static `stops.txt` | `id` Yes | Exclude malformed coordinates. | `stop-123` |
| `alerts[].id` | string | Direct GTFS-RT entity ID | Yes | Exclude if no entity ID. | `alert-opaque-id` |
| `alerts[].informedEntities` | array | Direct `Alert.informed_entity` | Yes | Empty means agency supplied no selector. | `[]` |
| `alerts[].header`, `description`, `url` | localized string/null | Direct GTFS-RT alert fields | No | Select documented preferred locale; preserve plain text. | `null` |
| `alerts[].activePeriod` | array | Direct GTFS-RT `active_period` | No | Start/end are source epoch times converted to UTC; open interval allowed. | `[]` |

## Delay observations and history

| Field | Type | Class / source | Required | Missing and timestamp behavior | Normalization / example |
| --- | --- | --- | --- | --- | --- |
| `delayObservations[].tripId`, `stopId` | string/null | Direct/joined `TripUpdate.stop_time_update` | No | Null IDs cannot join; retain only for feed diagnostics. | `null` |
| `scheduledTime` | string/null | Joined static `stop_times.txt` plus service date | No | Requires calendar resolution and timezone-safe conversion. | `null` |
| `predictedTime`, `delaySeconds` | string/number/null | Direct GTFS-RT time/delay | No | Do not derive delay from one without a validated schedule join. | `null` |
| `snapshotId`, `capturedAt` | string | Future history-dependent | Yes in retained store | Relay capture time, not vehicle time. | `snapshot-20260724...` |
| `rolling[]` | array | Future history-dependent | No | Only present when retention window and completeness are documented. | `[]` |

The relay must retain a source-field audit internally during development, but frontend output contains only approved fields. Static join failure produces `null` joined data plus a health counter, never a fabricated route, trip, stop, shape, or service assignment.
