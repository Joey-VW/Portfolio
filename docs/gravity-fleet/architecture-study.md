# Gravity Fleet Lab: Mobile Experience and Architecture Study

## Executive conclusion

Your successful full match on mobile, with no significant device heating, is an important milestone. It demonstrates that:

* Gravity Fleet’s underlying simulation is viable on a phone.
* The performance reductions in PR #13 were directionally effective.
* Touch play can work without rebuilding the project in a native mobile stack.
* The remaining problems are primarily **presentation architecture, interaction design, responsive composition, and desktop frame pacing**, not evidence that the game itself has failed.

PR #13 intentionally pursued a shared-game approach: mobile uses the same rules, AI, physics, scoring, telemetry, and saved-run model while receiving a lower-cost presentation profile. That remains the correct product principle.

However, “one shared game” does **not** have to mean “one enormous script and one canvas presentation with mobile conditionals scattered through it.”

The strongest long-term model is:

> **One gameplay engine, two deliberately designed presentation layers.**

That means:

* One authoritative simulation.
* One set of level definitions.
* One AI system.
* One scoring and telemetry model.
* One saved-run format.
* A desktop presentation optimized for precision, fidelity, density, and smoothness.
* A mobile presentation optimized for touch, portrait composition, progressive disclosure, thermal stability, and constrained screen space.

Your instinct that Gravity Fleet may need a “dedicated mobile version” is therefore directionally right. The important correction is that it should be a **dedicated mobile experience**, not an independently duplicated mobile engine.

---

# 1. What the current implementation is telling us

## PR #13 solved the survival problem

The current branch added a useful mobile runtime profile:

* A 30 FPS mobile target.
* Pausing while the document is hidden.
* Cached static map rendering.
* Fewer visual effects and no ship trails on mobile.
* Less frequent HUD and telemetry work.
* A fixed, safe-area-aware match takeover.
* Touch mode buttons.
* A mobile telemetry drawer.

The runtime determines mobile presentation from coarse-pointer capability plus a viewport of 900 pixels or less.

That combination was enough to make the game playable from setup through match completion on your phone without excessive heat. That is a meaningful success.

## But it still treats mobile as a responsive variation of the desktop canvas

The mobile shell continues to center the existing 16:10 game canvas and scale it to:

```css
width: min(100vw, 160dvh);
height: auto;
```

On a portrait phone, the width becomes the limiting dimension. A 16:10 canvas that fills the phone’s width only consumes about 62.5% as much vertical space as its width. The remaining vertical space becomes letterboxing, which is exactly what the supplied portrait screenshot shows: a small horizontal battlefield floating above a large empty region.

This is not really a styling defect. It is a **camera and viewport-composition problem**.

## The overlap is structural, not incidental

The mobile HUD, metrics, exit button, mode controls, status text, canvas, menu button, and drawer are positioned as independent fixed or overlaid elements. The HUD fills the viewport, the metrics sit near the bottom, and the mode controls are fixed to the bottom-right.

That approach is manageable when there are only one or two overlays. With several live controls, it creates a collision system that CSS does not actually understand:

* The canvas does not know how much room the HUD needs.
* The HUD does not know where important planets are.
* The control dock does not reserve space from the canvas.
* The telemetry trigger and return control do not participate in one shared layout.
* Browser chrome, safe areas, and landscape height reductions further compress the available region.

More breakpoint adjustments can move the collisions around, but they will not eliminate the underlying problem.

## The telemetry drawer is currently a statistics drawer, not a telemetry dashboard

The mobile drawer contains six metrics, a recent-event feed, and reset/level actions. It does not include the actual live charts.

Meanwhile, the existing telemetry code already knows how to render:

* Fleet-strength history.
* Launch activity.
* System-control and fleet-mix data.

On mobile, those chart redraws are currently deferred during active gameplay, while the surrounding telemetry updates use a slower interval.

That was sensible as a rescue measure. It should now evolve into an intentional policy: render a **smaller mobile-specific chart set only while the drawer is visible**, rather than either rendering everything or suppressing all charts.

## The wormhole problem is already visible in the code

The game already contains a complete drag workflow:

* `startWormDrag`
* `updateWormDrag`
* `finalizeWormDrag`

But when mobile Wormhole mode is active, pointer-down routes to `placeWormFallback`, which sets the entrance on one tap and the exit on another.

The pointer handler confirms the split:

