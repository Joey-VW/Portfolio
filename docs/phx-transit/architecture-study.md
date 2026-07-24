# PHX Transit Pulse architecture study

**Pass:** 13.0 - Data feasibility and metric contract
**Research access date:** 2026-07-24 UTC
**Working identity:** PHX Transit Pulse - Independent GTFS-Realtime Operations Lab

> Independent portfolio prototype using publicly available Valley Metro transit data. Not affiliated with or endorsed by Valley Metro or the City of Phoenix.

This is a feasibility record, not a claim that a production dashboard is live. No Valley Metro logos, credentials, raw feeds, or key-bearing URLs are committed.

## Sources and access record

| Source | Purpose | URL | Result on 2026-07-24 UTC | Limitation |
| --- | --- | --- | --- | --- |
| Valley Metro GTFS path | Initial static-feed access attempt | https://www.valleymetro.org/gtfs | The implementation workspace proxy returned `HTTP/1.1 403 Forbidden` before origin connection. | No archive, feed payload, headers, or field coverage were observed from this path. |
| Valley Metro Developers Resources | Current official developer discovery and terms page | https://www.valleymetro.org/contact/developers-resources | Verified outside the restricted implementation workspace. It directs developers to City of Phoenix Open Data for static and realtime bus/light-rail GTFS and publishes Valley Metro developer terms. | It does not itself expose or prove the current feed payloads, update cadence, field coverage, or City dataset-specific controls. |
| City of Phoenix Open Data transportation group | Official City catalog path linked by Valley Metro | https://www.phoenixopendata.com/group/transportation1 | Confirmed as the official linked catalog destination through Valley Metro Developers Resources. | The exact current dataset records, download URLs, CORS behavior, keys, and feed responses remain unverified in this pass. |
| GTFS Schedule Reference | Static schema | https://gtfs.org/documentation/schedule/reference/ | Specification URL recorded as the contract authority; not independently fetched in the implementation workspace. | Does not prove Valley Metro field coverage. |
| GTFS-Realtime Reference | Protobuf entities and timestamp semantics | https://gtfs.org/documentation/realtime/reference/ | Specification URL recorded as the contract authority; not independently fetched in the implementation workspace. | Does not prove Valley Metro field coverage. |
| Cloudflare Pages Functions | Future server-side relay suitability | https://developers.cloudflare.com/pages/functions/ | Documentation URL recorded for later implementation review; not independently fetched in the implementation workspace. | Requires later account/runtime confirmation. |
| Cloudflare Cache | Edge caching design | https://developers.cloudflare.com/workers/runtime-apis/cache/ | Documentation URL recorded for later implementation review; not independently fetched in the implementation workspace. | Cache behavior must be tested in deployed preview. |
| MapLibre GL JS | Future map renderer | https://maplibre.org/maplibre-gl-js/docs/ | Documentation URL recorded for later implementation review; not independently fetched in the implementation workspace. | MapLibre does not supply production tiles. |

The current official discovery path is Valley Metro Developers Resources, followed by its linked City of Phoenix Open Data transportation group and the GTFS datasets published there. The initial workspace could not reach the Valley Metro or City origins because its proxy returned `HTTP/1.1 403 Forbidden` before origin connection. The separate official-source review verified the discovery page and terms, but did not retrieve or decode a current static archive, vehicle-position feed, trip-update feed, alert feed, or key-bearing endpoint. No payload sizes, timestamps, entities, cadence, joins, CORS behavior, or rate limits are claimed.

## Official terms, licensing, and discovery conclusion

Valley Metro Developers Resources states that static and realtime GTFS for bus and light rail are available through City of Phoenix Open Data. Its developer terms grant a limited, revocable license for covered Web Services API data, require registration for API use, prohibit misleading affiliation and unauthorized trademark use, provide the data without availability or accuracy warranties, and require the attribution legend `Route and arrival data provided by permission of Valley Metro` unless Valley Metro agrees otherwise in writing.

The page lists GTFS resources and separately defines terms for the Valley Metro Web Services API. This pass does not assume without confirmation that every City-hosted GTFS dataset, static download, or GTFS-Realtime endpoint is governed identically by the Web Services API section. Before live ingestion or public replay capture, record the final City dataset URLs, access date, dataset-specific license or terms, required attribution, registration or key policy, permitted redistribution of normalized derivatives, allowed caching/polling behavior, and any rate limit. Apply the stricter feed-specific terms where they differ.

Do not place a key-bearing URL, token, cookie, or credential in source, fixtures, browser code, or documentation. Preserve the independent-project disclaimer and do not use Valley Metro marks in a way that implies sponsorship, endorsement, or affiliation.

## What is established and what is not

