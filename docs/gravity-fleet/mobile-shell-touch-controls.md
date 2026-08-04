# Gravity Fleet mobile shell and touch contract

Passes 10.4-10.5 replace the interim mobile overlay composition and two-tap touch path without changing desktop camera or mouse behavior.

## Shell ownership

During an active coarse-pointer match at 900 CSS pixels or narrower, the game stage is portalled to `body`. The modern shell then moves the existing canvas, HUD, mode controls, backdrop, and telemetry drawer into four named grid regions:

- compact top HUD;
- measured tactical viewport;
- bottom or side command dock; and
- telemetry handle and drawer host.

The original DOM locations are retained as placeholders. Leaving the match restores every moved node, body overflow, focus/inert state, and the game stage's original placement.

The modern shell is the default. Development-only query flags are:

- `?gravityDebug=1` - expose supported diagnostics while the composed shell remains the only mobile presentation.
- `?gravityDebug=1&gravityCanvasFailure=1` - simulate unavailable canvas initialization for controlled fallback QA.

No shell selector is exposed in the public interface. A readiness failure pauses the engine, cancels input, restores the page, and exposes Retry and Return to mission setup.

## Tactical viewport measurement

The modern shell writes `VisualViewport` offset and dimensions into stage CSS variables. CSS Grid and safe-area padding reserve the HUD, command dock, and telemetry handle before the tactical viewport is measured.

The canvas backing surface follows that tactical element and the active DPR cap. The camera receives the full measured canvas region. Portrait keeps the Pass 10.3 `-90°` world rotation and landscape stays native. All pointer coordinates continue through the inverse camera transform.

Resize, `VisualViewport`, and orientation events cancel an incomplete gesture before recalculating the camera.

## Pause lifecycle

The shell calls the existing engine `pause` and `resume` commands. Engine pause exposes `state.paused`, disables gameplay input, cancels incomplete engine gestures, and leaves the mounted interface responsive. The fixed-step runtime receives `running: false`, so simulation, AI, elapsed time, movement, effects, and telemetry sampling do not advance.

Resume resets the runtime epoch before sampling or stepping resumes. The deterministic validator covers paused-state immutability and the no-catch-up timing boundary.

## Touch modes and cancellation

Mobile has one presentation mode value: Launch or Wormhole. Updating it synchronizes `aria-pressed`, the selected visual state, and `data-gravity-command-mode`. Switching mode cancels pointer capture and incomplete engine commands.

Primary touch input is drag-release in both modes. Desktop LMB launch, RMB wormhole drag, left-click wormhole fallback, and entrance toggling remain on their existing fine-pointer paths.

Drawer opening, Pause, pointer cancellation, viewport/orientation changes, mode changes, Return to setup, and match reset all cancel incomplete touch commands.

Clear Wormhole is a dedicated engine `clearWormhole` command. Its button is disabled while paused or when Cyan has no wormhole.

## Mobile wormhole lifespan

The selected `mobile-tactical` configuration lives in `WORMHOLE_LIFESPAN_PROFILES`:

- preparation: `0.75s`;
- active countdown: `2.5s` after the first eligible Cyan ship enters;
- unused absolute maximum: `10s`.

The entrance ring and upright HUD status expose remaining life. The existing `desktop-classic` policy remains `30s` and does not wait for ship activation.

These values satisfy the roadmap's first prototype and deterministic lifecycle checks. No browser playtest was available in the implementation environment, so comparative tuning remains part of preview/device QA.