* Right mouse drag uses the drag workflow.
* Wormhole mode uses the two-tap fallback.
* Launch mode uses the launch-field drag interaction.

So the unintuitive mobile behavior does not require inventing an entirely new mechanic. It requires routing touch Wormhole mode through the drag implementation that already exists.

## The hero-button problem has a direct shared-CSS cause

At small widths, every `.hero-actions` element is forced into a three-column grid:

```css
grid-template-columns: 0.8fr 1.15fr 1.3fr;
```

Its buttons also retain `white-space: nowrap`.

Gravity Fleet only has two hero buttons. They are therefore squeezed into the first two fractions of a layout designed for three actions, and their text is prohibited from wrapping. The overflow in your screenshot is a predictable consequence of that rule.

## The recurring two-row header also has a direct cause

At 980 pixels and below, the generic top bar is explicitly allowed to wrap, and the navigation is assigned a full-width third-order row. Only the projects-index header receives an exception.

That means the header is not randomly reverting. It is doing exactly what the global responsive rule instructs it to do.

This should be corrected as a header-component design issue, not chased with more device-specific width exceptions.

---

# 2. What the generated concepts establish

The images and accompanying notes reveal a surprisingly coherent mobile product direction.

The preferred concept establishes these priorities:

* A compact, meaningful top status region.
* A dominant tactical field.
* Large Launch and Wormhole mode buttons.
* Mutual exclusivity between those modes.
* A nearby wormhole-clear control.
* A Fleet Strength timeline.
* A System Mix donut.
* Minimal, compact supplementary metrics.
* No unnecessary Focus control.
* Potentially a pause control.
* Less visual noise than the busier generated alternatives.

The notes also explicitly identify the preferred telemetry arrangement and suggest replacing the generated fake bar chart with the real System Mix donut.

The key visual principle is not merely “make the existing interface smaller.” It is:

> **The battlefield is the product. Everything else should support it, temporarily overlay it, or move out of its way.**

That translates into three levels of information:

1. **Always visible:** timer, essential faction status, active control mode.
2. **One gesture away:** Fleet Strength, System Mix, and a few tactical metrics.
3. **After the match:** full analytics, event history, detailed KPIs, benchmarks, and interpretation.

The generated favorite succeeds because it observes that hierarchy.

---

# 3. The recommended architecture

## One simulation, two presentations

A durable Gravity Fleet architecture would separate the project into seven conceptual layers.

### 1. Game core

The game core should own:

* Game state.
* Planet and ship entities.
* Orbital motion.
* AI decisions.
* Launch and wormhole rules.
* Combat resolution.
* Win/loss conditions.
* Scoring.
* Telemetry events.

It should not know:

* Whether the device is a phone.
* Whether the screen is portrait.
* Which HTML controls are visible.
* Where the drawer is positioned.
* Whether text is being rendered in a DOM card.
* Which visual quality profile is active.

### 2. Runtime clock

The runtime clock should decide when the simulation advances and when a frame renders.

This is especially important because desktop and mobile can render at different rates while consuming the same fixed simulation steps.

### 3. Camera and viewport

The camera should own:

* World-to-screen transforms.
* Screen-to-world transforms.
* Rotation.
* Scale.
* Viewport bounds.
* Safe gameplay regions.
* Portrait and landscape framing.

This is the missing abstraction behind the current portrait problem.

### 4. Renderer

A renderer should draw a supplied game state through a supplied camera.

The desktop and mobile versions may share drawing primitives while using different quality settings:

* Trail density.
* Glow intensity.
* particle count.
* line complexity.
* backing-buffer resolution.
* optional effects.

They do not need to produce pixel-identical output.

### 5. Input adapters

Desktop and mobile should translate different gestures into the same game commands.

For example:

```text
Desktop left-drag  ─┐
Mobile Launch drag ─┴─> BeginLaunch / UpdateLaunch / CommitLaunch

Desktop right-drag ─┐
Mobile Wormhole drag ┴─> BeginWormhole / UpdateWormhole / CommitWormhole
```

The core should receive commands. It should not care whether they came from a mouse or finger.

### 6. Telemetry projection

The simulation should produce structured telemetry once.

Different UI surfaces then project it differently:

* Desktop live dashboard.
* Mobile glance HUD.
* Mobile telemetry drawer.
* Post-match summary.
* Full analytics dashboard.
* Saved-run history.

### 7. Persistence

