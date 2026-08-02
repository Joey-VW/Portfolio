# PHX Transit Pulse — Interactive Map Implementation Plan

**Created:** July 25, 2026 at 8:34 PM Arizona time  
**Status:** Completed historical implementation plan
**Target:** Replace the current schematic-only map with a real, interactive Phoenix-area basemap while preserving synthetic operational data, deterministic replay, accessibility, and explicit non-live labeling.

## Implementation outcome

The mapped experience shipped in July 2026 and was followed by route polish, publication, and the PR #44 mobile-hierarchy refinement. The public page now uses pinned MapLibre GL JS and OpenFreeMap for Phoenix-area geographic context; every operational route, stop, vehicle, alert, and metric remains fictional and deterministic. Filtering, replay, synchronized selection, accessible records, explicit scenario states, and the schematic fallback were preserved.

This file now records the decisions that guided implementation. Current status and remaining controlled QA belong in [`../roadmap.md`](../roadmap.md) and [`../validation/pass-13.1-viewport-interaction-qa-report.md`](../validation/pass-13.1-viewport-interaction-qa-report.md).

## 1. Objective

Implement an actual interactive map as the visual center of PHX Transit Pulse.

The intended result is:

> **Real Phoenix-area basemap + fictional routes, vehicles, stops, alerts, and metrics.**

The map should support pan, zoom, recentering, filtering, selection, replay updates, and operational overlays without implying that the displayed transit activity is live or provider-derived.

The visual direction remains the supplied dashboard concept:

- dark, restrained geographic context;
- high-contrast transit layers;
- map-dominant operations-center composition;
- compact controls and legend;
- route, alert, and vehicle inspection;
- persistent synthetic-data disclosure.

## 2. Historical pre-map implementation

At the time this plan was written, the map was an inline SVG schematic rendered inside `projects/phx-transit-pulse.html`. That description is retained as historical context, not as the current implementation.

Operational graphics are produced by `projects/phx-transit-pulse.js` from synthetic fixture fields such as:

- route `path` strings;
- stop `x` and `y`;
- vehicle `x` and `y`;
- alert `x` and `y`.

The current implementation already provides valuable behavior that must be preserved:

- deterministic replay;
- mode and route filters;
- route, vehicle, and alert selection;
- selected-record inspection;
- stale, very-stale, feed-error, offline, and no-data scenarios;
- synthetic-data labeling;
- an accessible route and vehicle table;
- reduced-motion handling;
- responsive layout and explicit map-unavailable states.

The map replacement should therefore be treated as a rendering-system migration, not a dashboard rewrite.

## 3. Approved evidence and data boundary

This phase remains fully synthetic.

### Allowed

- A real geographic basemap showing the Phoenix metro area.
- Fictional route geometry authored specifically for the demo.
- Fictional stop, vehicle, and alert coordinates.
- Existing synthetic metrics and replay states.
- Basemap attribution required by the selected map provider.
- A map-library dependency approved for this focused purpose.

### Not allowed in this phase

- Live Valley Metro feed requests.
- Provider API credentials.
- Captured or normalized provider replay data.
- Valley Metro route shapes, stops, vehicle records, or alert locations.
- Claims that synthetic routes or metrics reflect actual provider operations.
- Live-ingestion architecture or a server-side relay.
- Historical reliability, headway, bunching, service-gap, or on-time-performance claims.

The dashboard must continue to identify all operational content as fictional, even though the geographic backdrop is real.

## 4. Recommended technical direction

Use **MapLibre GL JS** as the leading map-renderer candidate, subject to the initial dependency and tile-service decision gate.

MapLibre is the preferred direction because the desired experience needs:

- a custom dark visual treatment;
- separate route, stop, alert, and vehicle layers;
- dynamic updates during replay;
- route and feature selection;
- filtering without reloading the map;
- control over label density and map interaction;
- future compatibility with normalized GeoJSON-style data.

