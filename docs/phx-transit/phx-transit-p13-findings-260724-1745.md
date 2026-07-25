# PHX Transit Pulse — Pass 13.0 Verification Findings

**Status:** Working verification record — technical feed, initial daytime cadence, and formal validation complete; provider terms response pending  
**Coverage:** Findings established through July 24, 2026 at approximately 5:45 PM Arizona time  
**Project:** PHX Transit Pulse — Independent GTFS-Realtime Operations Lab

## 1. Purpose

This document consolidates the hands-on verification completed for the Valley Metro static GTFS package, Vehicle Positions GTFS-Realtime feed, Trip Updates GTFS-Realtime feed, and Service Alerts GTFS-Realtime feed.

It separates:

- facts directly observed during testing;
- conclusions supported by those observations;
- implementation implications for PHX Transit Pulse;
- questions that remain unresolved.

This is not yet a complete licensing or production-readiness approval. Data-use terms, replay-fixture permission, authorized polling expectations, metric-methodology finalization, and longer-duration feed behavior still require verification or provider confirmation.

---

## 2. Executive summary

The static City of Phoenix GTFS package was successfully downloaded and extracted without an observed login or API key requirement. It contains the major files needed to describe agencies, routes, trips, stops, stop times, service dates, route geometry, frequencies, directions, transfers, and related areas.

The Valley Metro Vehicle Positions endpoint was also successfully accessed using a URL containing an `apiKey` query parameter. It returned a non-empty GTFS-Realtime Protocol Buffer payload with HTTP 200.

One decoded Vehicle Positions snapshot contained 458 vehicle entities. Every entity had a vehicle ID, position, bearing, and vehicle timestamp. Route and trip identifiers were present for 281 entities, or approximately 61.4% of the snapshot. When identifiers were present, all observed route, trip, and stop IDs matched the downloaded static GTFS package.

The Valley Metro Trip Updates endpoint was then successfully accessed using the same observed key pattern. It also returned HTTP 200 with `application/x-protobuf`. One decoded snapshot contained 309 trip updates and 5,786 stop-time updates. Every trip update had trip ID, route ID, service date, vehicle ID, update timestamp, and a scheduled trip relationship. Every stop-time update had stop ID, stop sequence, predicted arrival time, predicted departure time, and a scheduled stop relationship. All 60 observed route IDs, 309 trip IDs, and 4,917 unique stop IDs matched the downloaded static GTFS package.

The Valley Metro Service Alerts endpoint was also successfully accessed using the same observed key pattern. It returned HTTP 200 with `application/x-protobuf`. One decoded snapshot contained 15 alerts, 18 active periods, and 126 informed-entity selectors. Every alert had active-period data, cause, effect, header text, description text, and at least one informed entity. All 38 unique route IDs and 84 unique stop IDs referenced by the alerts matched the downloaded static GTFS package.

Two restrained daytime cadence tests were then completed. The Vehicle Positions run made 20 requests at 30-second intervals. A combined run made 20 Trip Updates requests at 30-second intervals and 10 Service Alerts requests at 60-second intervals. All 50 requests succeeded without errors. Every subsequent Vehicle Positions and Trip Updates sample returned a changed payload and newer feed-header timestamp. Service Alerts refreshed its header every minute and experienced one substantive content change during the combined run.

The cadence tests also exposed important edge cases that were absent from the earlier single snapshots: a cancelled trip was present in every Trip Updates sample, skipped stops ranged from 69 to 90 per sample, and a new alert introduced trip-specific targeting plus a `REDUCED_SERVICE` effect.

Formal validation was subsequently completed. The unmodified static ZIP was checked with MobilityData Canonical GTFS Schedule Validator version 8.0.1 and returned **0 errors, 51 warnings, and 65 informational notices**. The warnings were nonblocking quality recommendations. Six publisher-specific columns and one additional file, `directions.txt`, were reported as informational nonstandard extensions.

The three saved GTFS-Realtime snapshots were then checked with a locally built MobilityData GTFS-Realtime Validator under Java 17. The validator's bundled static parser could not consume the current `areas.txt` extension because it incorrectly expected a required `wkt` field, so a validator-only compatibility ZIP was created that omitted `areas.txt`, `stop_areas.txt`, and `directions.txt`. The original provider ZIP was not modified.

The realtime validator surfaced these snapshot-level findings:

- Vehicle Positions: one position outside the agency coverage buffer, one duplicate `vehicle.id`, one unrealistic speed, one missing `schedule_relationship`, and the expected stale-header warning from using a saved snapshot.
- Trip Updates: one non-increasing sequential `stop_time_update` timestamp finding, plus cross-feed identifier findings that require cautious interpretation because the same checks also appeared during an alerts-only run.
- Service Alerts: no alert-specific content errors; only the same cross-feed identifier checks and the expected stale-header warning.

A terms and usage inquiry was sent to Valley Metro customer service with the City of Phoenix Public Transit contact copied. It asks about registration, key policy, public noncommercial use, server-side relaying, polling frequency, caching, retention, replay fixtures, identifier handling, attribution, and static GTFS terms. A response is still pending.

This establishes that:

1. The static and all three GTFS-Realtime feed types were operational during testing.
2. The static package can enrich all three realtime feeds when identifiers are present.
3. PHX Transit Pulse can honestly support vehicle mapping, freshness monitoring, predicted arrivals and departures, route/trip/stop enrichment, and service-alert displays.
4. Initial daytime testing supports 30-second technical polling for Vehicle Positions and Trip Updates and 60-second technical polling for Service Alerts, subject to provider terms.
5. A 90-second active-vehicle threshold is supported by the observed vehicle-timestamp distribution.
6. Cancellations, skipped stops, stale vehicles, optional alert URLs, multiple alert periods, and trip-specific alerts must be first-class states.
7. The static package passes canonical validation with zero specification errors.
8. The realtime snapshots parse successfully, but several feed-quality and validator-context findings should be documented and selectively reproduced before production use.
9. The current evidence does not yet justify publishing the API key, committing replay snapshots, claiming an authorized production polling cadence, or shipping live production ingestion.

---

## 3. Sources and observed endpoints

### 3.1 Valley Metro developer page

The Valley Metro developer-resources page was reviewed manually. During this review, it did not clearly expose or enumerate the exact desired resources:

- static GTFS;
- Vehicle Positions;
- Trip Updates;
- Service Alerts.

It should therefore be treated as a broad directional source, not as sufficient evidence of the exact endpoint inventory.

### 3.2 Static GTFS resource page

Observed resource page:

```text
https://phoenixopendata.com/dataset/valley-metro-bus-schedule/resource/28ccc0a5-49c8-495c-b91f-193de5ce2cb7
```

### 3.3 Static GTFS direct download

Observed working download:

```text
https://www.phoenixopendata.com/dataset/3eae9a4a-98b9-40c8-8df7-8c00c1756235/resource/28ccc0a5-49c8-495c-b91f-193de5ce2cb7/download/googletransit.zip
```

The ZIP downloaded successfully without an observed login, registration flow, or API-key prompt.

### 3.4 Vehicle Positions endpoint

Observed working endpoint pattern:

```text
https://app.mecatran.com/utw/ws/gtfsfeed/vehicles/valleymetro?apiKey=<REDACTED>
```

The actual key is intentionally omitted from this document.

