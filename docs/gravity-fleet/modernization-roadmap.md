# Gravity Fleet Modernization Roadmap

## North star

Transform Gravity Fleet Lab into one shared game with two polished presentations:

* A restored, high-fidelity desktop experience.
* A purpose-built mobile experience inspired primarily by `my favorite.png`.
* Shared levels, physics, AI, combat, scoring, telemetry, analytics, and saved-run compatibility.
* Separate cameras, input adapters, interface compositions, and rendering-quality policies.
* No framework migration unless profiling later proves that the renderer—not the current architecture—is the remaining limitation.

The preferred mobile concept establishes the target hierarchy: compact match status, a dominant battlefield, explicit Launch and Wormhole controls, a nearby wormhole-clear action, Fleet Strength and System Mix charts, and fewer low-value interface elements.

---

# 1. Repository and pull-request strategy

## 1.1 Preserve PR #13 as the proven mobile prototype

PR #13 should remain a draft reference while the architecture work begins.

Do not merge it as the finished mobile edition yet because:

* Its mobile playthrough now succeeds.
* Its thermal behavior was acceptable on the tested phone.
* It contains useful modal, touch, safe-area, pointer-capture, and mobile performance work.
* Desktop smoothness has visibly regressed.
* The new mobile presentation still relies on numerous fixed overlays around the existing 16:10 canvas.
* The branch is stacked on a non-`main` base and includes a shared `styles.css` change described as outside the Gravity implementation scope.

PR #13 is therefore valuable evidence and reusable source code, but not the appropriate place for an unbounded redesign.

## 1.2 Freeze two known-good reference points

Before architectural editing, preserve:

### Desktop reference

Identify and record the last commit where desktop play had the preferred:

* Smooth frame pacing.
* Trail and effect quality.
* Input responsiveness.
* Visual polish.

Do not assume the PR #13 base commit is automatically that reference; verify it by running the game.

### Mobile reference

Preserve commit:

```text
d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9
```

This is the successfully tested mobile playthrough reference.

Record:

* Device and browser.
* Portrait and landscape screenshots.
* Match level.
* Approximate match duration.
* Thermal observation.
* Any interaction oddities.
* Saved-run result.

## 1.3 Establish a clean modernization branch

Recommended sequence:

1. Ensure the separate header work that PR #13 depends on is either merged into `main` or otherwise resolved.
2. Create a new modernization branch based on the working PR #13 head.
3. Rebase that branch onto the latest `main`.
4. Remove unrelated shared-file changes from the Gravity diff.
5. Keep PR #13 open as a reference until the modernization branch reaches mobile parity.
6. Close PR #13 as superseded only after the replacement draft PR exists and its ancestry is verified.

Suggested branch:

```text
gravity-fleet-shared-engine-modernization
```

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

## Pass 10.0 — Baselines, contracts, and regression harness

**Size:** Medium
**Risk:** Low
**Purpose:** Protect the game before restructuring it.

### Work

* Preserve the desktop and mobile reference commits.
* Capture representative states:

  * Setup.
  * Tutorial.
  * Early match.
  * Large launch.
  * Active wormhole.
  * Telemetry open.
  * Victory.
  * Defeat.
  * Post-match analytics.
* Record current saved-run objects and the local-storage schema.
* Document the gameplay invariants listed above.
* Inventory every major responsibility currently inside `gravity-fleet-lab.js`.
* Add temporary development instrumentation for:

  * Simulation time.
  * Draw time.
  * AI time.
  * Combat time.
  * HUD update time.
  * Chart time.
  * Active ships.
  * Effects.
  * Long frames.
* Add a repeatable command-sequence fixture for at least one level.
* Introduce a seedable random source for validation without changing normal public randomness.
* Document current desktop and mobile frame behavior.

### Performance baseline

Record, rather than guess:

* Median frame time.
* 95th-percentile frame time.
* Frames exceeding 50 milliseconds.
* Average displayed frame rate.
* Input-to-visible-response feel.
* Sustained mobile temperature observation.

### Acceptance criteria

* [ ] Both reference commits can still be run.
* [ ] A known run can be reproduced from a command fixture.
* [ ] Existing saved-run data is captured as a compatibility fixture.
* [ ] Instrumentation is development-only and hidden from normal visitors.
* [ ] No gameplay behavior changes.
* [ ] PR #13 remains available as the working mobile comparison.

### Stop condition

Do not begin extraction until the desktop reference has been positively identified. Otherwise, “restore desktop quality” has no trustworthy comparison point.

---

## Pass 10.1 — Extract the shared game core

**Size:** Large
**Risk:** High
**Purpose:** Separate gameplay truth from the DOM, canvas, and device conditions.

The current runtime mixes simulation, rendering, UI, telemetry, storage, input, mobile detection, dialogs, charts, and debugging. Mobile detection already influences trails, HUD cadence, chart behavior, and frame processing.

