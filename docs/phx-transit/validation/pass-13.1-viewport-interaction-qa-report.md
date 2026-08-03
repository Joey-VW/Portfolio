# PHX Transit Pulse | Pass 13.1 Viewport & Interaction QA Report

**Validation Date:** July 25, 2026
**Build:** Current PR Validation - Pass 13.1
**Environment:** Chrome DevTools Responsive Mode + Desktop Browser
**Tester:** Joe Wisto

---

# Executive Summary

This validation pass focused on responsive behavior, replay functionality, interaction stability, and general UI polish across representative mobile viewport sizes.

No functional regressions were identified during testing.

Several UX refinements were identified that would further improve the mobile experience but are **not release blockers**.

---

# Test Results

| Test Area                 | Result | Notes                                                                                      |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Viewport matrix           | ✅ Pass | No horizontal page scrolling observed. Layout remained stable across tested mobile widths. |
| Portfolio header          | ✅ Pass | Header remained visible and behaved correctly throughout testing.                          |
| Dashboard title/layout    | ✅ Pass | Properly responsive with no clipping or overflow.                                          |
| Replay controls           | ✅ Pass | Replay operated correctly before and after filtering. Timeline advanced normally.          |
| Mode and route filters    | ✅ Pass | Filters updated correctly without breaking replay functionality.                           |
| Map and table interaction | ✅ Pass | Selection behaved correctly. No interaction regressions observed.                          |
| Demo states               | ✅ Pass | Tested representative demo states; behavior appeared stable.                               |
| Hidden-tab behavior       | ✅ Pass | Replay paused correctly when the browser tab lost focus.                                   |
| Console                   | ✅ Pass | No JavaScript errors observed during testing.                                              |
| Network                   | ✅ Pass | No failed requests or unexpected network activity observed.                                |

---

# Responsive Validation

## Verified

* No page-wide horizontal scrollbar
* Responsive layout remained intact
* Primary controls remained accessible
* No control collisions observed
* No controls extended beyond viewport boundaries
* Replay controls remained functional throughout viewport changes
* Filter interactions remained stable

---

# Areas of Interest: Future UX Improvements

These observations are design refinements rather than implementation defects.

## 1. Prioritize the Map on Mobile

The interactive map is the dashboard’s primary feature but currently appears lower on the page than ideal.

**Recommendation**

* Move the map significantly higher in the mobile layout.
* Allow users to reach the primary visualization with minimal scrolling.

---

## 2. Reduce Vertical Page Length

The mobile layout becomes quite tall due to stacked informational panels.

Potential improvements include:

* Collapsible or accordion-style route sections
* Condensed summary cards
* Progressive disclosure for secondary information

These changes would reduce scrolling while preserving functionality.

---

## 3. Increase Mobile Information Density

The original design concept presents a more dashboard-like composition with a stronger visual hierarchy.

Possible future improvements include:

* Tighter spacing
* Condensed cards
* More efficient use of vertical space
* Stronger emphasis on visualization over supporting text

---

## 4. Improve Mobile Visual Hierarchy

The current hierarchy is:

1. Header
2. Controls
3. Supporting information
4. Map

The suggested hierarchy is:

1. Header
2. Map
3. Replay controls
4. Route details
5. Supporting information

This structure would better emphasize the dashboard’s primary purpose.

---

# Minor Observation

During viewport testing, the back-navigation arrow was not visible.

This should be verified to determine whether the behavior is expected or represents a responsive regression.

**Priority:** Low

---

# Overall Assessment

**Result: ✅ PASS**

No functional issues were identified during this validation pass.

The dashboard behaves correctly across the tested responsive layouts, replay functionality remains stable after filtering, hidden-tab pause works as intended, and no console or network errors were encountered.

The remaining observations are primarily **UX polish opportunities** focused on improving mobile information density, elevating the map as the primary visualization, and reducing overall page length. These are suitable candidates for a future refinement pass rather than blockers for the current implementation.

addendum: keyboard-only navigation, reduced motion, and 200% zoom pass on the Cloudflare preview ✅

---

# Mapped-build regression addendum

> **Evidence boundary:** The report above records the original schematic-build browser QA. This addendum records mapped-build local and artifact evidence. A result from the earlier section is not automatically a mapped-build pass unless it is repeated below.

**Validation Date:** August 1, 2026
**Build:** local `main` at `78d47ef`, followed by a generated `dist` artifact
**Environment:** Codex in-app browser, local HTTP server, Python and Node validators

## Verified

| Area | Result | Evidence |
| --- | --- | --- |
| Mapped initial load | Pass | MapLibre canvas, Phoenix-area basemap, visible attribution, and fictional overlay loaded successfully. |
| Viewports | Pass | 1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 375×812, and 360×800 had no horizontal overflow or out-of-bounds enabled controls. |
| Replay, filters, and selection | Pass | Replay advanced and paused; Bus and route filters synchronized the dashboard, map records, and inspector. |
| Explicit states | Pass | Current, stale, very-stale, feed-error, offline, and no-data states loaded with their intended map-record and unavailable-map behavior. |
| Keyboard baseline | Pass | The skip link receives focus through normal Tab navigation; replay pause remained at the selected frame. |
| Artifact and route smoke | Pass | `tools/check_all.py validate`, production build, `validate:dist`, and static route smoke all passed. The artifact hash was `a0cd342b4d049b4f5da02b643e1c5326e571516744178e52382148a0144ea6e2`. |
| Cloudflare artifact parity | Pass | The same artifact hash was recorded for the immutable Cloudflare `dist` preview and production cutover review on August 1, including PHX Transit filtering, selection, schematic fallback, and console health. See `docs/architecture/cloudflare-dist-cutover-runbook.md`. |