The endpoint required the key to remain in the request URL during testing. A request without the key was not separately tested.

### 3.5 Trip Updates endpoint

Observed working endpoint pattern:

```text
https://app.mecatran.com/utw/ws/gtfsfeed/realtime/valleymetro?apiKey=<REDACTED>
```

The same locally stored key value used for the Vehicle Positions test was used for this endpoint. The actual key is intentionally omitted from this document.

The endpoint returned a non-empty protobuf response. A request without the key was not separately tested.

### 3.6 Service Alerts endpoint

Observed working endpoint pattern:

```text
https://app.mecatran.com/utw/ws/gtfsfeed/alerts/valleymetro?apiKey=<REDACTED>
```

The same locally stored key value used for the other realtime-feed tests was used for this endpoint. The actual key is intentionally omitted from this document.

The endpoint returned a non-empty protobuf response. A request without the key was not separately tested.

---

## 4. Static GTFS findings

### 4.1 Feed metadata

The extracted `feed_info.txt` reported:

| Field | Observed value |
|---|---|
| Publisher | City of Phoenix |
| Publisher URL | `https://www.phoenix.gov/publictransit` |
| Language | `en` |
| Feed start date | June 29, 2026 |
| Feed end date | October 25, 2026 |
| Feed version | `GTFS_v4.5_20260616` |
| Contact email | `pubtrans@phoenix.gov` |
| Contact page | `https://www.phoenix.gov/publictransit/contactus` |

### 4.2 Agencies

The package identified two agencies:

1. Valley Metro
2. Phoenix Sky Harbor International Airport

This means the package is broader than a minimal bus-only stop list, even though the Open Data resource is labeled “Valley Metro Bus Schedule.”

### 4.3 Extracted files

The complete extracted directory included:

| File | Observed size |
|---|---:|
| `agency.txt` | 310 bytes |
| `areas.txt` | 26,015 bytes |
| `calendar_dates.txt` | 114,264 bytes |
| `directions.txt` | 2,964 bytes |
| `feed_info.txt` | 293 bytes |
| `frequencies.txt` | 170 bytes |
| `routes.txt` | 6,149 bytes |
| `shapes.txt` | 9,626,250 bytes |
| `stop_areas.txt` | 21,906 bytes |
| `stop_times.txt` | 77,914,903 bytes |
| `stops.txt` | 894,841 bytes |
| `transfers.txt` | 129 bytes |
| `trips.txt` | 3,018,150 bytes |

A generated `repo_pack.txt` was also present, but it is not part of the GTFS source.

The earlier repository pack omitted the largest files during packing, but direct directory inspection confirmed that `shapes.txt`, `stop_times.txt`, and `trips.txt` were present.

### 4.4 Approximate record inventory from the uploaded pack

The inspected package showed:

- 112 route records plus the header in `routes.txt`;
- 8,027 stop records plus the header in `stops.txt`;
- extensive date-specific service rows in `calendar_dates.txt`;
- route directions, areas, stop areas, transfers, and frequency-defined service.

No `calendar.txt` file was observed. This was not treated as a blocking finding because the package contains extensive explicit service-date data in `calendar_dates.txt`. The unmodified ZIP later completed canonical GTFS Schedule validation with zero specification errors.

### 4.5 Confirmed static join structure

The necessary static relationship chain is present:

```text
routes.txt
   │ route_id
   ▼
trips.txt
   ├── trip_id
   ├── service_id
   └── shape_id
       │
       ├──────────────► shapes.txt
       │
       ├──────────────► calendar_dates.txt
       │
       ▼
stop_times.txt
   │ stop_id
   ▼
stops.txt
```

This supports:

- human-readable route metadata;
- route colors and types;
- trip-to-route relationships;
- scheduled stop sequences and times;
- stop coordinates and names;
- route geometry;
- service-date filtering;
- later enrichment of GTFS-Realtime identifiers.

### 4.6 Canonical static validation

The original unmodified `googletransit.zip` was validated with MobilityData Canonical GTFS Schedule Validator version `8.0.1`.

| Result | Count |
|---|---:|
| Errors | 0 |
| Warnings | 51 |
| Informational notices | 65 |
| Total notices | 116 |

Warning types:

| Notice code | Severity | Count |
|---|---|---:|
| `mixed_case_recommended_field` | Warning | 2 |
| `route_long_name_contains_short_name` | Warning | 2 |
| `same_name_and_description_for_stop` | Warning | 47 |

Informational notice types:

| Notice code | Severity | Count |
|---|---|---:|
| `platform_without_parent_station` | Info | 2 |
| `trip_headsign_matches_intermediate_stop` | Info | 56 |
| `unknown_column` | Info | 6 |
| `unknown_file` | Info | 1 |

The six nonstandard columns were:

- `stop_times.txt`: `early_allowed`;
- `stops.txt`: `jurisdiction`, `equipment`;
- `trips.txt`: `short_trip_no`;
- `routes.txt`: `route_division`, `alt_route_type`.

The additional nonstandard file was:

- `directions.txt`.

These were reported as informational publisher extensions, not specification errors. The provider source should remain unmodified. PHX Transit Pulse should not depend on these extension fields unless their semantics are separately documented.

The canonical static report was preserved locally as:

```text
data/phx-transit/verification/static-validator/gtfs-schedule-260724-1631.html
```

with its companion asset directory.

### 4.7 Updated static-feed conclusion

**Confirmed:** The observed City of Phoenix ZIP is a substantial, usable static GTFS package with the principal files required for PHX Transit Pulse.

**Formal validation:** The unmodified ZIP completed MobilityData Canonical GTFS Schedule Validator version 8.0.1 with zero specification errors.

**Observed access behavior:** No login, registration, or API key was required for the successful static ZIP download.

**Not yet confirmed:** Official license label, attribution wording, caching rules, redistribution rights, update policy, or permission to commit derived or representative snapshots.

---


## 5. Vehicle Positions HTTP verification

### 5.1 Successful download

The feed was downloaded as:

```text
vehicle-positions.pb
```

The first saved snapshot was:

| Property | Observed value |
|---|---|
| File size | 42,471 bytes |
| Local save time | July 23, 2026 at 10:23:53 PM Arizona time |

### 5.2 Separate response-metadata request

A subsequent request returned:

| Property | Observed value |
|---|---|
| HTTP status | `200` |
| Content type | `application/x-protobuf` |
| HTTP Date | July 24, 2026 at 05:24:28 UTC |
| Arizona equivalent | July 23, 2026 at 10:24:28 PM |
| Raw content length | 42,142 bytes |
| ETag | Present |
| Cache-Control | No value observed |

The saved file and metadata request had slightly different sizes because they were separate live requests made at different moments.

### 5.3 Access conclusion

**Confirmed:** The observed Vehicle Positions endpoint was reachable and returned a non-empty protobuf payload when the supplied query-string key was included.

**Observed:** No additional login or registration step occurred during the test.

**Not established:** Whether the key is intended to be public, shared, private, revocable, rate-limited, or safe to expose in browser code.

---

## 6. Decoded Vehicle Positions snapshot

### 6.1 Feed header

The decoded snapshot reported:

| Field | Observed value |
|---|---|
| GTFS-Realtime version | `2.0` |
| Incrementality numeric value | `0` |
| Header timestamp | `1784870615` |
| Header timestamp UTC | July 24, 2026 at 05:23:35 |
| Header timestamp Arizona | July 23, 2026 at 10:23:35 PM |
| Entity count | 458 |

