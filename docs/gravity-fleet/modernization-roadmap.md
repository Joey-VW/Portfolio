# Gravity Fleet Modernization Roadmap

## Current status

* PR #13, `Optimize Gravity Fleet for polished mobile play`, is merged history and remains the successful mobile-prototype reference.
* PR A / PR #15, `Extract Gravity Fleet shared game core`, is merged. Its implementation commit is `46dfa0ba05af90886506e779687786103030abc9`.
* PR B / PR #16, `Add Gravity Fleet fixed-step runtime`, is merged. Its implementation commit is `e8a46eb6571df4b8d1b885aad3c41b5c6cca0e05`.
* Automated fixed-step validation is complete with `node tools/validate_gravity_fleet.js`.
* Human Checkpoint 1 was completed July 22, 2026 on current `main` after PRs #15, #16, and #17 using Chrome on Windows 10 and Safari on an iPhone 14 Pro Max.
* PR #18, `Introduce Gravity Fleet camera and viewport system`, merged July 23, 2026 UTC through commit `8041c60f05ba9f99979bc968d8ac67af6231c68e` and completes Pass 10.3 repository work.
* PR #19, `Build Gravity Fleet mobile shell and touch controls`, has completed Passes 10.4-10.5 implementation and QA on `gravity-fleet-mobile-shell-touch-controls`; merge is pending.
* Automated validation, Cloudflare-preview desktop QA, and portrait/landscape QA on an iPhone 17 Pro Max passed. Pass 10.6 is next; later work remains unstarted.

## North star

Transform Gravity Fleet Lab into one shared game with two polished presentations:

* A restored, high-fidelity desktop experience.
* A purpose-built mobile experience inspired primarily by `docs/gravity-fleet/reference/preferred-mobile-layout.png`.
* Shared levels, physics, AI, combat, scoring, telemetry, analytics, and saved-run compatibility.
* Separate cameras, input adapters, interface compositions, and rendering-quality policies.
* No framework migration unless profiling later proves that the renderer - not the current architecture - is the remaining limitation.

The preferred mobile concept establishes the target hierarchy: compact match status, a dominant battlefield, explicit Launch and Wormhole controls, a nearby wormhole-clear action, Fleet Strength and System Mix charts, and fewer low-value interface elements.

---

# 1. Repository and pull-request strategy

## 1.1 PR #13 as merged historical mobile-prototype evidence

PR #13, `Optimize Gravity Fleet for polished mobile play`, is merged into `main`; it is no longer an open draft or a replacement candidate. Commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` remains the documented successful mobile playthrough reference.

Its implementation is not the finished adaptive presentation. The recorded limitations - desktop smoothness concerns and a landscape canvas surrounded by independently positioned mobile overlays - remain the reason for later camera, shell, touch, telemetry, and page-layout work. Preserve the historical evidence and its thermal/playthrough notes; do not rewrite history to make the sequence appear cleaner.

## 1.2 Reference points and evidence limitation

### Desktop reference

`121c1307517e0f24d02d4c5ce24c989e6bff96b3` is a historical desktop reference candidate, not a verified preferred desktop baseline. `docs/gravity-fleet/baseline-notes.md` explicitly records that no captured desktop performance trace or runnable historical checkout was available for positive comparison. This limitation is documented, not resolved by assumption.

### Mobile reference

Commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` remains the successfully tested mobile reference. Its recorded device, browser, orientation, approximate match duration, thermal observation, interaction notes, and saved-run result remain useful history, but do not substitute for post-PR-B validation.

## 1.3 Current sequencing

Current work starts from latest `main`. PR A / PR #15, PR B / PR #16, and PR #18 / Pass 10.3 are merged; do not recreate or rebase their historical branches. Checkpoint 1 is recorded, and Passes 10.4-10.5 use the focused branch:

```text
gravity-fleet-mobile-shell-touch-controls
```

Keep unrelated shared-file changes out of Gravity Fleet pull requests. Deliver later work in coherent, behavior-preserving stages.

## 1.4 Avoid a single rewrite commit

The modernization should be delivered through behavior-preserving stages. Each stage must leave the game runnable and reviewable.

Do not mix all of the following into one implementation pass:

* Core extraction.
* Runtime replacement.
* Camera rotation.
* Mobile redesign.
* Telemetry redesign.
* Header changes.
* Post-match changes.

---

# 2. Global invariants

The following must remain shared across desktop and mobile:

* Level definitions and starting conditions.
* Planet movement and orbital paths.
* Launch-field calculations.
* Wormhole range and influence rules, except an explicitly documented mobile lifespan policy.
* AI behavior.
* Ship movement.
* Combat resolution.
* Production rates.
* Victory and defeat conditions.
* Score calculations.
* Telemetry event meanings.
* Analytics calculations.
* Saved-run schema and existing local history.

The following may differ by presentation:

* Camera rotation and scale.
* Canvas viewport composition.
* Gesture mapping.
* HUD arrangement.
* Control placement.
* Drawer direction and dimensions.
* Chart dimensions.
* Effect density.
* Trail rendering.
* Canvas backing resolution.
* Render cadence.
* Information density.
* Intro-page composition.
* Post-match presentation.

## Overall acceptance standard

Given the same initial state, random seed, elapsed simulation steps, and command sequence, desktop and mobile must produce the same gameplay state, outcome, score, and telemetry values.

---

# 3. Proposed implementation passes

## Pass 10.0 - Baselines, contracts, and regression harness

**Status: complete for repository-supported work through PR #15.** The baseline and contract record is in `docs/gravity-fleet/baseline-notes.md` and `docs/gravity-fleet/pr-a-contract.md`; fixtures and the validator are committed under `tools/fixtures/gravity-fleet/` and `tools/validate_gravity_fleet.js`.

* [x] Document the known-good mobile reference and the desktop-reference limitation.
* [x] Inventory responsibilities and record gameplay invariants and compatibility boundaries.
* [x] Add seedable validation, a deterministic command fixture, and a synthetic saved-run compatibility fixture.
* [x] Add development-only diagnostics that are hidden from normal visitors.
* [x] Preserve normal gameplay behavior and randomness outside validation.

The stop condition is satisfied through explicit documentation of the unresolved historical desktop baseline. It does not establish historical desktop performance values.

---

## Pass 10.1 - Extract the shared game core

**Status: complete through PR #15 and commit `46dfa0ba05af90886506e779687786103030abc9`.** `games/gravity-fleet/core.mjs` and `games/gravity-fleet/levels.mjs` provide the shared level and gameplay boundary; the existing desktop and mobile presentation adapters remain in `games/gravity-fleet-lab.js`.

* [x] Extract shared level/core logic, including simulation, AI, combat, scoring, telemetry production, and run serialization.
* [x] Provide presentation-neutral command handling for launch, wormhole, pause, resume, reset, and cancellation.
* [x] Preserve saved-run compatibility and deterministic validation.
* [x] Verify the engine boundary has no device, viewport, DOM, or canvas dependencies.
* [x] Retain current desktop and mobile compatibility through the existing presentation adapters.
* [x] Keep implementation scoped to Gravity Fleet without unrelated shared-file changes.

The Node validator covers levels, deterministic commands, controlled win/loss paths, telemetry consistency, saved-run readability, serialization, and the presentation-neutral engine boundary.

---

## Pass 10.2 - Replace the clock and restore desktop quality

**Status: implementation and automated validation complete through PR #16 and commit `e8a46eb6571df4b8d1b885aad3c41b5c6cca0e05`; Human Checkpoint 1 completed July 22, 2026.** `docs/gravity-fleet/pr-b-runtime.md`, `games/gravity-fleet/runtime.mjs`, `games/gravity-fleet/performance.mjs`, and the updated validator record the shipped runtime work.

### Implementation and automated validation - complete

* [x] Run a shared 60-step-per-second fixed simulation with separate render scheduling.
* [x] Cap catch-up work, suspend hidden-page work, and begin a fresh timing epoch on restoration and relevant timing transitions.
* [x] Provide Desktop High, Mobile Balanced, and Reduced Motion profiles.
* [x] Control HUD and telemetry schedules independently.
* [x] Prove deterministic equivalence under 30 Hz, 60 Hz, and 144 Hz callback schedules.
* [x] Provide runtime diagnostics and automated saved-run, telemetry, win/loss, and engine-boundary checks.

### Human Checkpoint 1 - July 22, 2026

**Build tested:** current `main` after PRs #15, #16, and #17  
**Desktop:** Chrome on Windows 10  
**Mobile:** iPhone 14 pro max, Safari

* Desktop completes a match through analytics.
* Desktop trails and effects look intact.
* Mouse interactions remain accurate.
* No sustained or recurring frame-pacing failure is observed.
* Live telemetry and final analytics work.
* The runtime debug view does not reveal an obvious persistent failure.
* Mobile starts and remains playable.
* Launch and wormhole touch interactions work.
* Tab restoration and orientation changes do not cause a large simulation jump or stuck input.
* Mobile temperature remains acceptable for the test duration.
* node tools/validate_gravity_fleet.js passes.

---

## Pass 10.3 - Introduce the camera and viewport system

**Size:** Large
**Risk:** High
**Purpose:** Solve portrait composition correctly instead of shrinking a landscape canvas.

**Status: merged through PR #18 on July 23, 2026 UTC at `8041c60f05ba9f99979bc968d8ac67af6231c68e`; Cloudflare preview and physical-device visual evidence remain pending.** `games/gravity-fleet/camera.mjs`, the viewport adapter in `games/gravity-fleet-lab.js`, `docs/gravity-fleet/pr-c-camera.md`, and the expanded validator record the camera contract.

### Camera responsibilities

Create a camera abstraction that owns:

* World-to-screen transformation.
* Screen-to-world transformation.
* Rotation.
* Scale.
* Translation.
* Tactical viewport dimensions.
* Safe gameplay rectangle.
* Orientation mode.
* Resize handling.

### Desktop camera

The first camera should be an identity-equivalent desktop camera that produces the existing desktop composition.

This proves the abstraction before portrait rotation is introduced.

### Portrait mobile camera

For portrait mobile:

* Rotate the game world 90 degrees counterclockwise.
* Keep all world coordinates unchanged.
* Position Cyan’s starting side toward the bottom.
* Fit the rotated world into the reserved tactical rectangle.
* Keep HUD text, buttons, and charts upright.
* Use the inverse camera matrix for touch hit testing.
* Lock the camera orientation for the duration of the match.
* Do not continuously rotate to follow the moving Cyan planet.

### Landscape mobile camera

For landscape:

* Use the native landscape world orientation.
* Fit the world into the available tactical rectangle.
* Do not rotate text or finished chart elements.
* Provide orientation-specific tactical framing. Pass 10.4 supplies the dedicated landscape shell composition.

### Safe gameplay rectangle

The camera must receive a tactical rectangle after reserving:

* Safe-area insets.
* Top match HUD.
* Bottom mode controls.
* Telemetry handle.
* Necessary edge spacing.

This is what prevents major interface controls from covering planets.

### Responsive behavior

Recalculate safely when:

* The mobile browser chrome changes available height.
* The phone rotates.
* The visual viewport changes.
* The game container resizes.
* The device enters or exits fullscreen-like presentation.

Cancel active gestures before applying a new camera transform.

### Development visualization

Add a temporary camera-debug mode showing:

* Tactical rectangle.
* World bounds.
* Camera center.
* Safe margins.
* Pointer world coordinates.
* Screen coordinates.
* Rotation and scale.

### Acceptance criteria

* [ ] Desktop camera produces no observable gameplay-layout regression. Automated identity mapping passes; preview review remains pending.
* [ ] Portrait uses substantially more of the phone’s vertical area. The full-height backing surface and portrait tactical framing are implemented; preview review remains pending.
* [x] Cyan begins toward the bottom in portrait.
* [x] All worlds remain visible without distortion.
* [x] Touch hit testing remains accurate near every edge and corner through the tested inverse transform.
* [x] World labels, DOM text, controls, and charts remain upright by construction.
* [x] Orientation and viewport events cancel active pointer state before a transform update.
* [x] The camera never changes gameplay coordinates or telemetry.

---

## Pass 10.4 - Build the dedicated mobile match shell

**Size:** Large
**Risk:** Medium–High
**Purpose:** Replace independently fixed overlays with a composed game interface.

**Status: implementation and QA complete in PR #19; merge pending.** Cloudflare-preview desktop QA and iPhone 17 Pro Max portrait and landscape QA passed. The CSS Grid shell owns compact HUD, measured tactical viewport, command dock, and telemetry host regions. It is the default mobile presentation. `?gravityDebug=1&gravityMobileShell=legacy` restores the retained shell for QA, while `?gravityDebug=1&gravityMobileShell=modern` selects the replacement explicitly. DOM placement, page scrolling, focus, inert state, and viewport listeners are restored on exit or readiness rollback. See `docs/gravity-fleet/mobile-shell-touch-controls.md` for the implementation contract.

The current mobile implementation uses a viewport-fixed stage plus separate fixed HUD, mode controls, return action, backdrop, and drawer.

The screenshots show these regions colliding in both portrait and short landscape layouts.

### New shell regions

Use one mobile match-shell layout:

```text
Mobile match shell
├── Top HUD
├── Tactical viewport
├── Bottom command dock
└── Telemetry handle / drawer host
```

The major regions must reserve space from one another.

### Portrait composition

#### Top HUD

Include only:

* Mission or level.
* Match timer.
* Compact Cyan/Red/Orange status.
* Pause.
* Telemetry/menu trigger.

Move the public FPS display to development mode.

#### Tactical viewport

* Rotated portrait camera.
* Maximum available remaining space.
* No permanent instructional paragraph over the game.
* Brief transient command feedback only.

#### Bottom command dock

* Large Launch.
* Large Wormhole.
* Smaller Clear Wormhole.
* Obvious selected state.
* Minimum comfortable touch targets.

#### Telemetry handle

Use a compact persistent handle rather than a large badge over the map.

### Landscape composition

* Single-row or very compact top HUD.
* Wide tactical viewport.
* Mode controls at a side or compact bottom corner.
* Telemetry opens as a side sheet where practical.
* Return/setup control remains reachable without covering the world.

### Pause

Add a real simulation pause:

* Simulation stops.
* AI stops.
* Timers stop.
* Telemetry sampling stops.
* The interface remains responsive.
* Resume does not introduce a large `dt`.

### Migration strategy

Build the new shell behind a development flag while retaining the current working mobile shell.

Cut over only after:

* Portrait play succeeds.
* Landscape play succeeds.
* Setup, pause, drawer, outcome, and return flows work.
* No black-screen regression exists.

### Acceptance criteria

* [x] No major controls overlap the tactical viewport’s reserved region.
* [x] Portrait no longer contains the current large empty lower area.
* [x] Landscape remains usable with short viewport height.
* [x] Browser safe areas are respected.
* [x] Pause genuinely stops the simulation. Deterministic validation confirms no engine, elapsed-time, or telemetry-timeline advancement and a fresh timing epoch on Resume.
* [x] Return to setup restores the page reliably.
* [x] No stale fixed mobile elements remain behind the new shell.
* [ ] The old mobile shell can be removed after cutover. Parity is proven; retain it temporarily as a development rollback path until Pass 10.8 cleanup.

---

## Pass 10.5 - Replace mobile touch mechanics

**Size:** Medium–Large
**Risk:** Medium
**Purpose:** Make touch commands deliberate and learnable.

**Status: implementation and QA complete in PR #19; merge pending.** Launch and Wormhole share one mutually exclusive mode state and route mobile pointers through the inverse camera transform. The selected configuration is a 0.75-second preparation window, 2.5 seconds after first eligible Cyan transit, and a 10-second absolute maximum. The validator covers activation, expiry, pause cancellation, and Clear. A comparative browser playtest was not performed because no launchable browser is available in the implementation environment.

The game already has drag-based wormhole functions, but mobile Wormhole mode currently routes through a two-tap fallback.

### Mobile mode system

Launch and Wormhole must be mutually exclusive:

* Selecting Launch deactivates Wormhole.
* Selecting Wormhole deactivates Launch.
* The selected mode is visually and programmatically exposed.
* Switching modes cancels an incomplete gesture safely.

### Launch gesture

* Touch an owned Cyan world.
* Drag to gather and aim.
* Release to launch.
* Show live selection and trajectory feedback.
* Cancel on pointer cancellation, pause, drawer open, orientation change, or mode change.

### Wormhole gesture

Mobile creation must become drag-only:

1. Select Wormhole.
2. Touch the entrance.
3. Drag toward the exit.
4. Show:

   * Entrance.
   * Exit.
   * Direction.
   * Maximum range.
   * Valid/invalid state.
5. Release to create.
6. Too-short gestures cancel clearly.

Remove two-tap placement as the primary mobile behavior.

### Clear Wormhole

Add a dedicated Clear/Collapse control:

* Disabled when no Cyan wormhole exists.
* Collapses the current Cyan wormhole immediately.
* Never doubles as a placement action.
* Provides brief visual confirmation.

### Wormhole lifespan experiment

The current player default is 30 seconds.

Implement lifespan as configuration rather than hard-coding it into presentation logic.

Recommended first prototype:

* A short preparation window after placement.
* The active countdown begins when the first eligible Cyan ship enters.
* Collapse roughly 2–3 seconds after activation.
* A longer absolute maximum prevents an unused wormhole from remaining forever.
* A visible ring communicates remaining life.
* Clear remains available.

The retained configuration passed device QA. Comparative playtesting of at least two configurations remains deferred.

### Tutorial updates

Replace mobile instructions with visual demonstrations of:

* Launch drag.
* Wormhole drag.
* Clear wormhole.
* Pause.
* Open telemetry.

Desktop instructions must continue to describe mouse controls.

### Acceptance criteria

* [x] Tap-tap wormhole placement no longer occurs on mobile.
* [x] Launch and Wormhole modes cannot both be active.
* [x] Drag previews remain accurate through the camera transform.
* [x] Clear Wormhole is discoverable and reliable.
* [x] Wormhole lifespan is visible and understandable.
* [x] Pointer cancellation never leaves a stuck launch or wormhole state in the engine command lifecycle.
* [x] Desktop mouse behavior remains unchanged.
* [x] The tutorial copy matches the implemented mobile and desktop controls.

### Human Checkpoint 2 - July 23, 2026

**Build tested:** PR #19 Cloudflare preview after the mobile tutorial illustration correction

**Desktop:** Desktop browser review

**Mobile:** iPhone 17 Pro Max

* Desktop layout and controls passed.
* Portrait and landscape mobile layouts passed.
* Launch, Wormhole, wormhole lifespan, Clear Wormhole, Pause/Resume, and input cancellation passed.
* Tutorial wording passed, and the mobile Launch illustration was corrected to start from the owned Cyan planet.
* Shell startup, rendering, orientation, and return flows completed without a black screen or stuck input.

---

## Pass 10.6 - Redesign live telemetry and post-match analytics

**Size:** Large
**Risk:** Medium
**Purpose:** Preserve Gravity Fleet’s analytical identity without crowding the phone.

The current drawer contains six metrics and an event feed but no charts.

The current runtime also deliberately defers full chart redraws during an active mobile match.

### Telemetry projection layer

Create one structured live-telemetry view model used by:

* Desktop live telemetry.
* Mobile HUD.
* Mobile drawer.
* Outcome summary.
* Full analytics.
* Saved-run rendering.

No surface should independently recalculate gameplay totals.

### Mobile HUD

Always visible:

* Timer.
* Cyan fleet or ship strength.
* Cyan worlds.
* Rival status.
* Active command mode.

Visible only when relevant:

* Wormhole countdown.
* Star-control change.
* Launch confirmation.

### Mobile telemetry drawer

Use the preferred concept’s hierarchy.

#### Fleet Strength over Time

* Compact Cyan/Red/Orange line chart.
* Main visual in the drawer.

#### System Mix

* Compact donut chart.
* Controlled-world share.
* Small faction legend.

#### Tactical metrics

Use compact label/value rows or a two-column grid:

* Largest launch.
* In flight.
* Deep-space fights.
* Ship transits.
* Star control.
* Wormholes, if space permits.

#### Actions

* Resume/Close.
* Reset.
* Choose level.

Reset and Choose level must remain visually secondary.

### Event feed

Remove it from the primary drawer.

Permitted alternatives:

* One “latest event” line.
* An optional secondary Log disclosure.
* Post-match event timeline.
* Development mode.

### Chart scheduling

* Drawer closed: no chart redraw.
* Drawer opening: draw immediately.
* Drawer open: update approximately once per second.
* Drawer closing: stop chart redraws.
* Match paused or page hidden: stop sampling.
* Match ended: render final chart state.

### Landscape drawer

Prefer a side sheet in landscape so the battlefield is not covered by a tall bottom panel.

### Post-match summary

Replace the current vertical parade of full-width KPI cards with:

#### Result strip

* Outcome.
* Score.
* Duration.

#### Compact highlight grid

* Planets captured.
* Ships destroyed.
* Largest launch.
* Ship transits.
* Wormholes.
* Peak advantage.

#### Analytical explanation

* Fleet-strength chart.
* System-control chart.
* Most important turning point.
* Concise run insight.

#### Detailed statistics

Place lower-priority metrics under an expandable “All match statistics” region.

### Acceptance criteria

* [ ] Fleet Strength is available live on mobile.
* [ ] System Mix is available live on mobile.
* [ ] Charts do not render continuously while hidden.
* [ ] The event feed no longer consumes the primary drawer.
* [ ] Landscape telemetry remains usable.
* [ ] Outcome, score, and duration are visible together on mobile.
* [ ] Post-match metrics no longer require one large card per value.
* [ ] Desktop live and post-match analytics retain their existing depth.
* [ ] Desktop and mobile display the same underlying telemetry totals.

---

## Pass 10.7 - Condense the Gravity page and stabilize the shared header

**Size:** Medium
**Risk:** Medium because `styles.css` is shared
**Purpose:** Fix the surrounding page without mixing it into the game engine.

### Header

The shared responsive rule currently permits wrapping below 980 pixels and gives the navigation a full-width row.

Create stable header modes:

#### Full

* Brand identity.
* Go back.
* All projects.

#### Compact single-row

* Compact back action.
* Centered JW mark or concise identity.
* One compact project/menu action.
* No second row.

#### Active match

* Hide the portfolio header.
* Use only the match-level return control.

Use component-space behavior where practical rather than adding many isolated viewport exceptions.

### Hero actions

The shared small-screen hero rule currently creates a three-column grid and keeps button text on one line, even though Gravity Fleet has two actions.

For Gravity Fleet:

* Use a two-column action layout when it fits.
* Stack at the narrowest widths.
* Allow safe text wrapping.
* Keep approximately 44-pixel touch targets.
* Avoid altering unrelated project heroes unintentionally.

### Hero content

Mobile initial view should contain:

* Eyebrow.
* Gravity Fleet Lab.
* One concise value statement.
* Play.
* View analytics.
* Collapsed “How to play” disclosure.

Move the full six-step mission briefing out of the first mobile viewport.

### Active-match transition

When entering the mobile match:

* Portfolio page content stops participating in active layout.
* The game shell owns the visual viewport.
* Returning restores the previous document state and focus.
* Browser Back remains predictable.

### Debug controls

* Ordinary production visitors must not receive development controls from stale local-storage values.
* Explicit query access can remain.
* Debug panels must be safe-area aware.
* FPS and camera diagnostics remain development-only.

### Acceptance criteria

* [ ] Header remains one row at the previously failing 856×375-like dimensions.
* [ ] Header remains coherent at 320–430 portrait widths.
* [ ] Gravity hero buttons do not clip or overflow.
* [ ] Mission briefing does not dominate the initial phone view.
* [ ] Desktop hero composition remains polished.
* [ ] Active mobile gameplay contains no portfolio-header collision.
* [ ] Shared CSS changes do not regress other project pages.
* [ ] Production debug controls remain hidden by default.

---

## Pass 10.8 - Integrated QA, accessibility, and release

**Size:** Large
**Risk:** Medium
**Purpose:** Validate the completed system rather than individual screenshots.

### Automated checks

Run existing repository checks plus the new Gravity validator:

```text
node --check on changed non-module JavaScript
new Gravity deterministic validator
saved-run compatibility validator
HTML duplicate-ID validation
CSS structural validation
git diff --check
git status --short
```

Do not invent an npm workflow unless the repository intentionally adopts one.

### Browser and viewport matrix

Test:

* 320×568.
* 360×800.
* 375×812.
* 390×844.
* 430×932.
* 768 breakpoint-sensitive layout.
* 1024 breakpoint-sensitive layout.
* Representative short-height landscape.
* Desktop 1366-class layout.
* Desktop 1920-class layout.
* 200% browser zoom.

### Required states

Test every target viewport where applicable in:

* Direct page load.
* Setup.
* Tutorial.
* Match start.
* Launch drag.
* Wormhole drag.
* Active wormhole.
* Clear wormhole.
* Pause.
* Telemetry drawer closed.
* Telemetry drawer open.
* Orientation change.
* Victory.
* Defeat.
* Outcome actions.
* Post-match analytics.
* Return to setup.
* Browser Back/Forward.
* Background tab and restore.

### Real-device testing

At minimum:

* The same iPhone used for the successful PR #13 playthrough.
* One additional mobile class if available, preferably Android or a different iPhone generation.
* One representative desktop/laptop.

Record:

* Full-match success.
* Input comfort.
* Frame pacing.
* Browser chrome behavior.
* Orientation behavior.
* Temperature.
* Drawer usability.
* Accidental gesture rate.
* Any clipped safe-area content.

### Accessibility

Verify:

* Keyboard access to setup, pause, drawer, outcome, and return controls.
* Focus containment and restoration.
* Escape behavior.
* Visible focus.
* Accessible pressed states.
* Labels for icon-only controls.
* Reduced motion.
* 200% zoom.
* No color-only status communication.
* Touch targets approximately 44 CSS pixels where practical.
* Useful canvas description and fallback context.

### Cloudflare preview

Verify:

* Direct load and refresh.
* Module loading and correct MIME behavior if modules are introduced.
* No failed assets.
* No console errors.
* No black screen.
* Back/Forward behavior.
* Mobile viewport behavior.
* Saved-run persistence.
* Production debug gating.

### Final cleanup

Remove:

* Old mobile-shell fallback code.
* Two-tap wormhole fallback if no longer used.
* Dead device-condition branches.
* Temporary camera diagnostics.
* Duplicate telemetry calculations.
* Unused CSS.
* Obsolete roadmap text.
* Development logging.

### Release acceptance criteria

* [ ] A full portrait match works from setup through analytics.
* [ ] A full landscape match works from setup through analytics.
* [ ] Phone temperature remains acceptable.
* [ ] Portrait uses the screen meaningfully.
* [ ] No major mobile game elements overlap.
* [ ] Wormholes use drag creation and an understandable lifespan.
* [ ] Mobile telemetry contains Fleet Strength and System Mix.
* [ ] Post-match metrics are compact.
* [ ] The Gravity hero is concise and its buttons fit.
* [ ] The responsive portfolio header remains one row.
* [ ] Desktop smoothness and quality match the preserved reference.
* [ ] Desktop and mobile produce compatible gameplay and telemetry.
* [ ] Existing saved runs remain readable.
* [ ] No ordinary visitor sees development UI.
* [ ] No required console, network, accessibility, or regression finding remains unresolved.

---

# 4. Recommended pull-request grouping

## PR A - Core contracts and extraction - complete

PR A is merged through PR #15. It includes Passes 10.0-10.1, the shared engine boundary, fixtures, diagnostics, and deterministic validation. It did not redesign visuals.

## PR B - Runtime and desktop restoration - complete implementation

PR B is merged through PR #16. It includes Pass 10.2 fixed-step runtime work, Desktop High/Mobile Balanced/Reduced Motion profiles, diagnostics, and automated validation. Its browser/device performance checkpoint remains pending.

## Checkpoint 1 - complete

Completed July 22, 2026 on current `main` after PRs #15, #16, and #17. The recorded desktop and iPhone observations are in Pass 10.2.

## PR C - Camera - complete

PR #18 merged Pass 10.3 on July 23, 2026 UTC at `8041c60f05ba9f99979bc968d8ac67af6231c68e`: identity-equivalent desktop mapping, portrait rotation, inverse pointer transforms, safe gameplay rectangle, orientation-aware resize behavior, and development diagnostics.

## Current draft - Mobile shell and touch controls

Passes 10.4-10.5 are implemented together on `gravity-fleet-mobile-shell-touch-controls`. Keep the pull request in draft until deployed-browser and physical-device evidence covers portrait, short landscape, lifecycle, gestures, fallback, and desktop regression checks.

## PR D - Mobile telemetry - later

Pass 10.6 remains unstarted. Do not fold its chart, content, event-feed, or post-match redesign into the shell and touch-controls draft.

## PR E - Page, header, and analytics polish - later

Retain Pass 10.7, compact post-match styling, and shared-site regression review.

## PR F - Release QA and cleanup - later

Retain Pass 10.8, dead-code removal, documentation, and final Cloudflare/device evidence.

---

# 5. Human QA checkpoints

## Checkpoint 1 - Desktop/mobile runtime evidence - complete

Completed July 22, 2026. Current-main desktop and mobile evidence confirms the match, input, telemetry, analytics, tab/orientation recovery, and acceptable mobile temperature described in Pass 10.2. Automated validation remains supporting evidence rather than a substitute for those observations.

## Checkpoint 2 - Mobile game experience - later

After PR D:

* Play one portrait match.
* Play part or all of one landscape match.
* Test Launch, Wormhole, Clear, Pause, and Telemetry.
* Approve the mobile composition before surrounding-page polish.

## Checkpoint 3 - Release candidate - later

After PR F:

* Full mobile playthrough.
* Desktop playthrough.
* Header and hero inspection.
* Post-match analytics inspection.
* Final merge approval.

---

# 6. AI execution policy

Use one lead agent by default.

For each implementation pass:

* Inspect the current diff and relevant files once.
* Reuse the architecture and acceptance criteria rather than rediscovering them.
* Keep writes with the lead agent.
* Do not delegate broad repository review.
* Use at most one read-only specialist only when a difficult performance or regression investigation clearly warrants it.
* Batch related searches and checks.
* Run validation proportional to the changed systems.
* Keep final reports focused on:

  * Files changed.
  * Architectural decisions.
  * Checks run.
  * Remaining risks.
  * Required human QA.

Do not ask an agent to “implement the entire roadmap” in one task.

---

# 7. Framework checkpoint

No framework migration is included in the implementation roadmap.

After Pass 10.8, reconsider only if profiling shows that:

* Canvas 2D drawing remains the primary bottleneck.
* The shared core and renderer are already separated.
* Mobile Balanced still cannot maintain acceptable performance after resolution and effect tuning.
* Planned game growth justifies a dependency and build workflow.

Possible later choices:

* Keep modular Canvas 2D.
* Prototype a PixiJS renderer behind the same engine.
* Consider Phaser only if Gravity Fleet is evolving into a substantially larger game product.

A framework must not be used to solve header wrapping, hero overflow, telemetry hierarchy, or mobile control placement.

---

# 8. Definition of done

Gravity Fleet modernization is complete only when:

* One shared simulation powers both experiences.
* Desktop is restored to the preferred visual and performance baseline.
* Portrait uses a rotated camera rather than a shrunken landscape canvas.
* Landscape has its own upright composition.
* Mobile Launch and Wormhole controls are explicit and mutually exclusive.
* Wormhole creation is drag-only on mobile.
* Wormholes have a clear action and an understandable temporary lifecycle.
* The mobile shell reserves space for its controls.
* Live mobile telemetry includes Fleet Strength and System Mix.
* The event feed no longer displaces the primary charts.
* Post-match analytics are compact and narrative-driven on mobile.
* The hero and header no longer waste scarce mobile space.
* Real-device evidence confirms usability, performance, and thermal stability.
* Desktop and mobile runs remain analytically comparable.
* Existing saved history remains compatible.
* Old rescue code and duplicate presentation paths are removed.
* The roadmap and repository documentation describe what actually shipped.