Run storage, schemas, and compatibility remain shared.

This architecture can remain plain JavaScript and use browser-native ES modules. It does not inherently require a bundler or framework, and therefore can remain consistent with the repository’s build-light model. The repository currently requires explicit approval before introducing a framework, bundler, package manager, backend, or other runtime dependency.

A useful conceptual structure would resemble:

```text
GravityFleetCore
├── State and entities
├── Rules and simulation
├── AI
├── Commands
├── Telemetry events
└── Saved-run serialization

GravityFleetRuntime
├── Fixed simulation clock
├── Pause/resume
└── Performance instrumentation

DesktopPresentation
├── Desktop camera
├── Desktop input
├── High-quality renderer profile
├── Command dock
└── Full live telemetry

MobilePresentation
├── Portrait/landscape cameras
├── Touch input
├── Balanced renderer profile
├── Mobile HUD and controls
└── Mobile telemetry drawer
```

This allows the desktop and mobile experiences to diverge as much as necessary visually without allowing their gameplay logic to drift apart.

---

# 4. Portrait should use a camera rotation, not a rotated webpage

## The proposed 90-degree rotation is technically sound

The current game world is 1280 × 800. Rotating that world 90 degrees gives it an effective portrait footprint of 800 × 1280, or 10:16. That is naturally compatible with a tall phone screen.

In the current level definitions, the Cyan home begins on the left side of the world. A visual counterclockwise rotation of 90 degrees maps that left-side position toward the bottom, producing the orientation you described.

The browser Canvas API already supports translating, rotating, and scaling a rendering context through transformation matrices.

The correct implementation model is:

1. Keep all world coordinates unchanged.
2. Define a portrait camera transform.
3. Translate the world center to the camera origin.
4. Rotate the world by -90 degrees.
5. Scale the rotated bounds to the available tactical region.
6. Translate the result into that region.
7. Draw every world element through the matrix.
8. Apply the inverse matrix to touch coordinates before hit testing.

Browser `DOMMatrix` APIs can transform points and invert matrices, which makes one consistent matrix usable for both rendering and pointer conversion.

Conceptually:

```text
screenPoint = cameraMatrix × worldPoint
worldPoint  = inverseCameraMatrix × screenPoint
```

## Do not rotate the canvas element and all its surrounding text with CSS

Rotating the entire canvas element can make the visual field fit, but it introduces several avoidable complications:

* Touch coordinates no longer correspond naturally to canvas coordinates.
* Overlaid controls require their own counter-rotations.
* Safe-area math becomes confusing.
* Browser hit regions can become unintuitive.
* Text and charts may end up sideways or separately transformed.
* Accessibility focus outlines and DOM geometry become harder to reason about.

The **world** should rotate. The HUD, controls, labels, and charts should remain upright to the person holding the phone.

## Landscape should be a separate composition, not sideways portrait text

I would depart from the generated-note idea of rotating all interior text when the phone turns horizontally.

The better model is:

* Portrait: rotated world camera, compact top HUD, bottom command controls, bottom telemetry drawer.
* Landscape: native landscape camera, compact HUD strip, controls at one side or bottom corner, telemetry opening as a side sheet.
* All text remains upright relative to the viewer.
* Charts redraw in the available dimensions rather than rotating as completed DOM elements.

Screen orientation changes can be observed through the standardized `ScreenOrientation` change event. The visual viewport can also report resize events when browser controls, zoom, or other mobile conditions alter the actually visible area.

Orientation locking should not be a foundational requirement. Browser support and availability vary, and orientation locking is commonly restricted to fullscreen mobile contexts.

## Use a reserved gameplay rectangle

The camera should not fit the world against the entire physical screen. It should fit it inside a calculated **safe gameplay rectangle**.

For portrait, that region might be:

```text
Top edge:
safe-area inset
+ compact match header

Bottom edge:
command controls
+ telemetry handle
+ safe-area inset

Left/right:
small breathing margin
+ safe-area insets
```

The camera then scales the rotated world into the remaining rectangle.

This is the architectural solution to overlap: the controls reserve space before the world is framed. They are no longer painted on top of whatever the camera happens to place beneath them.

A `ResizeObserver` is appropriate for reacting to changes in the actual game-shell container rather than relying only on global width breakpoints.

## Do not make the camera chase the moving home planet

The initial camera rotation can be derived from the Cyan home’s starting position, but it should be locked when the match starts.