The HTTP response was observed approximately 53 seconds after the feed-header timestamp.

The script printed incrementality as numeric value `0`; the semantic enum label was not separately printed in this verification.

### 6.2 Field coverage

| Field | Entities populated | Coverage |
|---|---:|---:|
| Position | 458 | 100.0% |
| Bearing | 458 | 100.0% |
| Vehicle ID | 458 | 100.0% |
| Vehicle timestamp | 458 | 100.0% |
| Speed | 445 | 97.2% |
| Route ID | 281 | 61.4% |
| Trip ID | 281 | 61.4% |
| Stop ID | 270 | 59.0% |
| Current status | 257 | 56.1% |

Unique identifiers observed:

- 62 unique route IDs;
- 280 unique trip IDs;
- 265 unique stop IDs among records used in the join test.

The difference between 270 populated stop fields and 265 unique stop IDs reflects repeated stop identifiers across multiple entities.

### 6.3 Record-shape variation

The sample demonstrated at least two meaningful record shapes.

#### Fully contextualized vehicle

One entity included:

- entity ID;
- trip ID;
- route ID;
- direction ID;
- latitude and longitude;
- bearing;
- odometer;
- speed;
- current stop sequence;
- current status;
- vehicle timestamp;
- stop ID;
- vehicle ID;
- vehicle label.

#### Position-only or minimally contextualized vehicle

Other sample entities included:

- entity ID;
- latitude and longitude;
- bearing;
- odometer;
- speed;
- vehicle timestamp;
- vehicle ID;

but did not include trip, route, stop, direction, or status information.

The reason those records lacked assignment context was not determined.

### 6.4 Timestamp variation

The samples showed vehicle timestamps with different ages relative to the feed header:

- one sample was 8 seconds behind the header;
- another was 7 seconds behind the header;
- another was 7 minutes and 43 seconds behind the header.

This proves that feed-level freshness and per-vehicle freshness are not interchangeable.

### 6.5 Value-handling conclusions

Implementation should not:

- treat `0` speed as missing;
- assume every entity has route or trip context;
- assume every entity has a stop or current status;
- assume a present odometer is meaningful merely because the field exists;
- hide position-only vehicles solely because enrichment is unavailable;
- use only the feed-header timestamp to classify every vehicle as fresh.

Implementation should:

- retain the vehicle on the map when position and vehicle ID are available;
- represent missing route/trip context explicitly;
- compute per-vehicle age from `vehicle.timestamp`;
- preserve valid zero values;
- treat questionable zero or placeholder odometer values cautiously;
- distinguish missing, stale, and populated fields.

---

## 7. Static-to-realtime identifier joins

A local comparison was performed between the decoded Vehicle Positions identifiers and:

- `routes.txt`;
- `trips.txt`;
- `stops.txt`.

Results:

| Identifier type | Matched | Observed | Match rate |
|---|---:|---:|---:|
| Route IDs | 62 | 62 | 100% |
| Trip IDs | 280 | 280 | 100% |
| Stop IDs | 265 | 265 | 100% |

Unmatched lists were empty for all three identifier types.

### 7.1 Correct interpretation

The join result means:

> Every unique route, trip, and stop identifier present in this one Vehicle Positions snapshot existed in the downloaded static GTFS package.

It does **not** mean:

- every vehicle carried route, trip, and stop identifiers;
- future feed versions will always join perfectly;
- all service periods or operating conditions have been tested;
- cross-day identifier stability is guaranteed.

### 7.2 Important combined conclusion

There are two different coverage questions:

1. **Identifier availability across vehicles:** partial  
   Route and trip IDs were available for 281 of 458 entities, approximately 61.4%.

2. **Join success when identifiers were present:** complete in this snapshot  
   All observed unique route, trip, and stop IDs matched the static feed.

Both facts must remain visible in documentation and analytics.

---

## 8. Trip Updates HTTP verification

### 8.1 Successful download

The feed was downloaded as:

```text
trip-updates.pb
```

The first saved snapshot was:

| Property | Observed value |
|---|---|
| File size | 238,922 bytes |
| Local save time | July 23, 2026 at 10:43:19 PM Arizona time |

### 8.2 Separate response-metadata request

A subsequent request returned:

| Property | Observed value |
|---|---|
| HTTP status | `200` |
| Content type | `application/x-protobuf` |
| HTTP Date | July 24, 2026 at 05:45:00 UTC |
| Arizona equivalent | July 23, 2026 at 10:45:00 PM |
| Raw content length | 235,807 bytes |
| ETag | Present |
| Cache-Control | No value observed |

The saved file and metadata request had different sizes because they were separate live requests made at different moments.

### 8.3 Access conclusion

**Confirmed:** The observed Trip Updates endpoint was reachable and returned a non-empty protobuf payload when the locally stored query-string key was included.

**Observed:** No additional login or registration step occurred during the test.

**Not established:** Whether the key is intended to be public, shared, private, revocable, rate-limited, or safe to expose in browser code.

---

## 9. Decoded Trip Updates snapshot

### 9.1 Feed header

The decoded snapshot reported:

| Field | Observed value |
|---|---|
| GTFS-Realtime version | `2.0` |
| Incrementality numeric value | `0` |
| Header timestamp | `1784871792` |
| Header timestamp UTC | July 24, 2026 at 05:43:12 |
| Header timestamp Arizona | July 23, 2026 at 10:43:12 PM |
| Trip-update entity count | 309 |

The script printed incrementality as numeric value `0`; the semantic enum label was not separately printed in this verification.

### 9.2 Trip-update field coverage

| Field | Entities populated | Coverage |
|---|---:|---:|
| Trip update | 309 | 100.0% |
| Trip ID | 309 | 100.0% |
| Route ID | 309 | 100.0% |
| Start date | 309 | 100.0% |
| Vehicle ID | 309 | 100.0% |
| Trip-update timestamp | 309 | 100.0% |
| Trip schedule relationship | 309 | 100.0% |

Unique trip-level identifiers observed:

- 60 unique route IDs;
- 309 unique trip IDs.

Every observed trip schedule relationship had numeric value `0`, displayed in decoded samples as `SCHEDULED`.

No cancelled, added, duplicated, or other trip schedule relationships appeared in this snapshot.

### 9.3 Stop-time update coverage

The 309 trip updates contained 5,786 stop-time updates.

| Field | Stop updates populated | Coverage |
|---|---:|---:|
| Stop ID | 5,786 | 100.0% |
| Stop sequence | 5,786 | 100.0% |
| Predicted arrival time | 5,786 | 100.0% |
| Predicted departure time | 5,786 | 100.0% |
| Stop schedule relationship | 5,786 | 100.0% |
| Nonzero arrival delay | 5,430 | 93.8% |
| Nonzero departure delay | 5,402 | 93.4% |

The snapshot contained 4,917 unique stop IDs.

Every observed stop schedule relationship had numeric value `0`, displayed in decoded samples as `SCHEDULED`.

The nonzero-delay counts do not distinguish between an explicitly populated zero and an omitted delay field. A refined inspection is still needed if that distinction matters.

### 9.4 Delay behavior

The decoded samples demonstrated:

- positive delays representing late predictions;
- negative delays representing early predictions;
- zero delay values;
- stop-by-stop variation within the same trip;
- predicted arrival and departure timestamps for each displayed stop update.

Example patterns included:

- a trip approximately three to four minutes late across many future stops;
- a trip ranging from seconds to roughly one minute late;
- a trip containing early predictions such as `-21` seconds.

In the displayed samples, arrival and departure times were identical at each stop. The full snapshot was not separately tested for differing arrival and departure times, so dwell-time modeling remains unverified.

### 9.5 Analytical implications

The feed appears technically capable of supporting:

- predicted arrival and departure displays;
- upcoming-stop timelines;
- trip-level delay inspection;
- route-level delay summaries;
- early/on-time/late classifications;
- stop-by-stop delay profiles;
- vehicle-to-trip context.

A simple average across all 5,786 future stop predictions would overweight trips with many remaining stops. A more defensible initial route-level method is:

> Select one representative upcoming stop prediction per active trip, then aggregate those trip-level delays by route.

That methodology is a proposed PHX Transit Pulse analytical rule, not an official Valley Metro KPI definition.

Implementation must preserve:

- negative delay values;
- valid zero delay values;
- missing versus zero distinctions where the protobuf supports them;
- trip and stop schedule relationships;
- service date and direction context.

---

## 10. Trip Updates static-identifier joins

A local comparison was performed between decoded Trip Updates identifiers and:

- `routes.txt`;
- `trips.txt`;
- `stops.txt`.

Results:

| Identifier type | Matched | Observed | Match rate |
|---|---:|---:|---:|
| Route IDs | 60 | 60 | 100% |
| Trip IDs | 309 | 309 | 100% |
| Stop IDs | 4,917 | 4,917 | 100% |

Unmatched lists were empty for all three identifier types.

### 10.1 Correct interpretation

The join result means:

> Every unique route, trip, and stop identifier present in this one Trip Updates snapshot existed in the downloaded static GTFS package.

It does **not** establish:

- that all future snapshots will always join perfectly;
- that cancellation or added-trip identifiers will follow the same pattern;
- that all service periods or operating conditions have been tested;
- that cross-version identifier stability is guaranteed.

### 10.2 Combined realtime conclusion

For this verification window:

- Vehicle Positions had partial route/trip identifier availability across vehicles but complete joins when identifiers were present.
- Trip Updates had complete route/trip identifier availability across its 309 entities and complete route/trip/stop joins.
- Both realtime feeds aligned with the same downloaded static GTFS package.

---

## 11. Service Alerts HTTP verification

### 11.1 Successful download

The feed was downloaded as:

```text
service-alerts.pb
```

| Property | Observed value |
|---|---|
| File size | 12,311 bytes |
| Local save time | July 24, 2026 at 10:08:49 AM Arizona time |

### 11.2 Separate response-metadata request

| Property | Observed value |
|---|---|
| HTTP status | `200` |
| Content type | `application/x-protobuf` |
| HTTP Date | July 24, 2026 at 17:10:23 UTC |
| Arizona equivalent | July 24, 2026 at 10:10:23 AM |
| Raw content length | 12,311 bytes |
| ETag | No value observed |
| Cache-Control | No value observed |

### 11.3 Access conclusion

**Confirmed:** The observed Service Alerts endpoint was reachable and returned a non-empty protobuf payload when the locally stored query-string key was included.

**Observed:** No additional login or registration step occurred during the test.

**Not established:** Whether the key is intended to be public, shared, private, revocable, rate-limited, or safe to expose in browser code.

---

## 12. Decoded Service Alerts snapshot

### 12.1 Feed header

| Field | Observed value |
|---|---|
| GTFS-Realtime version | `2.0` |
| Incrementality numeric value | `0` |
| Header timestamp | `1784912929` |
| Header timestamp UTC | July 24, 2026 at 17:08:49 |
| Header timestamp Arizona | July 24, 2026 at 10:08:49 AM |
| Alert entity count | 15 |

### 12.2 Field coverage

| Field | Alerts populated | Coverage |
|---|---:|---:|
| At least one active period | 15 | 100.0% |
| Cause | 15 | 100.0% |
| Effect | 15 | 100.0% |
| Header text | 15 | 100.0% |
| Description text | 15 | 100.0% |
| At least one informed entity | 15 | 100.0% |
| URL | 10 | 66.7% |

Additional observations:

- 18 active periods across 15 alerts;
- 126 informed-entity selectors;
- 124 populated route-ID fields across selectors;
- 90 populated stop-ID fields across selectors;
- 38 unique route IDs;
- 84 unique stop IDs;
- no agency IDs observed;
- no trip IDs observed;
- 40 English translations counted across URL, header, and description fields.

Selector-field counts overlap because a single informed entity can contain both a route ID and a stop ID.

### 12.3 Cause, effect, targeting, and severity observations

Observed cause-value distribution:

| Numeric value | Count |
|---|---:|
| `2` | 4 |
| `9` | 1 |
| `10` | 8 |
| `11` | 2 |

Observed effect-value distribution:

| Numeric value | Count |
|---|---:|
| `1` | 9 |
| `4` | 2 |
| `7` | 4 |

Decoded samples included semantic labels such as:

- `CONSTRUCTION`;
- `NO_SERVICE`;
- `OTHER_EFFECT`;
- severity level `WARNING`.

The semantic labels for every numeric cause and effect value were not separately printed, so this record preserves their observed numeric distribution rather than assigning unverified labels.

The samples demonstrated:

- route-and-stop-targeted detours;
- stop-only construction notices;
- direction-specific selectors;
- multiple affected stops in one alert;
- multiple separate active periods in one alert;
- detailed detour instructions and stop closures;
- external Valley Metro links where supplied;
- long-running construction windows.

### 12.4 Implementation implications

The feed appears capable of supporting:

- active-alert counts;
- alert cards with headers and descriptions;
- current and future active windows;
- route-level alert badges;
- affected-stop context and map highlighting;
- cause, effect, and severity grouping;
- external source links where populated.

Implementation should:

- support multiple active periods per alert;
- not assume every alert has a URL;
- preserve direction-specific selectors;
- support stop-only and route-plus-stop alerts;
- avoid adding overlapping selector counts together;
- treat absent trip or agency selectors as normal absence, not failure.

---

## 13. Service Alerts static-identifier joins

| Identifier type | Matched | Observed | Match rate |
|---|---:|---:|---:|
| Route IDs | 38 | 38 | 100% |
| Stop IDs | 84 | 84 | 100% |
| Trip IDs | 0 | 0 | Not applicable |
| Agency IDs | 0 | 0 | Not applicable |

Unmatched lists were empty for every identifier type.

### 13.1 Correct interpretation

> Every unique route and stop identifier present in this one Service Alerts snapshot existed in the downloaded static GTFS package.

This does not establish that future snapshots will always join perfectly, that trip-specific or agency-wide selectors never occur, or that every alert structure has been observed.

### 13.2 Combined realtime conclusion

- Vehicle Positions had partial route/trip identifier availability across vehicles but complete joins when identifiers were present.
- Trip Updates had complete core identifier coverage and complete route/trip/stop joins.
- Service Alerts used route and stop selectors in this snapshot, and all observed route and stop identifiers joined successfully.
- All three realtime feeds aligned with the same downloaded static GTFS package.

---