## Observations and remaining targeted checks

- MapLibre emitted one non-fatal warning from the third-party style about optional sprite image `circle-11`; the map remained interactive and no application error occurred.
- The in-app browser does not provide controllable browser zoom, reduced-motion emulation, request blocking, or tab-visibility controls. Therefore direct mapped-build checks for 200% zoom, reduced motion, hidden-tab pause, and independently blocked MapLibre and tile/style requests remain open.
- The prior Cloudflare parity review confirms deployed fallback behavior for the identical generated artifact, but it does not replace a fresh controlled regression of each individual failure mode.

---

# Mobile hierarchy refinement addendum

**Validation Date:** August 1, 2026
**Environment:** Codex in-app browser, local HTTP source preview, and generated `dist` artifact

## Result

The mobile hierarchy refinement passed its local responsive and interaction gate. Mobile now presents a compact fictional-data masthead, live replay state, shared controls, and the map before the KPI snapshot. Alerts, routes, selected-item details, and supporting insight cards use closed-by-default disclosure controls; selecting a map record opens the selected-item disclosure, and Reset clears and closes it.

## Verified

- No horizontal overflow at 360, 375, 390, 430, 768, 1024, or 1440 CSS pixels.
- The canonical controls and navigation move between their mobile and desktop hosts without duplication or state loss.
- The map precedes the KPI snapshot at the existing mobile breakpoint; desktop and larger tablet composition remains unchanged.
- Alerts and route counts remain current in collapsed summaries across replay frames.
- Current, stale, very-stale, feed-error, offline, and no-data scenarios retain their intended availability behavior.
- `?phxMapQa=fallback` on localhost deterministically exercises the schematic fallback while preserving filters, records, and responsive layout.
- Map-record selection opens the selected-item disclosure; Reset clears the selection and restores the closed state.
- Desktop alerts, routes, inspector, and insight cards remain expanded, with mobile disclosure buttons removed from the desktop accessibility tree.
- The final generated artifact passed `validate:dist` with SHA-256 `bf4eb31fbbab542f8740434ef05fad51e90f6e8361aa80ea2ff0689943550aed`.

## Remaining external checks

- Complete controlled short-height, 200 percent browser-zoom, full keyboard traversal, reduced-motion, and hidden-tab pause/restoration checks on the updated mapped build.
- Independently block MapLibre and the style/tile requests to verify each fallback path, then review console and network health.
- Review the generated artifact on a fresh Cloudflare preview and record the deployed commit, preview URL, browser, viewport, result, and any defects before closing Pass 13.1a.
- Do not treat the August 1 production-cutover parity evidence as proof of a post-PR #44 production release; that production smoke result is not recorded in this repository.

---

# Pass 13.1a controlled mapped-build closeout

**Validation Date:** August 3, 2026

**Build:** `6111ac3d702e24baefb0a9219bcaa31fe9ef80a9`

**Immutable Cloudflare deployment:** `https://b5736fb1.portfolio-deo.pages.dev/`

**Reviewers:** Joey Wisto for supplied human evidence and approval; Codex Work Mode for agent-executed production-artifact checks

## Result

Pass 13.1a is approved and closed. Review-log rows HR-008 through HR-022 trace the controlled checks and final decision. The release gate passed or was explicitly accepted with the limitations below.

## Controlled evidence

- Artifact traceability: the Cloudflare deployment identifies commit `6111ac3d702e24baefb0a9219bcaa31fe9ef80a9`; Joey supplied Chrome-on-Windows deployment evidence.
- Core dashboard operation: the generated production artifact passed mapped load, filters, route and vehicle selection, replay, Reset, metrics, alerts, and overflow review at 1440 by 900.
- Responsive short-height coverage: 1366 by 650, 1440 by 700, 667 by 375, and 844 by 390 passed with the map present, no page-wide horizontal overflow, and reachable scrollable content.
- 200 percent zoom: Joey approved the deployed behavior for this release. The compressed layout requires horizontal scrolling and therefore does not strictly meet the original no-horizontal-scroll criterion; this limitation is accepted, not represented as a clean pass.
- Reduced motion, hidden-tab restoration, blocked MapLibre fallback, full forward and reverse keyboard traversal, deployed network health, and local artifact console health passed.
- Direct load, refresh, Back, and Forward initialization passed on the production artifact.

## Deferred nonblocking follow-up

The independent blocked-style request check (HR-016) and individual blocked-tile request check (HR-017) were removed from the Pass 13.1a release gate by Joey Wisto and deferred to automated map-resilience testing. They were not executed and are not claimed as passing. The completed blocked-MapLibre check provides representative manual coverage of total mapping-library failure, but it does not prove the two deferred failure modes.

## Approval

HR-022 records Joey Wisto's August 3, 2026 approval. No blocking defect remains for Pass 13.1a closeout.
