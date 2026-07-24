# PHX Transit Pulse architecture study

**Pass:** 13.0 - Data feasibility and metric contract
**Research access date:** 2026-07-24 UTC
**Working identity:** PHX Transit Pulse - Independent GTFS-Realtime Operations Lab

> Independent portfolio prototype using publicly available Valley Metro transit data. Not affiliated with or endorsed by Valley Metro or the City of Phoenix.

This is a feasibility record, not a claim that a production dashboard is live. No Valley Metro logos, credentials, raw feeds, or key-bearing URLs are committed.

## Sources and access record

| Source | Purpose | URL | Result on 2026-07-24 UTC | Limitation |
| --- | --- | --- | --- | --- |
| Valley Metro GTFS landing page | Authoritative static-feed discovery | https://www.valleymetro.org/gtfs | Environment proxy returned `HTTP/1.1 403 Forbidden` before origin connection. | Static archive URL and license text could not be retrieved. |
| Valley Metro home page | Official developer/data-navigation discovery | https://www.valleymetro.org/ | Environment proxy returned `HTTP/1.1 403 Forbidden` before origin connection. | Could not discover a current official GTFS-Realtime endpoint or terms. |
| GTFS Schedule Reference | Static schema | https://gtfs.org/documentation/schedule/reference/ | Specification URL recorded as the contract authority; not independently fetched in this environment. | Does not prove Valley Metro field coverage. |
| GTFS-Realtime Reference | Protobuf entities and timestamp semantics | https://gtfs.org/documentation/realtime/reference/ | Specification URL recorded as the contract authority; not independently fetched in this environment. | Does not prove Valley Metro field coverage. |
| Cloudflare Pages Functions | Future server-side relay suitability | https://developers.cloudflare.com/pages/functions/ | Documentation URL recorded for later implementation review; not independently fetched in this environment. | Requires later account/runtime confirmation. |
| Cloudflare Cache | Edge caching design | https://developers.cloudflare.com/workers/runtime-apis/cache/ | Documentation URL recorded for later implementation review; not independently fetched in this environment. | Cache behavior must be tested in deployed preview. |
| MapLibre GL JS | Future map renderer | https://maplibre.org/maplibre-gl-js/docs/ | Documentation URL recorded for later implementation review; not independently fetched in this environment. | MapLibre does not supply production tiles. |

The attempted static candidate URLs and unverified guessed realtime paths were deliberately not used as source facts. The exact official landing-page response was a proxy `403`, content type `text/plain`, content length `9`; curl therefore reported transfer status `000`, zero payload bytes, and no origin response. No live vehicle-position, trip-update, or alert endpoint was verified, queried, or inferred from third-party directories. A maintainer must obtain the current endpoints and terms directly from Valley Metro before Pass 13.2.

## What is established and what is not

GTFS establishes the expected static join keys: `route_id` in `routes.txt`/`trips.txt`, `trip_id` in `trips.txt`/`stop_times.txt`, `stop_id` in `stops.txt`/`stop_times.txt`, `shape_id` in `trips.txt`/`shapes.txt`, and service IDs in `calendar.txt` and/or `calendar_dates.txt`. GTFS-Realtime can carry `TripDescriptor.trip_id`, `route_id`, `VehicleDescriptor.id`, `VehiclePosition`, `TripUpdate`, and alert informed entities. Whether Valley Metro actually populates each field, and whether its values match static IDs, is **not verified**.

No cadence test was run because no live feed endpoint could be accessed. Thus response status, protobuf content type, payload size, feed header timestamp, entity count, oldest/newest entity timestamp, data age, and identifier coverage are all recorded as unavailable rather than estimated. The empty fixtures are intentional access-failure snapshots, not synthetic Valley Metro service data.

## Proposed data path