## 14. Initial daytime cadence and freshness verification

### 14.1 Test design

Two restrained daytime tests were run on July 24, 2026, Arizona time.

#### Vehicle Positions run

- 20 samples;
- 30-second interval;
- approximately 9.5 minutes;
- metadata and derived freshness statistics retained;
- no raw protobuf snapshots retained by the cadence script.

#### Combined Trip Updates and Service Alerts run

- 20 Trip Updates samples at 30-second intervals;
- 10 Service Alerts samples at 60-second intervals;
- approximately 9.5 minutes;
- one combined sanitized CSV;
- no raw protobuf snapshots retained by the cadence script.

Across both runs:

| Property | Result |
|---|---:|
| Total requests | 50 |
| Successful requests | 50 |
| Errors | 0 |

These tests establish initial daytime behavior only. They do not establish an official provider publication cadence, permitted production polling rate, overnight behavior, weekend behavior, or long-duration reliability.

### 14.2 Vehicle Positions cadence findings

Across 20 samples:

| Metric | Observed result |
|---|---|
| HTTP success | 20/20 |
| Subsequent payloads changed | 19/19 |
| Subsequent header timestamps changed | 19/19 |
| Feed-header age | 0.7–15.7 seconds |
| Mean feed-header age | approximately 8.6 seconds |
| Entity count | 589–604 |
| Mean entity count | approximately 597 |
| Payload size | 61,590–62,517 bytes |
| Request latency | 1.484–2.328 seconds |
| Vehicles no more than 90 seconds old | 97.8%–98.6% |
| Mean vehicles no more than 90 seconds old | approximately 98.1% |
| Vehicles more than 300 seconds old | 5–10 per sample |
| Oldest vehicle age | approximately 8.2–10.8 minutes |

Every response contained an ETag, and each sampled ETag was distinct.

The count of vehicles no more than 30 seconds old varied substantially, so a 30-second active-vehicle threshold would be unnecessarily strict. The observed distribution supports an initial 90-second active-vehicle threshold.

### 14.3 Trip Updates cadence findings

Across 20 samples:

| Metric | Observed result |
|---|---|
| HTTP success | 20/20 |
| Subsequent payloads changed | 19/19 |
| Subsequent header timestamps changed | 19/19 |
| Feed-header age | 0.6–21.6 seconds |
| Mean feed-header age | approximately 10.4 seconds |
| Trip updates | 614–630 |
| Mean trip updates | approximately 623 |
| Stop-time updates | 10,476–10,669 |
| Mean stop-time updates | approximately 10,573 |
| Payload size | 442,888–451,606 bytes |
| Request latency | 1.687–2.578 seconds |
| Trip-update timestamps no more than 30 seconds old | 100% |
| Cancelled trips | 1 per sample |
| Skipped stops | 69–90 per sample |

Every response contained an ETag, and each sampled ETag was distinct.

The run resolved several earlier open questions:

- explicitly cancelled trips occur;
- skipped stop relationships occur;
- scheduled and skipped stop updates have meaningfully different field expectations;
- positive, zero, and negative delay values all occur repeatedly.

Across scheduled prediction records in this test window, the approximate delay-value distribution was:

| Delay state | Arrival predictions | Departure predictions |
|---|---:|---:|
| Negative / early | 24.9% | 24.3% |
| Exactly zero | 6.9% | 7.6% |
| Positive / late | 68.2% | 68.1% |

These percentages describe prediction records in one daytime window. They are not an official on-time-performance result and should not be presented as one.

Implementation must inspect the stop schedule relationship before interpreting missing arrival, departure, or delay fields. A skipped stop must not be treated as an on-time stop with zero delay.

### 14.4 Service Alerts cadence findings

Across 10 samples:

| Metric | Observed result |
|---|---|
| HTTP success | 10/10 |
| Header timestamp changed on subsequent samples | 9/9 |
| ETag | No value observed |
| Cache-Control | No value observed |
| Payload size before content change | 13,093 bytes |
| Payload size after content change | 13,453 bytes |
| Request latency | 1.484–2.266 seconds |

Alert content was stable for the first six samples:

- 17 total alerts;
- 14 active now;
- 3 future-only alerts;
- 128 informed entities;
- 11 alerts with URLs.

At the seventh alert sample, substantive content changed:

- total alerts increased from 17 to 18;
- active alerts increased from 14 to 15;
- informed entities increased from 128 to 130;
- one trip-specific selector appeared;
- `OTHER_CAUSE` increased by one;
- `REDUCED_SERVICE` appeared as an effect;
- all observed alerts still had `WARNING` severity.

This resolves two earlier open questions:

- trip-specific alert targeting occurs;
- `REDUCED_SERVICE` effects occur.

Although every alert payload hash changed, most of those hash changes were attributable to a refreshed feed-header timestamp rather than changed alert content. Payload-hash change alone is therefore not a valid alert-content-change signal.

The script reported alert feed ages between approximately `-0.9` and `-0.4` seconds. This is a measurement artifact: request time was recorded before the response was downloaded, while the provider generated the feed timestamp during the request. Operationally, the alert feed was approximately zero to one second old when returned.

### 14.5 Provisional technical thresholds

The following are PHX Transit Pulse methodology decisions supported by the observed tests. They are not official Valley Metro definitions or confirmed provider-authorized polling rates.

| Rule | Provisional definition |
|---|---|
| Active vehicle | Vehicle timestamp age no more than 90 seconds |
| Stale vehicle | Vehicle timestamp age greater than 90 seconds |
| Very stale vehicle | Vehicle timestamp age greater than 300 seconds |
| Healthy realtime feed | Feed-header age no more than 30 seconds |
| Degraded realtime feed | Feed-header age greater than 60 seconds |
| Vehicle Positions polling | 30 seconds |
| Trip Updates polling | 30 seconds |
| Service Alerts polling | 60 seconds |

Stale vehicles may remain visible when clearly labeled, but they should not be included in the active-fleet KPI.

### 14.6 Cadence conclusion

The initial daytime cadence inspection is complete.

The tests support the following qualified statement:

> During two restrained daytime tests totaling 50 requests, every request succeeded. Vehicle Positions and Trip Updates returned changed payloads with newer feed-header timestamps at every 30-second sample. Service Alerts refreshed its feed header at every 60-second sample and produced one substantive alert-content change during the run. These results support provisional technical polling and freshness rules but do not establish provider-authorized production polling rates or long-duration reliability.

An evening, overnight, weekend, or longer-duration comparison would strengthen reliability evidence, but it is not required to continue Pass 13.0.

---

## 15. Formal validation

### 15.1 Validation environment

Static validation used the hosted MobilityData Canonical GTFS Schedule Validator.

Realtime validation used a locally built copy of the MobilityData GTFS-Realtime Validator:

- Java: Temurin OpenJDK 17.0.19;
- Maven: 3.9.16;
- local source build: successful;
- validator web application: `gtfs-realtime-validator-webapp-1.0.0-SNAPSHOT.jar`;
- local interface: `http://localhost:8080`.

The static source ZIP and saved protobuf snapshots were served only over a local Python HTTP server. No API key was entered into the validator.

### 15.2 Realtime-validator static-parser compatibility issue

The realtime validator's bundled OneBusAway static parser failed on the provider's current `areas.txt` file with:

```text
MissingRequiredFieldException: missing required field: wkt
```

