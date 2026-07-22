# Gravity Fleet PR B runtime record

## Scope

PR B implements Pass 10.2 only. It replaces the elapsed-threshold frame
skipping loop with a fixed-step runtime and explicit presentation profiles.
It does not introduce the camera, portrait shell redesign, touch redesign,
telemetry redesign, header work, hero work, or post-match redesign planned for
later passes.

## Runtime contract

The shared simulation advances at 60 fixed steps per second on every
presentation. Real elapsed time is accumulated, each animation callback may
advance zero or more fixed steps, and catch-up work is capped at eight steps.
Excess accumulated time is discarded after that cap to prevent a stalled page
from entering a simulation spiral.

Rendering is scheduled independently:

| Profile | Render schedule | HUD | Telemetry | Effects and trails |
| --- | --- | --- | --- | --- |
| Desktop High | Every display callback | 100ms | 200ms | Full |
| Mobile Balanced | 30 FPS target | 250ms | 1000ms | Reduced effects, no trails |
| Reduced Motion | Inherits desktop/mobile cadence | Inherits base | Inherits base | Decorative effects and trails disabled |

The mobile profile caps tutorial-canvas pixel density at 1.5. Desktop High
retains a cap of 2. Live charts remain available during desktop matches and
remain deferred during active mobile matches.

## Suspension and restoration

Animation-frame and live-telemetry timers are stopped while the document is
hidden. Restoration starts a fresh timing epoch, so hidden elapsed time is not
applied to the simulation. Timing is also reset after mobile presentation
breakpoint changes, orientation changes, match reset/start, and mobile drawer
transitions. Active gestures are cancelled before an orientation transition.

## Automated evidence

`node tools/validate_gravity_fleet.js` advances the same seeded Level 1 engine
for 12 simulated seconds using 30Hz, 60Hz, and 144Hz callback schedules. Each
schedule produces 720 simulation steps and the same engine checkpoint. The
validator also verifies the catch-up cap, hidden-time reset behavior, profile
separation, saved-run compatibility, telemetry consistency, controlled win and
loss paths, and the presentation-neutral engine boundary.

Development diagnostics remain available only on localhost or with
`?gravityDebug=1`. `window.gravityFleetDiagnostics.snapshot()` reports frame,
simulation, AI, combat, drawing, HUD, and chart measurements plus the active
profile and fixed-runtime counters. Dropped simulation time and steps per frame
are exposed as gauges.

## Measurement status

PR A passed the user's desktop and mobile human QA. No before/after timing
numbers were supplied, so this document does not invent a quantitative
baseline. Browser measurements for median frame time, p95 frame time, frames
over 50ms, simulation time, draw time, input response, and full-match mobile
temperature remain required on the deployed PR B preview. The historic desktop
candidate remains commit `121c1307517e0f24d02d4c5ce24c989e6bff96b3`; its
preferred visual and frame-pacing characteristics still require a direct
side-by-side comparison.
