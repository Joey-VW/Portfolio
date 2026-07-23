# Gravity Fleet PR C camera contract

Pass 10.3 introduces a presentation-only camera and viewport boundary without changing the shared simulation.

## Coordinate spaces

Gravity Fleet now keeps three explicit coordinate spaces:

1. **World space:** the existing 1280 × 800 level coordinates used by planets, ships, AI, combat, scoring, and telemetry.
2. **Canvas screen space:** backing-pixel coordinates used by the renderer and the camera matrix.
3. **CSS pointer space:** browser client coordinates converted to canvas screen space before the inverse camera transform returns world coordinates to the engine.

`games/gravity-fleet/camera.mjs` owns the affine matrix, inverse matrix, uniform scale, rotation, translation, tactical rectangle, viewport, and orientation mode. The browser adapter in `games/gravity-fleet-lab.js` owns DOM measurement, safe-area inputs, canvas backing resolution, resize observation, and gesture cancellation.

## Orientation policy

- Desktop uses a full-world identity-equivalent camera. Existing 1280 × 800 world and pointer coordinates map directly to the desktop backing canvas.
- Mobile portrait rotates the world by -90 degrees. The Cyan starting side maps toward the bottom while the underlying coordinates remain unchanged.
- Mobile landscape keeps the native world orientation.
- Orientation is derived from the visible tactical viewport, not a moving planet. The camera never chases Cyan's orbit.

All camera modes use uniform scale, so the world cannot stretch. Planet labels are redrawn in screen space after world rendering so they remain upright. DOM HUD, controls, telemetry, and charts never enter the world transform.

## Tactical rectangle and resize behavior

During the retained mobile presentation, the viewport adapter reserves safe-area and control space before fitting the world. Pass 10.4 will replace those interim presentation reservations with the dedicated grid shell while keeping the same camera contract.

The adapter observes:

- game-stage and canvas size changes through `ResizeObserver`;
- window resize;
- `VisualViewport` resize and scroll; and
- orientation changes.

Active launch or wormhole gestures are cancelled before a pending viewport transform is applied. Mobile canvas backing dimensions follow the visible canvas and the active presentation profile's device-pixel-ratio cap. Returning to desktop restores the identity-equivalent 1280 × 800 backing surface.

## Development diagnostics

`?gravityDebug=1` adds camera data to `window.gravityFleetDiagnostics.snapshot()` and renders temporary overlays for:

- tactical bounds and reserved margins;
- transformed world bounds;
- camera center;
- scale and rotation;
- pointer screen coordinates; and
- inverse-transformed pointer world coordinates.

Ordinary visitors do not receive the debug overlay.

## Automated verification

Run:

```bash
node tools/validate_gravity_fleet.js
```

The validator now covers desktop identity mapping, portrait rotation, bottom-oriented Cyan framing, world-corner containment, inverse transforms at every corner, native landscape orientation, resize isolation from world state, and all existing deterministic runtime, gameplay, telemetry, and saved-run checks.

Cloudflare preview and physical-device review remain the post-branch evidence gate for observable desktop parity, portrait composition, short landscape behavior, and edge targeting on real touch hardware.