The current provider file used the observed header:

```text
area_id,area_name
```

Because the canonical Schedule Validator had already accepted the original ZIP with zero specification errors, this failure was treated as a validator-parser compatibility problem rather than a provider-feed failure.

A local validator-only ZIP was created that omitted:

- `areas.txt`;
- `stop_areas.txt`;
- `directions.txt`.

The original provider ZIP was not modified. The compatibility ZIP retained the route, trip, stop, stop-time, service-date, shape, agency, transfer, frequency, and feed-information files required for the realtime cross-checks.

The realtime validator also displayed `80126 error(s)/warning(s)` for its internal static validation of the compatibility ZIP. That total was not used as the authoritative static result because:

- the canonical validator had already evaluated the original ZIP;
- the realtime validator uses a different and older static parser;
- the internal total was not presented as a clear specification-compliance breakdown.

### 15.3 Vehicle Positions validation

The saved Vehicle Positions snapshot parsed successfully.

| Rule | Severity | Count | Interpretation |
|---|---|---:|---|
| `E028` — Vehicle position outside agency coverage area | Error | 1 | One position fell outside the validator's coverage buffer. |
| `E052` — `vehicle.id` is not unique | Error | 1 | At least one duplicate vehicle identifier was detected. |
| `W004` — Vehicle speed is unrealistic | Warning | 1 | One speed value exceeded the validator's plausibility rule. |
| `W008` — Header timestamp is older than 65 seconds | Warning | 1 | Expected for a saved snapshot validated later. |
| `W009` — `schedule_relationship` not populated | Warning | 1 | One optional or expected relationship field was absent. |

Practical conclusion:

> The snapshot is parseable and broadly usable, but the duplicate identifier, out-of-area position, and unrealistic-speed records should be handled defensively. The stale-header finding is a test artifact of validating a frozen snapshot.

### 15.4 Trip Updates validation

The saved Trip Updates snapshot parsed successfully.

| Rule | Severity | Count | Interpretation |
|---|---|---:|---|
| `E022` — Sequential `stop_time_update` times are not increasing | Error | 1 | At least one trip contained consecutive prediction times that did not progress monotonically. |
| `E047` — VehiclePosition and TripUpdate ID pairing mismatch | Error | 1 | Cross-feed consistency check; requires cautious interpretation. |
| `W003` — ID in one feed missing from the other | Warning | 1 | Cross-feed consistency check; requires cautious interpretation. |
| `W008` — Header timestamp is older than 65 seconds | Warning | 1 | Expected for a saved snapshot validated later. |

The `E022` sequencing finding is the clearest trip-update content issue and should be reproduced against fresh data or inspected directly before metric implementation.

`E047` and `W003` require caution because the same pair appeared during an alerts-only validation session, where Vehicle Position and Trip Update pairing is not relevant. They should therefore be treated as validator-context or session-state findings until reproduced in a clean multi-feed validation run.

Practical conclusion:

> The snapshot is parseable and supports the planned prediction use cases, but consumers should not assume all stop prediction times are strictly increasing. Sorting, deduplication, and defensive sequence checks are warranted.

### 15.5 Service Alerts validation

The saved Service Alerts snapshot parsed successfully.

| Rule | Severity | Count | Interpretation |
|---|---|---:|---|
| `E047` — VehiclePosition and TripUpdate ID pairing mismatch | Error | 1 | Not alert-specific; likely validator-context behavior. |
| `W003` — ID in one feed missing from the other | Warning | 1 | Not alert-specific; likely validator-context behavior. |
| `W008` — Header timestamp is older than 65 seconds | Warning | 1 | Expected for a saved snapshot validated later. |

No alert-specific content error was reported.

Practical conclusion:

> The saved Service Alerts payload parsed successfully and produced no alert-specific validation finding. The reported cross-feed rules are not meaningful evidence against an alerts-only payload.

### 15.6 Formal-validation conclusion

Formal validation is complete for the initial Pass 13.0 evidence set.

The strongest conclusions are:

- the original static package has zero canonical specification errors;
- all three saved realtime payloads parse successfully;
- Vehicle Positions contains a small number of concrete quality anomalies that require defensive handling;
- Trip Updates contains at least one prediction-sequencing anomaly;
- Service Alerts produced no alert-specific content finding;
- stale-header warnings are expected because the validator inspected saved snapshots;
- the realtime validator's old static parser and cross-feed rule behavior limit how literally some results should be interpreted.

The formal results support continued development, but they do not establish provider authorization, production reliability, or perfect feed quality.

---

## 16. Capabilities now supported by evidence

The current evidence supports proceeding with designs and contracts for:

### Directly supportable

- plotting active vehicle coordinates;
- counting unique vehicles in a snapshot;
- displaying vehicle-level timestamps;
- calculating feed-header age;
- calculating individual vehicle age;
- identifying missing route/trip/stop/status fields;
- showing speed where populated;
- showing current stop/status where populated;
- displaying predicted arrivals and departures;
- displaying stop-by-stop delay values;
- identifying early, zero-delay, and late predictions;
- counting active trip updates;
- counting active service alerts;
- displaying alert text, cause, effect, severity, active periods, and optional URLs;
- detecting cancelled trips and skipped stops;
- distinguishing alert feed refreshes from substantive alert-content changes;
- classifying active, stale, and very stale vehicles using documented thresholds.

### Supportable after static enrichment

When identifiers are present:

- route short and long names;
- route colors and route types;
- trip-to-route context;
- stop names and coordinates;
- route geometry through shape relationships;
- schedule context through trips and stop times;
- route and mode filtering;
- route-level predicted-delay summaries;
- trip-level upcoming-stop timelines;
- schedule-versus-prediction comparisons;
- affected-route alert badges;
- affected-stop lookup and map highlighting.

### Required user-interface states

The dashboard contract should include explicit states such as:

- fully enriched vehicle;
- route/trip unavailable;
- stop/status unavailable;
- cancelled trip;
- skipped stop;
- stale vehicle;
- very stale vehicle;
- stale feed;
- feed error;
- replay or recorded mode;
- no data.

---

## 17. Credential and security handling

The working Mecatran URL contained an API key in the query string.

Because that key was pasted into chat and used from the terminal:

- treat the value as exposed;
- do not include it in this document;
- do not commit it to Git;
- do not place it in static frontend JavaScript;
- do not put it in screenshots, PR descriptions, fixtures, logs, or documentation;
- do not assume it is safe merely because a third-party registry may also expose it.

The current test proves only that the key worked at the observed time.

Still unresolved:

- who issued or owns the key;
- whether it is shared or user-specific;
- whether registration is normally required;
- whether the key may be redistributed;
- whether it is subject to documented quotas;
- whether it can be used from a public server-side relay;
- whether rotation or revocation procedures exist.

A future live implementation should prefer server-side secret storage and a narrow relay, subject to confirmed terms.

---

## 18. Matters not yet verified

### 18.1 Endpoint inventory

Still needed:

- confirmation that the static, Vehicle Positions, Trip Updates, and Alerts feeds are all the intended current Valley Metro sources;
- a documented official source linking or authorizing those endpoints.

### 18.2 Registration and API-key policy

Still needed:

- whether registration is required;
- whether the observed key is public or credentialed;
- whether separate keys are available;
- whether different feeds use the same key;
- quota and rate-limit documentation;
- revocation and rotation expectations.