Continuously rotating the world so that the moving Cyan planet remains at the bottom would:

* Make the entire battlefield spin.
* Complicate targeting.
* Increase motion sickness risk.
* Make spatial learning difficult.
* Cause charts and overlays to feel disconnected from the world.

The camera should provide a stable tactical frame.

## Do not make planets stationary merely to solve layout

Stationary planets would materially change:

* Timing.
* Launch prediction.
* Wormhole value.
* AI behavior.
* Level difficulty.
* Telemetry interpretation.
* The distinctive identity of Gravity Fleet.

The existing orbiting system is part of what makes the game interesting. A camera transform can solve the clipping and empty-space problem without sacrificing it.

A stationary-planet mode could eventually be a deliberately labeled accessibility or alternate-rules mode, but it should not silently become the mobile version merely because the screen is smaller.

---

# 5. Mobile input should feel authored for touch

## Launch and Wormhole should be explicit, mutually exclusive modes

The preferred image already communicates the correct interaction model:

* Tapping Launch activates Launch and deactivates Wormhole.
* Tapping Wormhole activates Wormhole and deactivates Launch.
* The active state is visually unmistakable.
* The canvas gesture remains consistent: touch, drag, release.

This avoids asking a finger gesture to represent multiple ambiguous commands.

## Wormhole creation should use drag exclusively

The mobile Wormhole contract should be:

1. Select Wormhole mode.
2. Touch the desired entrance.
3. Drag toward the desired exit.
4. See a live line, range boundary, direction arrow, and validity state.
5. Release to create.
6. Cancel by returning to Launch, pressing Clear, or cancelling the pointer.

Pointer Events are designed to provide one coordinate-based model across mouse, pen, and touch. Setting `touch-action` deliberately allows an application to retain drag gestures instead of having the browser reinterpret them as scrolling or zooming.

Gravity Fleet already has pointer capture and drag-state machinery, so the goal is to make mobile Wormhole mode use the same command lifecycle as desktop right-drag.

## Use a dedicated Clear Wormhole control

Tapping a wormhole itself is a poor primary deletion method on mobile:

* The wormhole may be small.
* Ships and effects may overlap it.
* A tap might be mistaken for a new command.
* A moving battlefield makes hit targeting harder.
* The user cannot easily know which endpoint accepts the action.

The small control beside Wormhole in the preferred concept is a good location for a Clear or Collapse action.

It should:

* Be disabled when no Cyan wormhole exists.
* Clearly collapse the current Cyan wormhole.
* Provide a short visual confirmation.
* Never also place or toggle a wormhole.

A tap directly on an existing wormhole could remain as an optional shortcut, but not the only discoverable route.

## An ephemeral lifespan is promising, but its semantics matter

The current player wormhole lifetime defaults to 30 seconds.

Reducing the mobile lifetime to 2–3 seconds could make wormholes feel more like tactical gestures and reduce the need for management. However, a hard three-second timer beginning at pointer release may expire before a distant fleet meaningfully uses it.

A stronger prototype would be:

* The wormhole remains armed for a short maximum preparation window.
* Its visible countdown begins when the first eligible Cyan ship enters.
* It collapses roughly 2–3 seconds after activation.
* A slightly longer absolute maximum prevents it remaining indefinitely if unused.
* A ring or arc around the entrance communicates the remaining lifetime.
* Clear collapses it immediately.

That preserves your desired temporary feel while aligning the timer with actual use.

The exact numbers should be tuned through play rather than treated as an architectural constant.

## Pause belongs in the mobile command layer

A pause control is a worthwhile addition because mobile sessions are frequently interrupted by:

* Browser UI.
* Notifications.
* Accidental app switching.
* Physical repositioning.
* Telemetry inspection.

Pause should freeze simulation time, AI decisions, movement, effects, and match telemetry sampling while leaving the UI responsive. It should not merely cover a game that continues running underneath.

---

# 6. The mobile shell should be a composed interface

## Replace independently fixed elements with one layout system

The mobile match should have a dedicated shell with named regions, conceptually:

```text
┌────────────────────────────┐
│ Match status / timer / menu│
├────────────────────────────┤
│                            │
│      Tactical viewport     │
│                            │
├────────────────────────────┤
│ Mode controls / drawer tab │
└────────────────────────────┘
```

CSS Grid is appropriate because the top and bottom regions can reserve actual space while the tactical viewport receives the remainder.