### Target responsibility boundaries

The exact filenames should be verified during implementation, but the target structure should resemble:

```text
games/gravity-fleet/
  core
    levels
    state
    simulation
    ai
    commands
  runtime
    clock
    performance-profile
  view
    camera
    renderer
  input
    desktop-input
    mobile-input
  telemetry
    telemetry-model
    run-storage
  presentation
    desktop-presentation
    mobile-presentation

games/gravity-fleet-lab.js
  bootstrap only
```

Avoid creating a separate file for every tiny function. The goal is coherent boundaries, not maximum file count.

### Shared-core responsibilities

Extract:

* Level configuration.
* State creation and reset.
* Planet orbit updates.
* Ship production.
* AI updates.
* Launch commands.
* Wormhole commands.
* Combat.
* Win/loss checks.
* Score calculation.
* Telemetry event production.
* Run serialization.

### Command interface

Both desktop and mobile input should eventually emit commands such as:

```text
BeginLaunch
UpdateLaunch
CommitLaunch
CancelLaunch

BeginWormhole
UpdateWormhole
CommitWormhole
ClearWormhole
CancelWormhole

PauseMatch
ResumeMatch
ResetMatch
```

The core should not receive pointer events or DOM elements.

### Prohibited core dependencies

The shared engine must not directly query:

* Viewport width.
* Pointer media queries.
* Screen orientation.
* HTML controls.
* CSS classes.
* Drawer state.
* Device type.
* Canvas dimensions.

### Regression validator

Add a repository-provided validation command using Node and no external testing dependency.

It should verify:

* All three levels initialize.
* The same seed and command script produces the same result.
* Win and loss states complete.
* Telemetry totals remain internally consistent.
* Existing saved runs can still load.
* Desktop and mobile command adapters produce equivalent engine commands.

### Acceptance criteria

* [ ] The current desktop presentation still plays from setup through analytics.
* [ ] The current mobile presentation still plays from setup through analytics.
* [ ] No level, AI, score, or telemetry behavior intentionally changes.
* [ ] Device checks exist only in presentation/runtime selection.
* [ ] Existing saved runs remain readable.
* [ ] The deterministic validator passes.
* [ ] The bootstrap file no longer owns core simulation logic.

### Rollback point

If extraction changes gameplay behavior, stop and restore parity before adding the camera or redesigned mobile shell.

---

## Pass 10.2 — Replace the clock and restore desktop quality

**Size:** Large
**Risk:** High
**Purpose:** Recover desktop smoothness while creating a stable runtime for both presentations.

The current loop targets 60 FPS on desktop and 30 FPS on mobile but skips callbacks using an 80%-of-frame-duration threshold.

That scheduling policy should not remain the foundation of the modernized runtime.

### Runtime work

* Introduce a fixed simulation timestep.
* Keep rendering separate from simulation advancement.
* Cap catch-up work to prevent a stalled tab from creating a simulation spiral.
* Reset timing cleanly after:

  * Tab restoration.
  * Pause.
  * Orientation change.
  * Drawer transitions that intentionally suspend play.
* Keep telemetry sampling on its own schedule.
* Keep DOM/HUD updates independently throttled.
* Stop hidden-page work.

### Presentation profiles

Introduce explicit profiles rather than scattered conditionals.

#### Desktop High

* Display-synchronized rendering.
* Full trails.
* Full effects.
* Original glow and pulse quality.
* High-quality canvas backing resolution.
* Full live telemetry availability.
* Precise mouse interactions.

#### Mobile Balanced

* Stable 30 FPS render target initially.
* Shared simulation step.
* Reduced nonessential effects.
* Capped effective pixel density where needed.
* No expensive hidden charts.
* Compact HUD updates.

#### Reduced Motion

* Minimal decorative movement.
* Static or restrained nonessential effects.
* Gameplay state remains understandable.
* Core mechanics remain available.

### Desktop recovery work

* Compare against the frozen pre-mobile desktop reference.
* Restore trail and effect behavior only for Desktop High.
* Confirm static-layer caching is not creating stale or lower-quality output.
* Confirm telemetry throttling does not affect desktop charts.
* Remove mobile rescue logic from the desktop render path.
* Diagnose major frame spikes before reducing visual quality.

### Recommended performance gates

These are proposed release gates, not claims about current measurements:

#### Desktop

* Routine play should visually match the reference smoothness.
* No persistent cadence reduction during ordinary gameplay.
* No recurring long-frame clusters during normal ship counts.
* Desktop High effects should not be disabled merely because mobile disables them.

#### Mobile

* Target remains a stable 30 FPS.
* No sustained collapse below approximately 25 FPS in ordinary play.
* No unacceptable temperature increase during a full match.
* Input response remains immediate enough for launch and wormhole gestures.

### Acceptance criteria