### 18.3 License and terms

Still needed for each source:

- authoritative license name;
- required attribution text;
- redistribution rights;
- derivative-data rights;
- caching limits;
- permitted polling frequency;
- restrictions on commercial or public use;
- restrictions on storing historical observations;
- requirements for displaying source freshness;
- disclaimer requirements;
- whether the API key or endpoint may be republished.

Third-party license labels should not replace an authoritative City of Phoenix or Valley Metro statement.

A written inquiry covering these questions was sent to `csr@valleymetro.org` with `pubtrans@phoenix.gov` copied. A response is pending.

### 18.4 Replay-fixture permission

Still needed:

- whether raw real-time snapshots may be committed;
- whether decoded raw snapshots may be committed;
- whether normalized, reduced, representative records may be committed;
- whether IDs must be transformed or omitted;
- whether replay data may be publicly deployed;
- required attribution for replay mode;
- retention-duration limits, if any.

Until confirmed, no captured payload or key-bearing source URL should be committed.

### 18.5 Trip Updates methodology and edge cases

Verified:

- HTTP access and response metadata;
- protobuf version and entity counts;
- complete trip and route identifier coverage in the inspected snapshots;
- stop-time update structure;
- explicit positive, zero, and negative delay values;
- predicted arrival and departure timestamp coverage for scheduled stops;
- scheduled, cancelled, and skipped relationships;
- one cancelled trip in every cadence sample;
- 69–90 skipped stops per cadence sample;
- complete route, trip, and stop joins in the original join test;
- fresh trip-update timestamps throughout the cadence run.

Still needed:

- determine whether any scheduled records contain differing arrival and departure times;
- observe added, duplicated, or other trip relationships;
- validate the representative-per-trip delay aggregation method;
- define early/on-time/late thresholds;
- compare selected realtime predictions against static scheduled times;
- test behavior across additional times of day and service dates.

### 18.6 Service Alerts edge cases and longitudinal behavior

Verified:

- HTTP access and response metadata;
- protobuf version and entity counts;
- complete header and description coverage in the original snapshot;
- partial URL coverage;
- multiple active periods;
- semantic cause, effect, and severity labels;
- route, stop, and trip targeting;
- one substantive content change during the cadence run;
- `REDUCED_SERVICE` as an observed effect;
- future-only and currently active alert classification;
- complete route and stop joins in the original join test.

Still needed:

- observe agency-wide selectors;
- observe severity levels other than `WARNING`;
- test open-ended, expired, and overlapping alert periods;
- compare behavior across longer and different service windows;
- confirm whether multilingual text is ever supplied.

### 18.7 Update cadence and operational reliability

Verified in initial daytime tests:

- 50 successful requests with zero errors;
- Vehicle Positions changes across 20 samples at 30-second intervals;
- Trip Updates changes across 20 samples at 30-second intervals;
- Service Alerts refresh behavior across 10 samples at 60-second intervals;
- payload-size and entity-count variation;
- response-latency ranges;
- Vehicle Positions and Trip Updates ETag behavior;
- absence of observed Service Alerts ETags;
- vehicle freshness distribution;
- one substantive Service Alerts content change.

Still needed:

- provider-authorized polling and caching terms;
- longer-duration reliability;
- daytime versus overnight behavior;
- weekday versus weekend behavior;
- error, timeout, and throttling behavior under longer observation;
- CORS behavior, if direct browser access is considered.

No official publication cadence or authorized production polling rate should be claimed from these tests alone.

### 18.8 Static feed maintenance

Still needed:

- official last-updated metadata from the resource page;
- expected publication schedule;
- stable versus versioned download behavior;
- whether old schedule versions remain available;
- how static-feed transitions align with real-time IDs;
- whether feed version changes require cache invalidation or rebuilds.

### 18.9 Formal validation follow-up

Completed:

- canonical static GTFS validation with zero errors;
- local GTFS-Realtime validation of saved Vehicle Positions, Trip Updates, and Service Alerts snapshots;
- identification of the realtime validator's `areas.txt` parser incompatibility;
- preservation of the canonical static validation report;
- documentation of concrete Vehicle Positions and Trip Updates findings;
- identification of non-alert-specific cross-feed findings during the alerts-only run.

Still useful:

- reproduce the duplicate `vehicle.id`, out-of-area position, and unrealistic-speed findings against fresh snapshots;
- inspect the exact Trip Update entity responsible for non-increasing sequential prediction times;
- run one clean combined Vehicle Positions plus Trip Updates validation session to determine whether `E047` and `W003` are true cross-feed mismatches or validator-context artifacts;
- add local validation summaries that exclude credentials and raw payloads;
- review route-type and mode classification against the product's normalized mode taxonomy.

---

## 19. Recommended next verification sequence

### Step 1 — Preserve sanitized evidence

Retain:

- this updated findings record;
- the canonical static validation HTML report and companion assets;
- the sanitized cadence CSVs;
- verification scripts without credentials;
- test dates and timezones;
- static feed version and source;
- HTTP metadata;
- decoded coverage and join counts;
- concise realtime validation summaries.

Do not commit the API key, raw live protobuf snapshots, or the validator-only compatibility ZIP unless terms and repository policy explicitly permit them.

### Step 2 — Await and evaluate the provider response

A usage and terms inquiry has already been sent.

When a response arrives, record:

- registration and credential expectations;
- whether the observed endpoint/key pattern is authorized;
- permitted public and noncommercial use;
- recommended or maximum polling frequency;
- caching and historical-retention limits;
- whether normalized replay fixtures may be committed and publicly deployed;
- identifier transformation requirements;
- required attribution and disclaimer language;
- static GTFS license and redistribution terms.

### Step 3 — Resolve targeted quality findings and finalize methodology

Prioritize:

- inspect or reproduce the duplicate Vehicle Positions identifier;
- inspect the out-of-area position and unrealistic speed;
- identify the Trip Update with non-increasing sequential prediction times;
- reproduce cross-feed consistency checks in a clean combined Vehicle Positions plus Trip Updates session;
- finalize the representative-per-trip delay rule;
- define early/on-time/late thresholds;
- document sorting, deduplication, and stale-record rules.

### Step 4 — Update project documentation

Update:

- `docs/phx-transit/architecture-study.md`;
- `docs/phx-transit/data-contract.md`;
- `docs/phx-transit/metric-dictionary.md`;
- `docs/phx-transit/roadmap.md`.

Replace provisional assumptions with observed evidence, retain explicit limitations and missing-data states, and separate provider-defined behavior from PHX Transit Pulse methodology decisions.

### Step 5 — Treat longer reliability testing as strengthening evidence

An evening, overnight, weekend, or longer-duration run would improve reliability evidence but is not required to continue the next implementation pass. Do not describe the initial daytime test as a long-term service-level guarantee.

---


## 20. Current decision record

### Decision: static GTFS is technically usable

**Basis:** Successful download, complete extracted file set, current feed metadata, successful joins from live identifiers, and zero errors from MobilityData Canonical GTFS Schedule Validator version 8.0.1.

### Decision: preserve provider extensions without depending on them

**Basis:** Six publisher-specific columns and `directions.txt` were reported as informational nonstandard extensions rather than specification errors.

### Decision: Vehicle Positions is technically usable for further development

