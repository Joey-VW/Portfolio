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
- [ ] Complete human browser QA at the full viewport matrix, 200 percent zoom,
  keyboard-only navigation, reduced motion, and the Cloudflare preview.

The Pass 13.1 fixtures live only in `data/phx-transit/synthetic/`.
`operations-replay.json` contains fictional routes, stops, ordered frames,
vehicle positions, feed ages, alerts, and explicit cancelled/skipped states.
`state-scenarios.json` defines inspectable application-state presentations. Both
fixtures declare `providerData: false`; replay is fixed-time and contains no
randomness or provider-derived geometry or records.

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
