# PHX Transit Pulse staged roadmap

The first usable release remains smaller than the dashboard concept. Pass 13.0
establishes technical feasibility and contracts; it is not full production,
licensing, or public-ingestion approval.

## Pass 13.0 - Data feasibility and metric contract - closeout

- [x] Access and decode the static GTFS package and all three GTFS-Realtime feed types.
- [x] Verify static-to-realtime route, trip, and stop joins when IDs are present.
- [x] Complete initial daytime cadence inspection for vehicles, trip updates, and alerts.
- [x] Run canonical static validation and initial GTFS-Realtime snapshot validation.
- [x] Preserve sanitized cadence CSVs, the canonical static-validator JSON result, and findings without credentials or raw protobuf.
- [x] Reconcile architecture, normalized contract, metrics, detailed roadmap, global roadmap, and verification-tool documentation.
- [ ] Receive and record the provider response covering registration, keys, attribution, polling, caching, retention, redistribution, and replay permission.

**Closeout result:** Static and realtime sources are technically usable, and the
original static package passed canonical validation with zero errors. Provider
terms remain pending. Longer overnight or weekend cadence testing would
strengthen operational evidence, but is not a blocker to Pass 13.1.

**Follow-up:** Reproduce duplicate IDs, implausible positions/speeds,
non-monotonic predictions, and uncertain cross-feed validator results with
targeted tests. Refine deduplication, exclusion, representative-stop delay, and
coverage policies without silently repairing source data.

## Pass 13.1 - Visual shell with synthetic fixtures

**Eligible to begin:** Yes, using only existing approved, clearly labeled
synthetic fixtures. Do not use captured or normalized provider records.

- [x] Build the responsive, map-dominant dashboard shell from local synthetic fixtures.
- [x] Add deterministic replay plus current, stale, very-stale, feed-error,
  offline, and no-data demonstrations.
- [x] Add keyboard-operable replay, filters, selectors, SVG records, and an
  equivalent route/vehicle table.
- [x] Keep synthetic demonstrations permanently labeled and make no
  provider-performance or live-service claim.
- [x] Complete human browser QA at the full viewport matrix, 200 percent zoom,
  keyboard-only navigation, reduced motion, and the Cloudflare preview.



The Pass 13.1 fixtures live only in `data/phx-transit/synthetic/`.
`operations-replay.json` contains fictional routes, stops, ordered frames,
vehicle positions, feed ages, alerts, and explicit cancelled/skipped states.
`state-scenarios.json` defines inspectable application-state presentations. Both
fixtures declare `providerData: false`; replay is fixed-time and contains no
randomness or provider-derived geometry or records. Geographic route lines are
aligned to OpenStreetMap road and rail infrastructure while the service
patterns, stop names, vehicles, alerts, and operational values remain fictional.
A focused review correction keeps scenario-derived ages, counts, map markers,
inspectors, filters, and non-map route records internally consistent without
rewriting the underlying fixture records.

## Pass 13.1a - Interactive fictional map - implementation complete; QA pending

- [x] Resolve dependency delivery, basemap service, fictional geography, and
  fallback decision gates.
- [x] Add fictional map metadata, GeoJSON route geometry, and geographic stop,
  vehicle, and alert coordinates while retaining the schematic fields.
- [x] Add an isolated MapLibre adapter for layers, filtering, selection, map
  controls, camera preservation, and resize behavior.
- [x] Make the real Phoenix-area basemap the primary visual surface and retain
  the schematic as the automatic library/style initialization fallback.
- [x] Preserve synthetic labeling, accessible records, keyboard selection,
  reduced-motion behavior, explicit scenarios, and visible basemap attribution.
- [x] Add a focused geographic fixture validator.
- [ ] Complete targeted desktop, tablet, mobile, short-height, 200 percent zoom,
  keyboard, reduced-motion, blocked-library, blocked-tile, console, network, and
  Cloudflare preview QA on the mapped build.

The implementation uses pinned MapLibre GL JS `5.24.0` and OpenFreeMap's public
dark style. No secret or account is required. The basemap is real geographic
context; every operational route, stop, vehicle, alert, and metric remains
fictional and `providerData` remains `false`. Route geometry is authoring-time
OpenStreetMap-aligned context, not provider service data; OSRM is not called by
the public page. The public tile service has no SLA, so the schematic fallback
remains a release requirement.

## Pass 13.2 - Live ingestion and feed health - blocked by terms

Public live ingestion and captured provider replay data are blocked until the
provider terms permit the intended polling, caching, normalization, retention,
and redistribution. After that gate, evaluate and implement a bounded
server-side relay, secret storage, decoder, caching, and health reporting. No
relay, backend, protobuf runtime, or polling cadence is approved by Pass 13.0.

## Pass 13.3 - Core operations analytics

Add the supported active-vehicle, freshness, health, alert, enrichment, and
route-detail subset. Route delay remains provisional until representative-stop,
eligibility, coverage, and aggregation decisions pass targeted validation.

## Pass 13.4 - Retained-observation analytics

Only after retention permission and methodology exist, evaluate headways,
bunching, service gaps, reliability, rankings, and historical trends. Require
completeness indicators, reproducible formulas, and tests for service exceptions.

## Pass 13.5 - Portfolio release and production hardening

Release only the approved subset after provider terms, attribution, privacy,
security, accessibility, responsive behavior, reliability, cost, map/tile, and
Cloudflare production reviews are complete. Never commit credentials, raw feeds,
unapproved replay data, or validator runtime artifacts.