The implementation should not embed Google Maps in an iframe. That would provide less styling and layer control and would make the dashboard feel visually separate from the surrounding operations interface.

### Initial map behavior

Use a restrained two-dimensional operations view:

- no 3D buildings;
- no pitch;
- no free rotation;
- modest zoom range;
- Phoenix-metro starting bounds;
- minimal place and road labels;
- route lines and vehicle markers visually dominant;
- standard attribution visible and unobstructed.

## 5. Decision gates before editing

Complete these decisions at the start of implementation.

### Gate A — Map dependency delivery

Choose one of:

1. A pinned external MapLibre JavaScript and CSS release.
2. Locally hosted MapLibre distribution files.
3. Another renderer only if repository inspection reveals a material compatibility problem.

**Default preference for the first prototype:** a pinned external release to minimize repository churn. Reconsider self-hosting before portfolio release if reliability, privacy, performance, or policy makes it preferable.

Do not introduce a package manager or build system solely for the map unless separately approved.

### Gate B — Basemap style and tile service

Evaluate a small set of providers or styles for:

- Phoenix coverage;
- dark-theme quality;
- attribution requirements;
- anonymous public use versus token requirements;
- request limits;
- expected portfolio traffic;
- Cloudflare Pages compatibility;
- cost and account requirements;
- ability to reduce label and road noise;
- fallback behavior if the service is unavailable.

Do not commit secrets to frontend code. If the chosen service requires a secret token that cannot safely be public, reject it for this phase or defer the map until an approved server-side arrangement exists.

### Gate C — Synthetic geography strategy

Approve fictional service patterns whose longitude/latitude geometry is aligned
at authoring time to OpenStreetMap road and rail infrastructure within the
Phoenix metro area.

The geometry should:

- look geographically plausible;
- remain clearly fictional;
- avoid copying provider route geometry;
- avoid matching actual route names and IDs;
- stay within a useful map viewport;
- support all current replay frames and selection states.

### Gate D — Fallback policy

Recommended approach:

- retain the existing schematic SVG during migration;
- show it if the interactive map fails to initialize or the basemap cannot load;
- keep the accessible records table available in every state;
- do not present an empty black map as a successful state.

After the interactive map is proven reliable, decide whether the full schematic renderer remains necessary or can be reduced to a simpler fallback.

## 6. Proposed implementation phases

## Phase 1 — Add geographic fixture fields

Update `data/phx-transit/synthetic/operations-replay.json` so the same fictional records can drive a real map.

### Add map metadata

Add a top-level object similar to:

```json
{
  "map": {
    "center": [-112.07, 33.45],
    "zoom": 9.5,
    "bounds": [[-112.35, 33.20], [-111.75, 33.75]],
    "bearing": 0,
    "pitch": 0
  }
}
```

Final values should be chosen through visual inspection, not copied blindly from this example.

### Add geographic route geometry