1. Download and review the official static archive outside the browser. Validate required files, record archive/version date, and create a small static lookup artifact only if redistribution terms allow it.
2. A narrow future Cloudflare Pages Function fetches only the confirmed official realtime feeds. It decodes protobuf, validates a bounded response, joins permitted static lookup data, removes unsupported fields, and emits versioned normalized JSON.
3. The Function uses a single upstream fetch per feed per cache interval, with `Cache-Control`, edge cache, timeout, size limit, conditional requests if supported, and a circuit breaker. It returns its own `fetchedAt`, upstream timestamp, age, and mode instead of concealing an upstream failure.
4. Browsers poll the normalized endpoint, not Valley Metro directly. The initial proposal is one combined snapshot every 30 seconds while visible and no polling while hidden; retry with capped exponential backoff after failure. This is a hypothesis pending agency terms and actual update cadence.
5. The browser renders a live snapshot or a versioned, clearly labeled recorded replay. It never portrays replay, stale data, or an unavailable feed as live.

### Modes and feed health

| Mode | Condition | UI behavior |
| --- | --- | --- |
| Live | All required feed checks pass and age is within a later, data-backed threshold. | Show capture and feed timestamps. |
| Replay | User selected a committed recorded fixture. | Prominent `Recorded replay` label and capture date. |
| Stale | Last usable normalized snapshot exceeds threshold but remains displayable. | Freeze metrics, timestamp, and warning; do not calculate new performance claims. |
| Offline | Browser has no network or relay cannot be reached. | Offer replay if bundled; otherwise explain unavailable state. |
| Error | Upstream response/decode/schema validation failed. | Show feed-specific error, last known age if any, and retry timing. |

Use thresholds only after observing agency cadence. Until then, `staleAfterSeconds` must be null rather than an invented SLA.

## Direct browser versus relay

Direct browser decoding would expose endpoint URLs, multiply upstream requests by visitors, depend on CORS, and require a client protobuf decoder. It also cannot safely hold any required credential. A relay adds a deployment component but centralizes validation, caching, CORS, normalization, and replay selection. **Recommendation:** use a narrow Pages Function relay only after terms, endpoints, CORS, and key policy are confirmed. Do not add a proxy merely to bypass provider restrictions.

Decoding options are: a maintained generated protobuf client bundled into a future worker, a small reviewed GTFS-Realtime decoder compatible with the Workers runtime, or upstream JSON only if Valley Metro officially supplies it. Choose after confirming runtime compatibility, package size, license, and security review. No library or package manager was added in this pass.

## Map, accessibility, and tiles

MapLibre GL JS is suitable for an interactive vector map, but requires a separate, licensed tile/style provider. Evaluate an agency-approved source, a commercial provider with a public production key policy, or self-hosting only with explicit operational approval. Do not use a public/demo tile endpoint as production infrastructure. Preserve provider attribution exactly as licensed, include data attribution required by Valley Metro, and do not imitate agency branding.

Provide a text route/vehicle list and route-detail summary that remain useful when the map fails. Respect `prefers-reduced-motion`: stop nonessential marker interpolation, disable animated camera transitions, and use timestamped state changes instead. Ensure keyboard route filtering, focusable detail controls, non-color status labels, and accessible map alternatives.

## Volume estimate

Assumption: one combined normalized response per visible visitor every 30 seconds, 10 hours/day, 22 weekdays/month; edge cache coalesces upstream fetches to one fetch/feed/30 seconds continuously during those same hours. One active browser produces 1,200 requests/day. One hundred concurrent active browsers produces 120,000 browser requests/day; the relay makes approximately 1,200 upstream fetches/feed/day, or 3,600/day for three feeds. Payload sizes are unknown, so no bandwidth or cost estimate is claimed. Actual TTL, feed cadence, traffic, and provider terms must replace these assumptions before release.

## Licensing, attribution, and decisions

Before ingesting or redistributing static or realtime data, obtain and record the official data license, required attribution, redistribution permissions, caching limit, rate limit, acceptable-use terms, and any API-key policy. An endpoint visible in a catalog is not permission to redistribute its key. Store secrets only as deployment secrets, never browser JSON or source.

**Recommended:** static lookup artifact plus a bounded, cached server-side normalization layer, browser polling of one normalized snapshot, transparent health modes, and recorded replay fallback.

**Rejected for now:** direct browser polling/decoding, client-held credentials, raw-feed archiving, unlimited history, unlicensed public tiles, and analytics labels that imply agency KPIs. These alternatives either amplify upstream load, weaken reliability/privacy, or exceed the verified evidence.
