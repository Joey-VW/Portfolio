# PHX Transit Pulse architecture study

**Pass:** 13.0 - Data feasibility and metric contract
**Verification date:** 2026-07-24
**Working identity:** PHX Transit Pulse - Independent GTFS-Realtime Operations Lab

> Independent portfolio prototype using Valley Metro transit data. Not affiliated with or endorsed by Valley Metro or the City of Phoenix.

This is a feasibility record, not production approval. No dashboard, relay, live
ingestion layer, credentials, or provider replay data is implemented or committed
in this pass.

## Verified source architecture

The original City of Phoenix static GTFS package and Valley Metro Vehicle
Positions, Trip Updates, and Service Alerts GTFS-Realtime feeds were downloaded,
decoded, and joined during Pass 13.0. All four feed types are technically usable.
Identifiers present in the inspected realtime snapshots joined to the static
package. The unmodified static package passed MobilityData Canonical GTFS
Schedule Validator 8.0.1 with zero errors; its repository evidence is
`data/phx-transit/verification/static-validator/gtfs-schedule-260724-1945.json`.

This technical result does not establish authorization for public ingestion,
polling, caching, retention, or redistribution. The provider terms inquiry is
pending. Public live ingestion and any public or committed provider replay remain
blocked until the applicable terms permit them.

## Evidence and decision classes

| Class | Current record |
| --- | --- |
| Provider-defined fact | GTFS Schedule and GTFS-Realtime source fields, identifiers, timestamps, and enumerated relationships retain their source meaning. Provider terms and attribution control permitted use. |
| Verified observation | Static and all three realtime feed types parsed; observed identifiers joined; the original static ZIP passed canonical validation with zero errors; daytime cadence and anomaly evidence was recorded. |
| PHX Transit methodology choice | Preserve source values and provenance, expose feed and entity freshness separately, and label non-live modes explicitly. Keep any required API key server-side and outside source control. |
| Provisional choice | A future narrow server-side relay is preferred over direct browser requests so credentials, bounded fetching, validation, caching, and normalization can remain centralized. Its exact backend and decoder are not selected or implemented. |
| Deferred decision | Provider-authorized polling, caching, retention and replay; final protobuf runtime; relay platform details; map renderer, tile/style service, and production hosting configuration. |

## Approved work boundary

Pass 13.1 may begin using the clearly labeled synthetic fixtures already approved
for repository use. Captured provider protobuf, extracted static files, and
captured or normalized provider replay data must not be committed until provider
terms expressly permit the intended use. Synthetic data must not be presented as
live, recorded provider service, or evidence of provider performance.

## Preferred future data path

Subject to provider terms, a narrow server-side relay remains the preferred live
model:

1. Fetch only approved official sources at an authorized cadence.
2. Keep `VALLEY_METRO_API_KEY` in server-side secret storage, never in browser
   code, URLs in documentation, fixtures, logs, or source control.
3. Decode bounded responses, retain source timestamps, validate fields, and join
   approved static lookups without inventing corrections.
4. Return a versioned normalized response with explicit live, stale, very stale,
   feed-error, replay, offline, and no-data states.
5. Bound requests and cache only as provider terms allow.

The relay is a recommendation, not an accepted backend design and not part of
this pass. No protobuf runtime, Cloudflare Function design, map provider, tile
service, retention store, or production polling cadence is finally selected.

## Security, licensing, and presentation constraints

- Treat the API key as a secret even though the observed service used a query
  parameter. It must remain server-side and outside source control.
- Do not use a proxy to bypass provider controls or imply that successful access
  grants redistribution rights.
- Preserve the independent-project disclaimer and required attribution once the
  governing terms are confirmed.
- Never conceal replay, stale data, an upstream error, offline operation, or an
  empty result behind a live label.
- Provide a usable text alternative if a future map is added, and preserve
  keyboard access, non-color status labels, and reduced-motion behavior.

## Remaining gates

The provider response must resolve registration and key policy, attribution,
polling and caching limits, retention, normalized derivative and replay
permission, and static-data terms before public live ingestion or captured
replay work begins. Runtime, backend, map, and tile decisions follow those gates
and later technical evaluation.