For each route, add a GeoJSON-compatible `LineString` coordinate collection:

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-112.20, 33.55],
      [-112.10, 33.49],
      [-111.98, 33.44]
    ]
  }
}
```

Retain the existing SVG `path` during the migration so the schematic fallback remains functional.

### Add geographic point coordinates

Add `longitude` and `latitude` to:

- stops;
- every vehicle in every replay frame;
- alerts that should appear on the map.

Retain `x` and `y` during the migration.

### Add optional display metadata

Where useful, add:

- `bearing`;
- marker priority;
- label visibility;
- route-layer order;
- transfer-stop flag;
- alert emphasis state.

Do not add fields that are not used by the implemented design.

### Phase 1 completion criteria

- Every visible map entity has valid fictional coordinates.
- All coordinates fall within the approved Phoenix-area bounds.
- Replay frames move vehicles plausibly.
- The current SVG map still renders from the legacy fields.
- `providerData` remains `false`.
- Fixture documentation explicitly distinguishes fictional transit operations
  and service patterns from their OpenStreetMap-aligned geographic geometry.

## Phase 2 — Introduce an isolated map adapter

Add a focused mapping module rather than placing MapLibre-specific logic throughout the existing dashboard renderer.

Recommended file:

```text
projects/phx-transit-pulse-map.js
```

### Adapter responsibilities

Expose a small interface such as:

```javascript
initMap(options)
setMapData({ routes, stops, alerts, vehicles })
setMapFilters({ mode, routeId })
setMapSelection(selection)
setMapScenario(scenario)
resizeMap()
resetMapView()
destroyMap()
```

The exact API may vary after code inspection, but the separation should remain.

### Adapter constraints

- The dashboard state remains owned by `phx-transit-pulse.js`.
- The map adapter renders data and reports user selections.
- The map adapter does not calculate KPIs.
- The map adapter does not fetch synthetic fixtures independently.
- The map adapter does not introduce its own replay timer.
- The adapter must tolerate missing route, trip, stop, mode, and timestamp context.
- Initialization failure must be reported to the main dashboard so it can activate the fallback.

### Phase 2 completion criteria

- The map can initialize independently.
- The main dashboard can send one complete frame to it.
- Route, vehicle, and alert click events return the same selection IDs used by the existing inspector.
- No current KPI, alert list, route table, or replay logic is duplicated.

## Phase 3 — Replace the inline map shell

Update `projects/phx-transit-pulse.html`.

### Structural changes

Replace the current inline SVG as the primary surface with:

```html
<div class="phx-map-canvas" data-interactive-map></div>
```

Preserve:

- map toolbar;
- mode/filter display;
- legend;
- synthetic-map disclosure;
- unavailable-state overlay;
- accessible record drawer.

Place the existing SVG in a fallback container during the migration:

```html
<div class="phx-map-fallback" data-map-fallback hidden>
  <!-- existing schematic SVG -->