The key difference is:

* Current system: controls float above a full-screen canvas.
* Recommended system: controls and canvas divide the available screen.

Minor overlays can still exist, but the major regions should participate in one layout.

## Recommended portrait composition

The preferred generated image is a strong starting point:

### Top strip

* Level or mission label.
* Match timer as the dominant number.
* Compact Cyan/Red/Orange status.
* Pause.
* Telemetry/menu trigger.

The top should not repeat every metric already available below.

### Tactical viewport

* Rotated portrait camera.
* No permanent text floating over important planets.
* World scale calculated from the reserved rectangle.
* Subtle command preview and selection feedback.
* Optional minimal edge indicators for off-screen events only if the complete world is not visible.

### Bottom command dock

* Large Launch button.
* Large Wormhole button.
* Small Clear Wormhole button.
* Possibly Pause if it is not in the top strip.
* Clear selected states.
* Comfortable touch areas.

### Telemetry handle

A small persistent handle or labeled strip communicates that live charts are available without placing a large badge over the battlefield.

## Recommended landscape composition

Landscape has very little vertical height, especially with mobile browser chrome. It should therefore use:

* A slim top HUD, possibly a single row.
* A wide tactical viewport.
* Compact mode controls at the right or lower-right.
* Telemetry as a side sheet from the right.
* A one-row exit or setup control.
* No full portfolio header during the active match.

The orientation should alter layout regions, not merely shrink the portrait arrangement.

---

# 7. Telemetry should use progressive disclosure

## Layer 1: glanceable live HUD

Always visible:

* Timer.
* Cyan ships or strength.
* Cyan worlds.
* Rival worlds or opposing strength.
* Active command mode.

Potentially visible only when meaningful:

* Wormhole countdown.
* Star owner.
* A brief launch confirmation.

Frame rate is useful during development but should not occupy prime permanent HUD space in the polished public version. It can live behind a debug switch.

## Layer 2: mobile telemetry drawer

The preferred drawer should contain:

### Fleet Strength over Time

A compact line chart using Cyan, Red, and Orange.

This is the most useful live analytical view because it answers:

* Who is gaining momentum?
* Did the last launch materially change fleet pressure?
* Am I winning despite temporarily losing worlds?
* Is an opponent recovering?

### System Mix

A compact donut showing controlled worlds, with a concise fleet-strength legend or secondary numbers.

This directly uses the real visualization that the generated concept was attempting to suggest. The uploaded notes specifically identify the fake generated bar-chart region as a suitable home for the actual System Mix donut.

### Four compact tactical metrics

A two-column grid could show:

* Largest launch.
* Ships in transit.
* Deep-space fights.
* Star control or wormhole transits.

Each should be a compact label-value pair, not a card with generous desktop padding.

### Match actions

* Resume or Close.
* Reset match.
* Choose level.

The latter two should be visually secondary and separated from the live charts to prevent accidental activation.

## The live event feed should be removed from the primary mobile drawer

The event feed is information-rich but spatially expensive and difficult to scan while playing.

It is better suited to:

* The post-match analytics view.
* An optional secondary Log tab.
* A developer/debug mode.
* A condensed single-line “latest event” status.

Removing it makes room for the visual telemetry that gives the project its analytical identity.

## Render charts only while they are useful

The existing mobile profile already lowers telemetry cadence and avoids drawing the full live charts during the active mobile shell.

A refined policy would be:

* Drawer closed: update only the small HUD model.
* Drawer opening: immediately draw the current chart state.
* Drawer open: update charts approximately once per second.
* Drawer closing: stop chart redraws.
* Document hidden or match paused: stop sampling and rendering.
* Match ended: render one final full-resolution state.

This provides the charts without returning to constant hidden work.

---

# 8. Post-match analytics should become a mobile report, not a card parade

The current responsive CSS changes the KPI grid from four columns to two and then to one column below 560 pixels.

When a large set of desktop KPI cards becomes one full-width card per row, the resulting page is technically responsive but experientially exhausting.

A stronger mobile hierarchy is:

## Outcome summary

One compact horizontal or two-column region containing:

* Victory/Defeat.
* Final score.
* Duration.

## Match highlights

A two-column metric list:

* Planets captured.
* Ships destroyed.
* Largest launch.
* Ship transits.
* Wormholes.
* Peak advantage.