GTFS establishes the expected static join keys: `route_id` in `routes.txt`/`trips.txt`, `trip_id` in `trips.txt`/`stop_times.txt`, `stop_id` in `stops.txt`/`stop_times.txt`, `shape_id` in `trips.txt`/`shapes.txt`, and service IDs in `calendar.txt` and/or `calendar_dates.txt`. GTFS-Realtime can carry `TripDescriptor.trip_id`, `route_id`, `VehicleDescriptor.id`, `VehiclePosition`, `TripUpdate`, and alert informed entities. Whether Valley Metro actually populates each field, and whether its values match static IDs, is **not verified**.

No cadence test was run because no live feed endpoint could be accessed from the implementation workspace. Thus response status, protobuf content type, payload size, feed header timestamp, entity count, oldest/newest entity timestamp, data age, and identifier coverage are all recorded as unavailable rather than estimated. The empty fixtures are intentional access-failure snapshots, not synthetic Valley Metro service data.

## Proposed data path

1. Download and review the official static archive from the verified City dataset record. Validate required files, record archive/version date, and create a small static lookup artifact only if the applicable terms allow it.
2. A narrow future Cloudflare Pages Function fetches only confirmed official realtime feeds. It decodes protobuf, validates a bounded response, joins permitted static lookup data, removes unsupported fields, and emits versioned normalized JSON.
3. The Function uses a single upstream fetch per feed per cache interval, with `Cache-Control`, edge cache, timeout, size limit, conditional requests if supported, and a circuit breaker. It returns its own `fetchedAt`, upstream timestamp, age, and mode instead of concealing an upstream failure.
4. Browsers poll the normalized endpoint, not Valley Metro directly. The initial proposal is one combined snapshot every 30 seconds while visible and no polling while hidden; retry with capped exponential backoff after failure. This is a hypothesis pending dataset terms and actual update cadence.
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

Direct browser decoding would expose endpoint URLs, multiply upstream requests by visitors, depend on CORS, and require a client protobuf decoder. It also cannot safely hold any required credential. A relay adds a deployment component but centralizes validation, caching, CORS, normalization, and replay selection. **Recommendation:** use a narrow Pages Function relay only after terms, endpoints, CORS, registration, and key policy are confirmed. Do not add a proxy merely to bypass provider restrictions.

Decoding options are: a maintained generated protobuf client bundled into a future worker, a small reviewed GTFS-Realtime decoder compatible with the Workers runtime, or upstream JSON only if the official City dataset supplies it. Choose after confirming runtime compatibility, package size, license, and security review. No library or package manager was added in this pass.

## Map, accessibility, and tiles

MapLibre GL JS is suitable for an interactive vector map, but requires a separate, licensed tile/style provider. Evaluate an agency-approved source, a commercial provider with a public production key policy, or self-hosting only with explicit operational approval. Do not use a public/demo tile endpoint as production infrastructure. Preserve provider attribution exactly as licensed, include the required Valley Metro data attribution when applicable, and do not imitate agency branding.

Provide a text route/vehicle list and route-detail summary that remain useful when the map fails. Respect `prefers-reduced-motion`: stop nonessential marker interpolation, disable animated camera transitions, and use timestamped state changes instead. Ensure keyboard route filtering, focusable detail controls, non-color status labels, and accessible map alternatives.

## Volume estimate

Assumption: one combined normalized response per visible visitor every 30 seconds, 10 hours/day, 22 weekdays/month; edge cache coalesces upstream fetches to one fetch/feed/30 seconds continuously during those same hours. One active browser produces 1,200 requests/day. One hundred concurrent active browsers produces 120,000 browser requests/day; the relay makes approximately 1,200 upstream fetches/feed/day, or 3,600/day for three feeds. Payload sizes are unknown, so no bandwidth or cost estimate is claimed. Actual TTL, feed cadence, traffic, registration requirements, and provider terms must replace these assumptions before release.

## Licensing, attribution, and decisions

Before ingesting or redistributing static or realtime data, obtain and record the applicable dataset license, required attribution, redistribution permissions, caching limit, rate limit, acceptable-use terms, and registration or API-key policy. An endpoint visible in a catalog is not permission to redistribute its key. Store secrets only as deployment secrets, never browser JSON or source.

**Recommended:** static lookup artifact plus a bounded, cached server-side normalization layer, browser polling of one normalized snapshot, transparent health modes, required attribution, and recorded replay fallback.

**Rejected for now:** direct browser polling/decoding, client-held credentials, raw-feed archiving, unlimited history, unlicensed public tiles, and analytics labels that imply agency KPIs. These alternatives either amplify upstream load, weaken reliability/privacy, or exceed the verified evidence.