</div>
```

### Script loading

Load the selected map dependency and the new adapter before `phx-transit-pulse.js`, or use another verified order that guarantees the adapter is available before dashboard initialization.

### Phase 3 completion criteria

- The page has one clearly defined primary map container.
- The fallback is not visible during a healthy map session.
- The map panel still has a meaningful accessible name and description.
- Synthetic-data disclosure remains visible near or within the map.
- Basemap attribution remains visible.

## Phase 4 — Build operational map layers

Represent the synthetic data as GeoJSON sources and MapLibre layers.

### Recommended layer order

1. Basemap.
2. Route-muted underlay, if needed.
3. Visible route lines.
4. Alert-affected route emphasis.
5. Stops.
6. Alert markers.
7. Vehicle markers.
8. Selection halo or selected-feature emphasis.
9. Optional labels.

### Route layers

Support:

- color by fictional route;
- muted nonmatching routes;
- thicker selected route;
- dashed or emphasized alert-affected route;
- wide invisible hit target for pointer selection;
- stable layer ordering across replay frames.

### Stop layers

Support:

- standard stop;
- transfer stop;
- alert-affected stop;
- label visibility only at suitable zoom levels;
- no assumption that every vehicle has a current stop.

### Vehicle layers

Support:

- bus, light rail, and unknown mode;
- fresh, stale, and very-stale states;
- selected vehicle halo;
- optional bearing;
- visible position-only vehicles;
- valid zero speed and missing enrichment states.

Use map layers rather than one DOM marker per vehicle unless implementation testing proves that DOM markers are simpler and remain performant.

### Alert layers

Support:

- severity differentiation with icon plus color;
- selected-alert emphasis;
- affected route and stop highlighting;
- missing or non-geographic alerts remaining available in the alert list even when they cannot be placed on the map.

### Phase 4 completion criteria

- Filters affect map layers and non-map panels consistently.
- Selection is synchronized between map, alert list, route table, inspector, and accessible records.
- Stale and very-stale vehicles are never styled as current movement.
- Position-only vehicles remain visible and explicitly unidentified.
- Alert selection highlights all affected fictional route and stop features.

## Phase 5 — Connect replay and interaction

Refactor the current `renderMap(frame)` path so it delegates interactive-map updates to the adapter.

### Replay update behavior

On each frame:

- update vehicle point coordinates;
- update alert features if the frame changes them;
- update affected-route and affected-stop state;
- preserve the current camera position unless the user explicitly resets it;
- preserve a valid selection;
- clear a selection only when the selected record is no longer available under the current filters or scenario.

### Motion behavior

Default motion may smoothly interpolate short vehicle movements if it remains restrained.

Under `prefers-reduced-motion`:

- update vehicle positions without animated interpolation;
- disable pulsing route effects;
- avoid automatic camera movement.

Replay must never automatically pan or zoom on every frame.

### Map controls

Provide:

- zoom in;
- zoom out;
- reset/recenter to the fictional network;
- optional layer toggle only if it adds clear value.

Do not add geolocation. The dashboard is about the network, not the viewer's location.

### Phase 5 completion criteria

- Play, pause, next, previous, restart, and timeline scrubbing update the map.
- Filters update the map without reinitializing it.
- Reset dashboard view also resets map camera and map selection.
- User pan and zoom are not overwritten by replay.
- Reduced-motion behavior is visibly calmer.

## Phase 6 — Preserve accessibility

A canvas/WebGL map cannot provide the same native keyboard focus behavior as the current SVG feature elements. The accessible experience must therefore be deliberately preserved outside the canvas.

### Required accessible paths

- Mode and route filters remain native controls.
- Alert cards remain keyboard-operable.
- Route rows remain keyboard-operable.
- The equivalent route and vehicle records table remains complete.
- The inspector remains available for keyboard-selected records.
- A concise live region announces selection and scenario changes.
- The map has a useful text description that identifies it as a visual representation.
- Map failure does not remove access to operational records.

### Recommended enhancement

Add a compact, keyboard-operable “Map records” control near the map toolbar:

- select a visible route, vehicle, or alert;
- focus or highlight it on the map;
- populate the existing inspector.

This provides keyboard users with map-equivalent selection without pretending individual WebGL features are natively tabbable.

### Phase 6 completion criteria

- All information available only through map interaction is also reachable through standard controls or records.
- Keyboard-only users can select routes, vehicles, and alerts.
- Screen-reader users receive meaningful scenario, selection, and availability announcements.
- The accessible table remains synchronized with filters and replay.

## Phase 7 — Visual integration

Update `projects/phx-transit-pulse.css` so the basemap feels native to the dashboard.

### Styling goals

- Dark geographic context with low visual noise.
- Higher-contrast transit routes and markers.
- Minimal map chrome.
- Compact controls integrated into the map toolbar.
- Clear attribution without competing with the dashboard legend.
- Selected and alert-affected states visible without excessive glow.
- Map remains the dominant center panel.
- No light rectangular tile seams or provider-default styling that conflicts with the dashboard.

### Responsive behavior

Desktop:

- map remains the primary center panel;
- right rail and KPI column remain visible at the target dashboard widths.

Tablet:

- map remains prominent;
- KPI and right-rail content may reorganize around it.

Mobile:

- map uses a stable, useful aspect ratio;
- controls wrap or condense;
- panels stack;
- no horizontal page overflow;
- map gestures do not trap normal page scrolling unnecessarily.

### Phase 7 completion criteria

- The result reads as one coherent operations console.
- Map labels remain secondary to operational layers.
- Controls remain usable at 200% zoom.
- The map does not force horizontal scrolling at supported widths.

## Phase 8 — Fallbacks and explicit states

Test and implement the following states:

### Map library unavailable

- Show the schematic fallback.
- Keep filters, replay, alerts, route signals, inspector, and accessible table functional.
- Display a concise message that the interactive basemap is unavailable.

### Tile/style request failure

- Avoid showing a blank successful state.
- Prefer the schematic fallback after a bounded initialization failure.
- Preserve the original synthetic timestamps and scenario state.

### Offline mode

- Use the existing explicit offline scenario.
- Do not relabel cached or synthetic data as live.
- The fallback schematic may continue to show fictional records if the scenario contract allows it.

### No-data or feed-error scenario

- Keep the basemap or fallback context visible only if it does not imply active service.
- Show the existing unavailable-state explanation.
- Do not convert an empty result into “zero active service.”

### Phase 8 completion criteria

- Blocking the map dependency or tile host produces a usable fallback.
- No console exception leaves the dashboard partially initialized.
- Explicit scenario vocabulary remains unchanged.

## 7. Expected file changes

### Required

```text
projects/phx-transit-pulse.html
projects/phx-transit-pulse.css
projects/phx-transit-pulse.js
projects/phx-transit-pulse-map.js
data/phx-transit/synthetic/operations-replay.json
```

### Likely documentation updates after decisions are accepted

```text
docs/phx-transit/architecture-study.md
docs/phx-transit/data-contract.md
docs/phx-transit/roadmap.md
tools/README.md or a focused PHX Transit map note
```

### Optional

```text
assets/vendor/maplibre/...
data/phx-transit/synthetic/map-style.json
tools/phx-transit/validate_synthetic_map.py
```

Only add optional files when the chosen dependency and style strategy require them.

## 8. Validation plan

## Automated and structural checks

- Validate JSON syntax.
- Validate every route geometry as a nonempty `LineString`.
- Validate every mapped point as finite longitude/latitude within approved bounds.
- Confirm route, stop, vehicle, alert, and selection IDs remain stable.
- Confirm no provider identifiers or source URLs were introduced.
- Confirm `providerData: false`.
- Run existing project and registry validators.
- Review `git diff` for accidental dependency, credential, or fixture changes.

A small fixture validator is recommended if geographic coordinates become a durable part of the project.

## Functional browser QA

Verify:

- initial map load;
- pan and zoom;
- recenter/reset;
- play and pause;
- previous and next frame;
- timeline scrubbing;
- bus, rail, and all-mode filters;
- individual route filter;
- route selection;
- vehicle selection;
- alert selection;
- inspector synchronization;
- selection clearing after incompatible filters;
- all demonstration scenarios;
- fallback activation;
- no console errors.

## Accessibility QA

Verify:

- skip link;
- keyboard-only controls;
- keyboard route and alert selection;
- keyboard map-record selection;
- accessible table equivalence;
- screen-reader labels and announcements;
- 200% zoom;
- reduced motion;
- visible focus;
- non-color status communication.

## Responsive QA

At minimum:

- 1440 × 900;
- 1280 × 720;
- 1024 × 768;
- 768 × 1024;
- 430 × 932;
- 390 × 844;
- 375 × 812;
- 360 × 800.

Also test the Cloudflare preview rather than relying only on local serving.

## Failure-mode QA

Test with:

- map-library request blocked;
- tile/style host blocked;
- offline network after initial load;
- slow network;
- WebGL unavailable or initialization rejected;
- empty geographic feature collection;
- malformed synthetic coordinate;
- current, stale, very-stale, feed-error, offline, and no-data scenarios.

## 9. Acceptance criteria

The map phase is complete when:

- [ ] A real Phoenix-area interactive basemap is the primary map surface.
- [ ] Every operational route, stop, alert, vehicle, and metric remains synthetic.
- [ ] Fictional route and point geometry uses geographic coordinates and does not copy provider data.
- [ ] Replay updates vehicle positions without resetting the user's camera.
- [ ] Mode and route filters remain synchronized across map and dashboard panels.
- [ ] Route, alert, and vehicle selections synchronize with the inspector.
- [ ] Fresh, stale, very-stale, unknown-mode, position-only, and alert-affected states remain explicit.
- [ ] Map initialization or tile failure produces a usable fallback rather than a blank surface.
- [ ] The accessible record experience remains complete and keyboard-operable.
- [ ] Reduced-motion behavior avoids animated map movement and pulsing.
- [ ] Basemap attribution is visible and accurate.
- [ ] No key, token intended to be secret, provider feed, or provider-derived fixture is committed.
- [ ] Existing project validators pass.
- [ ] Human QA passes at the agreed viewport matrix and 200% zoom.
- [ ] The Cloudflare preview behaves correctly with no material console errors.

## 10. Recommended low-usage implementation sequence

This work is substantial but can be divided into bounded subphases.

### Subphase A — Map feasibility and decision record

- Inspect `AGENTS.md`, headers, deployment constraints, and current page loading.
- Compare the small set of map dependency and tile/style options.
- Lock Gates A–D.
- Document the accepted dependency, style, attribution, and fallback decisions.

This is suitable for normal ChatGPT-guided implementation and browser testing.

### Subphase B — Geographic fixture migration

- Add fictional geographic geometry.
- Add validation.
- Preserve the schematic fields.
- Confirm all replay frames and scenarios.

This is suitable for normal ChatGPT-guided PowerShell edits unless the fixture transformation becomes large or repetitive.

### Subphase C — Map adapter and layer implementation

- Add the map module.
- Replace primary SVG rendering.
- Connect sources, layers, filters, selections, and replay.

This is the best candidate for Codex heavy-lifting because it spans HTML, CSS, JavaScript, fixture contracts, events, and failure handling.

### Subphase D — Accessibility, responsive polish, and fallback QA

- Add keyboard-equivalent map record selection.
- Complete fallback behavior.
- Perform viewport, reduced-motion, network-failure, console, and Cloudflare preview QA.
- Update durable documentation and roadmap status.

This is suitable for normal ChatGPT-guided QA and targeted edits.

## 11. Risks and mitigations

### Tile-provider limits or terms

**Risk:** A visually suitable service may require credentials, impose limits, or disallow the intended use.

**Mitigation:** Resolve this before implementation and reject any option requiring an exposed secret.

### Dependency failure

**Risk:** An external library or style request could leave the map blank.

**Mitigation:** Use pinned dependencies, explicit initialization timeouts, and the existing schematic fallback.

### Synthetic routes appear authoritative

**Risk:** Real geography can make fictional routes look official.

**Mitigation:** Keep prominent synthetic labeling, fictional route names, a map caption, and the independent-project disclaimer.

### Accessibility regression

**Risk:** Canvas features are not individually keyboard-focusable like the current SVG elements.

**Mitigation:** Preserve route rows, alert controls, accessible records, inspector behavior, and add a keyboard-operable map-record selector.

### Responsive gesture conflict

**Risk:** Touch map gestures can interfere with page scrolling.

**Mitigation:** Use a bounded map height, conservative interaction settings, and mobile testing.

### Fixture duplication during migration

**Risk:** Maintaining both geographic and schematic coordinate systems can drift.

**Mitigation:** Treat dual fields as transitional, validate them, and make a later decision to remove or programmatically derive fallback coordinates.

### Scope creep into live ingestion

**Risk:** The map may tempt the implementation toward provider shapes or live vehicles.

**Mitigation:** Keep this pass explicitly synthetic and do not modify the live-ingestion gate.

## 12. Documentation disposition

This planning document belongs in ChatGPT project sources immediately.

After the map decisions are accepted:

- durable renderer, tile/style, attribution, fallback, and accessibility decisions should be incorporated into `docs/phx-transit/architecture-study.md`;
- geographic fixture fields should be reflected in the data contract or a synthetic-fixture contract note;
- roadmap status should record the new focused map subphase;
- temporary comparison notes and provider-option research do not need to remain permanently in the repository unless they explain a lasting decision.

## 13. Recommended next action

Begin with **Subphase A — Map feasibility and decision record**.

The first implementation chat should inspect the current repository constraints, select the map dependency and basemap strategy, verify that the choice works on Cloudflare Pages without a secret, and document the accepted fallback before any fixture or renderer edits begin.