These can be simple definition-list rows rather than individual elevated cards.

## Analytical story

Then show:

* Fleet-strength chart.
* System-control visualization.
* The most important turning point.
* One or two generated insights.
* Replay or level actions.

## Details

Less important metrics can sit beneath a collapsed “All match statistics” disclosure.

The design goal should be:

> Show the result first, explain why it happened second, and provide exhaustive data only when requested.

---

# 9. Desktop smoothness should be restored through runtime separation

## The current frame limiter is a strong suspect

The current loop chooses 30 FPS for mobile and 60 FPS for desktop, then skips a callback whenever the elapsed time is below 80% of the target frame interval.

For desktop, that means the nominal 60 FPS threshold is approximately 13.33 milliseconds rather than 16.67 milliseconds.

Because `requestAnimationFrame` generally follows the display’s refresh rate, which may be 60, 75, 90, 120, or 144 Hz, this threshold can produce different effective patterns depending on the display.

Examples:

* On 60 Hz, almost every callback passes.
* On 90 Hz, one callback may be skipped and the next processed, yielding roughly 45 processed frames.
* On 120 Hz, approximately every second callback may pass, yielding roughly 60.
* On 144 Hz, roughly every second callback may pass, potentially yielding around 72 rather than a stable 60.
* Small timing variations can change which callbacks pass, creating inconsistent cadence.

This does not prove that it is the only desktop regression, but it is a credible explanation for a consistent reduction in polish and should be examined before assuming the canvas renderer itself has become too slow.

## Use a fixed simulation timestep

The established game-loop pattern is:

1. Accumulate real elapsed time.
2. Advance the simulation in fixed-size steps.
3. Limit the maximum number of catch-up steps.
4. Render separately.
5. Optionally interpolate visual state between simulation steps.

This avoids making physics behavior depend directly on irregular frame intervals and reduces visible stutter caused by inconsistent update cadence.

Conceptually:

```js
accumulator += Math.min(frameDelta, maxFrameDelta);

while (accumulator >= simulationStep && steps < maxCatchUpSteps) {
  updateSimulation(simulationStep);
  accumulator -= simulationStep;
  steps += 1;
}

render(accumulator / simulationStep);
```

For Gravity Fleet:

* Simulation might run at one stable step rate on every device.
* Desktop could render every available animation frame.
* Mobile could render at 30 FPS or an adaptive balanced rate.
* Telemetry could sample on a separate low-frequency schedule.
* DOM HUD updates could remain throttled independently.
* Pausing would stop accumulated simulation time cleanly.

## Restore desktop quality as an explicit presentation profile

The desktop profile should intentionally retain:

* Full trails.
* Higher effect density.
* Smooth glow and pulse animation.
* Frequent rendering.
* Full telemetry.
* Precise mouse interactions.
* Original canvas composition.
* The original visual feel that made you enjoy the game.

Mobile optimizations should not alter the desktop clock or quality path merely because they share a file.

The runtime should select a profile such as:

```text
Desktop High
- unrestricted display-synchronized rendering
- full trails and effects
- full live charts
- high canvas resolution

Mobile Balanced
- 30 or adaptive render target
- reduced effects
- capped pixel density
- charts only while visible
- compact HUD

Reduced Motion
- minimal decorative animation
- clear static state
- simulation behavior preserved
```

## Profile before changing core game rules

The most useful measurements are not merely the displayed FPS number.

Capture:

* Median frame time.
* 95th-percentile frame time.
* Worst normal-play frame time.
* Number of frames exceeding 50 milliseconds.
* Simulation time.
* Canvas draw time.
* Combat-resolution time.
* AI time.
* DOM/HUD time.
* Chart-rendering time.
* Active ship count.
* Effect count.
* Input-to-visible-response latency.

The Long Animation Frames API can identify frames exceeding 50 milliseconds and help attribute long rendering work.

The browser’s rendering budget also includes style, layout, paint, and compositing work outside the JavaScript function itself, so separating those measurements matters.

Your observation that the phone stayed cool is valuable real-device evidence. It should be preserved as a baseline, while desktop smoothness is restored through isolation rather than by undoing every mobile optimization.

---

# 10. Are frameworks what this is for?

## Partly

Game frameworks commonly provide infrastructure for:

* Canvas scaling.
* Camera transforms.
* Camera rotation.
* Input normalization.
* Pointer-to-world coordinate conversion.
* Scene lifecycle.
* Asset management.
* Timers.
* Animation.
* Audio.
* Object management.
* WebGL batching.
* Fullscreen and orientation handling.