**Basis:** HTTP 200, protobuf payload, 458 decoded entities, complete position/vehicle/timestamp coverage, successful static joins where identifiers were present, and successful formal parsing.

**Caveat:** One duplicate `vehicle.id`, one out-of-area position, and one unrealistic speed were detected. Consumers must handle anomalous records defensively.

### Decision: Trip Updates is technically usable for further development

**Basis:** HTTP 200, protobuf payload, 309 decoded trip updates, 5,786 decoded stop-time updates, complete core field coverage, observed early/zero/late delays, complete static route/trip/stop joins, and successful formal parsing.

**Caveat:** At least one trip contained non-increasing sequential prediction times. Sorting and validation cannot be assumed away.

### Decision: Service Alerts is technically usable for further development

**Basis:** HTTP 200, protobuf payload, 15 decoded alerts, complete core text and targeting coverage, detailed active periods, complete static route/stop joins, and no alert-specific formal validation finding.

### Decision: realtime-validator cross-feed findings require cautious interpretation

**Basis:** `E047` and `W003` appeared in both Trip Updates and alerts-only runs. Because those checks are not meaningful for an alerts-only payload, they should not be treated as confirmed provider defects without reproduction in a clean combined feed session.

### Decision: initial daytime cadence is technically sufficient to continue

**Basis:** All 50 cadence-test requests succeeded without errors. Vehicle Positions and Trip Updates returned changed snapshots at every 30-second poll, and Service Alerts produced one substantive content change during 60-second polling.

### Decision: use provisional freshness thresholds

**Basis:** Approximately 98.1% of observed vehicle records were no more than 90 seconds old, while the 30-second freshness share varied too widely to serve as a reliable active-vehicle definition.

**Provisional rules:** active at no more than 90 seconds, stale above 90 seconds, and very stale above 300 seconds.

### Decision: cancellations and skipped stops are first-class states

**Basis:** Every Trip Updates cadence sample contained one cancelled trip and 69–90 skipped stops.

### Decision: missing enrichment must be a first-class state

**Basis:** Only approximately 61.4% of vehicle entities carried route and trip IDs in the observed snapshot.

### Decision: freshness must be evaluated at two levels

**Basis:** The feed header was roughly 53 seconds behind the HTTP response, while sample vehicle timestamps ranged from seconds old to more than seven minutes behind the feed header.

### Decision: do not expose or commit the observed key

**Basis:** Ownership, redistribution permission, and intended security model remain unverified.

### Decision: wait for the provider's terms response before public live ingestion or committed replay data

**Basis:** A detailed inquiry has been sent, but registration, key handling, polling, caching, retention, replay, attribution, and redistribution rules remain unresolved.

### Decision: do not claim production readiness yet

**Basis:** Provider authorization, replay permission, production polling policy, methodology finalization, targeted anomaly review, and long-duration behavior remain open.

---


## 21. Pass 13.0 status after this verification

### Completed or substantially verified

- static GTFS download access;
- static file inventory;
- static feed metadata;
- canonical static validation with zero errors;
- identification of nonblocking static quality warnings and publisher extensions;
- preservation of the static validation report;
- Vehicle Positions endpoint access;
- query-key requirement during observed testing;
- HTTP response format;
- one observed payload size;
- protobuf decoding;
- entity and field inventory;
- feed and vehicle timestamps;
- static route/trip/stop joins for Vehicle Positions;
- Trip Updates endpoint access;
- Trip Updates HTTP response format and metadata;
- Trip Updates protobuf decoding;
- Trip Updates entity and field inventory;
- positive, zero, and negative delay observations;
- predicted arrival/departure timestamps;
- Trip Updates static route/trip/stop joins;
- Service Alerts endpoint access;
- Service Alerts HTTP metadata and protobuf decoding;
- Service Alerts field inventory, targeting, active periods, text, URLs, causes, effects, and severity;
- Service Alerts static route/stop joins;
- initial Vehicle Positions cadence and freshness testing;
- combined Trip Updates and Service Alerts cadence testing;
- 50 successful cadence requests with zero errors;
- Vehicle Positions and Trip Updates payload-change behavior;
- Vehicle Positions freshness distribution;
- cancelled trips and skipped stops;
- trip-specific and reduced-service alert behavior;
- provisional technical polling and freshness thresholds;
- local formal GTFS-Realtime validation of all three saved feed types;
- identification of concrete Vehicle Positions anomalies;
- identification of a Trip Updates prediction-sequencing anomaly;
- confirmation that Service Alerts produced no alert-specific formal finding;
- provider terms and usage inquiry sent;
- missing-data and analytical implications.

### Still open before Pass 13.0 can be considered fully closed

- provider response on licensing, attribution, registration, key policy, polling, caching, retention, redistribution, and replay-fixture permission;
- Trip Updates metric-methodology refinement;
- targeted inspection or reproduction of formal validation findings;
- clean combined-feed reproduction of cross-feed consistency rules;
- optional additional Service Alerts edge-case and longitudinal observations;
- optional longer-duration, overnight, and weekend reliability observations;
- final documentation updates based on complete evidence.

---


## 22. Bottom line

The technical feasibility of the **static GTFS + live Vehicle Positions + live Trip Updates + live Service Alerts** foundation is demonstrated.

The strongest verified results are:

> The original City of Phoenix static GTFS ZIP completed MobilityData Canonical GTFS Schedule Validator version 8.0.1 with zero specification errors.

> Every observed Vehicle Positions route, trip, and stop identifier that was present matched the downloaded static GTFS package.

> All 60 Trip Updates route IDs, 309 trip IDs, and 4,917 stop IDs matched the same static GTFS package.

> All 38 Service Alerts route IDs and 84 stop IDs matched the same static GTFS package.

The most important Vehicle Positions limitations are:

> Route and trip identifiers were present for only about 61.4% of vehicle entities, so the product must support useful position-only records rather than assuming full assignment context.

> Formal validation also found one duplicate vehicle identifier, one out-of-area position, and one unrealistic speed, so individual records must be handled defensively.

The most important Trip Updates limitations are:

> Route-level delay metrics require a documented representative-per-trip aggregation method rather than a naive average across every future stop prediction.

> Formal validation found at least one trip with non-increasing sequential prediction times, so downstream code must validate and order predictions rather than assume perfect monotonicity.

The most important Service Alerts limitation is:

> URLs were present for only 10 of 15 alerts, one alert may contain multiple active periods, and alert targeting may occur at route, stop, direction, or trip level.

Technical access, decoding, core field inventory, static joins, initial daytime cadence, canonical static validation, and initial realtime validation are now complete.

The cadence and validation work added several important conclusions:

> A 90-second active-vehicle threshold is supported by the observed Vehicle Positions freshness distribution.

> Cancelled trips and skipped stops occur in normal Trip Updates output and must be modeled explicitly.

> Service Alerts may refresh its feed timestamp without changing alert content, so substantive alert comparison must exclude header-only changes.

> Saved realtime snapshots are parseable, but stale-header warnings are expected and a small number of feed-quality anomalies require defensive handling.

The next major dependency is the provider's response on licensing, attribution, credential handling, polling, caching, historical retention, replay fixtures, and redistribution. Targeted anomaly review and metric-methodology finalization should proceed while that response is pending.

The project is technically ready to continue beyond Pass 13.0 planning, but it is not yet approved for public live ingestion or committed replay data.

