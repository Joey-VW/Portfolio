# PHX Transit Pulse staged roadmap

The first usable release is deliberately smaller than the dashboard concept. It prioritizes a live vehicle map, bus/light-rail filter, active count, feed freshness/health, alerts, supported route delay details, route inspection, and recorded replay fallback. It defers headway, bunching, gaps, reliability, and historical analytics until retention and formulas are validated.

## Pass 13.0 - Data feasibility and metric contract
- **Goal/scope:** Verify official sources, record access evidence, define normalized contract and metrics, add compact provenance fixtures.
- **Dependencies:** Official endpoints, terms, and field coverage.
- **Acceptance:** Documentation records live results or exact failure; fixtures contain no secrets; registry route is hidden/noindex; contract distinguishes direct, joined, derived, and history fields.
- **Risks:** Current environment received proxy 403 before Valley Metro origin access; no agency field or cadence claim is possible.
- **Human QA:** Obtain official URLs/terms, rerun the live observation sheet, inspect fixtures for safe publication.

## Pass 13.1 - Visual shell and recorded operations replay
- **Goal/scope:** Build an accessible, responsive project shell using only clearly labeled recorded replay fixtures and mode states.
- **Dependencies:** Approved visual direction and reviewed fixture contract.
- **Acceptance:** No claim of live service; map alternative text/list, keyboard filters, reduced motion, and desktop/mobile route checks work.
- **Risks:** Replay can be mistaken for live without persistent labels.
- **Human QA:** Review copy, affiliation disclaimer, visual hierarchy, mobile/tablet, and assistive-technology flow.

## Pass 13.2 - Live ingestion and feed health
- **Goal/scope:** Implement the approved narrow relay, confirmed live feeds, cache control, decoder, and health reporting.
- **Dependencies:** Official URLs, license/attribution/caching/key policy, deployed Pages Functions review.
- **Acceptance:** Bounded upstream requests; no client secret; source IDs join static data; explicit Live/Stale/Error/Offline/Replay states; field coverage and cadence captured.
- **Risks:** CORS, keys, rate limits, protobuf runtime compatibility, stale upstream data.
- **Human QA:** Cloudflare preview checks, provider terms review, network/error simulation, data-attribution approval.

## Pass 13.3 - Core operations analytics
- **Goal/scope:** Add map, bus/light-rail filtering, active vehicles, freshness, health, alerts, route detail, and delay only where joins support it.
- **Dependencies:** Pass 13.2 verified fields and static joins.
- **Acceptance:** Every metric has source timestamp/coverage; unknowns remain unknown; route inspection is keyboard accessible; replay fallback works.
- **Risks:** Misleading count/delay claims from incomplete entities.
- **Human QA:** Compare selected live entities to agency-facing service information and check desktop/mobile accessibility.

## Pass 13.4 - Headways, bunching, and service gaps
- **Goal/scope:** Add retained observation pipeline and validate scheduled-versus-observed calculations before exposing advanced indicators.
- **Dependencies:** Retention policy, time-zone/service-calendar joins, coverage study, approved portfolio thresholds.
- **Acceptance:** Completeness indicators, reproducible formulas, no official-KPI implication, and tests for detours/cancellations/short turns.
- **Risks:** GPS/stop-passage ambiguity, incomplete observations, false comparisons.
- **Human QA:** Transit-domain review of thresholds and sampled route-day investigations.

## Pass 13.5 - Portfolio release and production hardening
- **Goal/scope:** Make the approved subset public after reliability, privacy, cost, and presentation hardening.
- **Dependencies:** Earlier passes, legal/attribution decision, Cloudflare production review, map tile agreement.
- **Acceptance:** Security headers/cache policy, accessible fallback, responsive/keyboard/reduced-motion checks, clear disclaimer, monitoring/runbook, no secrets/raw captures.
- **Risks:** Ongoing provider changes, tile costs, uptime, and data terms.
- **Human QA:** Cloudflare production preview, mobile/device testing, attribution/legal review, and release approval.