For example, Phaser provides a scale manager, unified mouse/touch pointer input, and cameras with configurable position, size, rotation, scale, and viewport.

PixiJS focuses more narrowly on high-performance 2D rendering through WebGL/WebGPU, with guidance for reducing resolution and visual cost on slower mobile devices.

Those tools would have made several implementation details easier.

They would not automatically decide:

* Which mobile metrics deserve permanent space.
* Whether wormholes should be temporary.
* How the hero should be condensed.
* Whether the event feed belongs in the drawer.
* How the post-match report should be prioritized.
* How much desktop and mobile should visually differ.
* Which parts of the game must remain invariant.

Those are product and architecture decisions.

## A framework migration should not be the first corrective action

Migrating Gravity Fleet now would introduce:

* New dependencies.
* A different rendering model.
* A likely build step or package workflow.
* A substantial rewrite.
* New deployment and accessibility considerations.
* Potential visual differences.
* A larger testing surface.
* A risk of losing the existing feel while chasing infrastructure improvements.

It would also cross the repository’s current architectural boundary and therefore requires an intentional decision rather than being slipped into a mobile cleanup pass.

## Recommended framework decision model

### Stay with modular vanilla JavaScript when:

* Canvas 2D is meeting performance goals after the runtime is corrected.
* The current drawing model remains manageable.
* Gravity Fleet remains a contained portfolio game.
* Preserving the no-build architecture is valuable.
* Camera, input, and presentation modules can be cleanly extracted.

This is the recommended immediate direction.

### Consider a PixiJS rendering prototype when:

* Profiling shows Canvas 2D draw work is the remaining bottleneck.
* Ship counts or effect complexity are expected to grow significantly.
* GPU batching would provide meaningful benefit.
* The game core has already been separated from rendering.

In that case, Pixi can replace the renderer without forcing the gameplay engine to change.

### Consider Phaser when:

* Gravity Fleet is becoming a larger game product rather than a single portfolio experiment.
* Multiple scenes, richer assets, audio, transitions, gamepad support, and more levels are planned.
* Built-in camera, scene, input, and scale systems offset the migration cost.
* A package-based game architecture is acceptable.

A framework should be selected because the project’s future scope justifies it, not because two CSS breakpoints are misbehaving.

---

# 11. The site surrounding the game needs its own responsive pass

## Header

The current generic responsive header rule guarantees a second row below 980 pixels.

A dedicated project-header component should have stable layout modes:

### Full

* Brand identity.
* Return action.
* Project navigation.

### Compact

* Back icon or short “Back”.
* Centered JW mark or concise title.
* One project/menu action.
* One row only.

### Active game

* Portfolio header absent.
* Game-level return control inside the match shell.

The header should switch modes based on available component space, not accumulate a sequence of viewport-specific patches.

## Hero

The current hero contains:

* Eyebrow.
* H1.
* Long title sentence.
* Long summary sentence.
* Two actions.
* A six-step mission briefing.

That is appropriate on desktop but too much preamble on a phone.

A condensed mobile presentation should show:

* Eyebrow.
* Gravity Fleet Lab.
* One concise value statement.
* Play.
* View analytics.
* A collapsed “How to play” disclosure or briefing below the initial play entry.

The mission briefing is valuable; it does not need to consume the first several mobile viewports.

## Hero buttons

Gravity Fleet’s two actions should use either:

```css
grid-template-columns: repeat(2, minmax(0, 1fr));
```

or a single column at the narrowest widths.

The button labels should be allowed to wrap or use slightly shorter mobile labels. They should not be placed into the sitewide three-column action layout.

## Entering a match should create a genuine mode transition

Once Play is selected:

* The page shell should stop participating.
* The active match shell should own the visual viewport.
* The browser should not be asked to render and position hidden page sections beneath the game unnecessarily.
* Returning to setup should restore the document predictably.
* Returning to the portfolio should remain available without colliding with gameplay.

This makes the experience feel like entering a game rather than scrolling to an unusually interactive section of a webpage.

---

# 12. The working methodology that best fits this project

The industry-strength approach is not “make desktop, then add media queries until mobile fits.” It is **contract-driven adaptive game design**.

## Define invariants first

The following should remain shared unless a deliberate rules variant is introduced:

* Level data.
* Initial ownership and ship counts.
* AI decisions.
* Orbital physics.
* Launch rules.
* Combat rules.
* Scoring.
* Victory/defeat logic.
* Telemetry meanings.
* Analytics calculations.
* Saved-run schema.

These are the engine contract.

## Define presentation variables separately

These may differ:

* Camera orientation.
* Camera scale.
* HUD arrangement.
* Gesture mapping.
* Control placement.
* Telemetry density.
* Chart dimensions.
* Effect density.
* Trail rendering.
* Render frequency.
* Canvas resolution.
* Intro-page density.
* Post-match information hierarchy.

These are presentation policy.

## Test complete states, not merely viewport widths

Every target layout should be evaluated in:

* Mission setup.
* Tutorial.
* Match start.
* Launch drag.
* Wormhole drag.
* Existing wormhole.
* Telemetry drawer closed.
* Telemetry drawer open.
* Paused.
* Victory.
* Defeat.
* Post-match summary.
* Full analytics.
* Return to setup.
* Orientation change.
* Browser background and restore.

This is more effective than checking a blank canvas at several widths.

## Use both emulation and real devices

Playwright can emulate mobile devices, viewport sizes, user agents, and touch-related browser context across Chromium and WebKit.

Emulation is valuable for repeatable layout and interaction regression tests.

It cannot fully reproduce:

* Physical thermal behavior.
* Real finger occlusion.
* Mobile Safari browser chrome behavior.
* Device GPU limits.
* Actual touch precision.
* OS interruptions.
* Perceived comfort while holding the phone.

Real-device playthroughs therefore remain a release gate rather than an optional final glance.

The repository’s existing viewport matrix of 320, 375, 390, 430, 768, and 1024 pixels, plus landscape and zoom checks, is a useful responsive baseline.

---

# 13. Approaches to avoid

## Do not continue solving the mobile game primarily with fixed-position overrides

That will produce more dimension-specific exceptions and new collisions.

## Do not CSS-rotate the entire interface

Rotate the camera’s world transform. Keep human-facing controls and charts upright.

## Do not duplicate the simulation engine

Two engines would eventually drift in:

* Balance.
* Bug fixes.
* AI.
* Scoring.
* Telemetry.
* Saved-run compatibility.

Duplicate presentation code where necessary, not gameplay truth.

## Do not silently simplify the rules on mobile

Stationary planets, different AI, different physics, or hidden scoring changes would make mobile and desktop runs analytically incomparable.

## Do not remove features solely because the current layout cannot hold them

Use progressive disclosure:

* Hide details.
* Collapse them.
* Move them post-match.
* Recompose them.
* Render them only when visible.

That preserves the project’s personality without placing every feature on-screen simultaneously.

## Do not migrate frameworks before profiling

A framework may eventually be justified, but it should not be used to obscure an unresolved architecture problem.

## Do not let device checks spread throughout simulation code

A mobile query should select a presentation and quality profile. It should not become a repeated condition inside every mechanic.

---

# Final recommendation

Gravity Fleet should move toward a **shared-engine adaptive presentation architecture**.

The ideal end state is:

* The original desktop experience restored as the high-fidelity benchmark.
* A dedicated mobile match shell inspired primarily by `my favorite.png`.
* A portrait camera rotated 90 degrees counterclockwise so Cyan begins toward the bottom.
* The same simulation and level data on both platforms.
* Drag-only mobile wormholes.
* Explicit Launch and Wormhole modes.
* A clear/collapse control.
* A short, visible, testable wormhole lifespan.
* A compact top HUD.
* A battlefield that owns most of the screen.
* A bottom telemetry drawer with Fleet Strength, System Mix, and compact tactical metrics.
* Event history moved out of the primary live drawer.
* Upright, orientation-specific mobile layouts rather than sideways text.
* A corrected fixed-step runtime that restores desktop smoothness.
* Mobile and desktop quality profiles that cannot accidentally degrade one another.
* A framework considered only after modularization and profiling reveal a renderer or infrastructure need.

You have not approached the entire project “wrong.” You reached the point many ambitious interactive web projects reach: responsive document techniques were sufficient until the interactive feature began behaving like a real game.

The next stage is not to strip Gravity Fleet down or abandon it. It is to start treating the match as a **game application embedded within a portfolio site**, with its own camera, runtime, input model, responsive shell, and information hierarchy.