* [ ] Desktop appearance and smoothness match or materially improve upon the pre-mobile reference.
* [ ] Mobile remains playable and thermally acceptable.
* [ ] Simulation results do not depend on render frequency.
* [ ] Telemetry totals remain consistent across render profiles.
* [ ] Pausing and tab restoration do not create simulation jumps.
* [ ] Performance measurements are recorded before and after.

### Decision gate

If desktop still fails after runtime isolation and profiling identifies canvas drawing as the dominant cost, create a separate renderer experiment. Do not begin a framework migration based only on subjective lag.

---

## Pass 10.3 — Introduce the camera and viewport system

**Size:** Large
**Risk:** High
**Purpose:** Solve portrait composition correctly instead of shrinking a landscape canvas.

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
* Use a landscape-specific shell composition.

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

* [ ] Desktop camera produces no observable gameplay-layout regression.
* [ ] Portrait uses substantially more of the phone’s vertical area.
* [ ] Cyan begins toward the bottom in portrait.
* [ ] All worlds remain visible without distortion.
* [ ] Touch hit testing remains accurate near every edge and corner.
* [ ] No text or charts are sideways.
* [ ] Orientation changes do not leave stale pointer state.
* [ ] The camera never changes gameplay coordinates or telemetry.

---

## Pass 10.4 — Build the dedicated mobile match shell

**Size:** Large
**Risk:** Medium–High
**Purpose:** Replace independently fixed overlays with a composed game interface.

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

* [ ] No major controls overlap the tactical viewport’s reserved region.
* [ ] Portrait no longer contains the current large empty lower area.
* [ ] Landscape remains usable with short viewport height.
* [ ] Browser safe areas are respected.
* [ ] Pause genuinely stops the simulation.
* [ ] Return to setup restores the page reliably.
* [ ] No stale fixed mobile elements remain behind the new shell.
* [ ] The old mobile shell can be removed after cutover.

---

## Pass 10.5 — Replace mobile touch mechanics

**Size:** Medium–Large
**Risk:** Medium
**Purpose:** Make touch commands deliberate and learnable.

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

Playtest at least two configurations before finalizing the values.

### Tutorial updates

Replace mobile instructions with visual demonstrations of:

* Launch drag.
* Wormhole drag.
* Clear wormhole.
* Pause.
* Open telemetry.

Desktop instructions must continue to describe mouse controls.

### Acceptance criteria

* [ ] Tap-tap wormhole placement no longer occurs on mobile.
* [ ] Launch and Wormhole modes cannot both be active.
* [ ] Drag previews remain accurate through the camera transform.
* [ ] Clear Wormhole is discoverable and reliable.
* [ ] Wormhole lifespan is visible and understandable.
* [ ] Pointer cancellation never leaves a stuck launch or wormhole state.
* [ ] Desktop mouse behavior remains unchanged.
* [ ] The tutorial matches actual controls.

---

## Pass 10.6 — Redesign live telemetry and post-match analytics

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

## Pass 10.7 — Condense the Gravity page and stabilize the shared header

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

## Pass 10.8 — Integrated QA, accessibility, and release

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

To balance usage conservation with review safety, use six coherent implementation pull requests rather than one giant PR or dozens of tiny ones.

## PR A — Core contracts and extraction

Includes:

* Pass 10.0.
* Pass 10.1.
* Deterministic validation.
* No visual redesign.

## PR B — Runtime and desktop restoration

Includes:

* Pass 10.2.
* Desktop performance evidence.
* Desktop High and Mobile Balanced profiles.

## PR C — Camera and mobile shell

Includes:

* Pass 10.3.
* Pass 10.4.
* New shell initially behind a development flag.
* First device checkpoint.

## PR D — Touch controls and telemetry

Includes:

* Pass 10.5.
* Pass 10.6.
* Mobile design cutover.
* Second device checkpoint.

## PR E — Page, header, and analytics polish

Includes:

* Pass 10.7.
* Final compact post-match styling.
* Shared-site regression review.

## PR F — Release QA and cleanup

Includes:

* Pass 10.8.
* Dead-code removal.
* Documentation.
* Final Cloudflare and device evidence.

Each PR should follow the repository’s preferred issue-style prompt structure: goal, context, requirements, constraints, acceptance criteria, verification, and deliverable.

---

# 5. Human QA checkpoints

To avoid requiring a user review after every small technical pass, use only three planned approval checkpoints.

## Checkpoint 1 — Desktop restored

After PR B:

* Confirm desktop feels like the preferred pre-mobile version.
* Confirm no obvious gameplay drift.
* Confirm current mobile fallback still works.

## Checkpoint 2 — Mobile game experience

After PR D:

* Play one portrait match.
* Play part or all of one landscape match.
* Test Launch, Wormhole, Clear, Pause, and Telemetry.
* Approve the mobile composition before surrounding-page polish.

## Checkpoint 3 — Release candidate

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
