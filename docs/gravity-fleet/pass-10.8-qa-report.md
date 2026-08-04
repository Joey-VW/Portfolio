# Gravity Fleet Pass 10.8 QA and cleanup report

## Release boundary

Pass 10.8 is the active Gravity Fleet release gate. Pass 09.7 and PHX Transit Pass 13.1a are complete and remain preserved in their historical evidence. HR-065 remains pending Joey Wisto's final approval after the pull request and immutable Cloudflare preview are ready.

The authoritative row-level status, exact release-candidate commit, immutable preview URL, reviewer, date, evidence, defects, and retest state are recorded in the Portfolio Review Log. This repository report summarizes the implemented cleanup and the evidence boundary without duplicating uncaptured artifacts.

## Human evidence recorded

Joey Wisto reviewed the mobile experience on August 3, 2026 and reported the following results:

- HR-050 physical phone portrait - Pass.
- HR-051 mobile landscape - Pass.
- HR-052 live orientation changes during a run - Pass.
- HR-056 touch-target usability - Pass.
- HR-061 replacement-experience parity - Pass.
- HR-062 legacy mobile shell removal - Approved.

The review covered portrait, landscape, live orientation changes, touch usability, and modern-versus-legacy experience parity. Exact device details, screenshots, commit identifiers, and deployment URLs were not supplied for those physical checks, so this report does not infer them.

## Repeatable scenario

The canonical automated scenario is `tools/fixtures/gravity-fleet/level-1-command-sequence.json`: Level 1 (`First Orbit`), seed `20260722`, fresh run, fixed `1/60`-second steps, one Cyan launch from `(140, 400)` toward `(238, 400)`, one wormhole from `(260, 360)` to `(500, 360)`, then 720 fixed steps. The deterministic validator requires identical state for repeated runs, validates win and loss paths, and checks saved-run compatibility using `tools/fixtures/gravity-fleet/saved-run-v1.json`.

## Cleanup implemented

- Removed the `gravityMobileShell` query selector and runtime shell-flavor state.
- Removed legacy readiness, stacking, focus, camera-reservation, wormhole-lifespan, and diagnostic branches.
- Removed the legacy shell class toggles and shell-only CSS.
- Preserved the composed portrait and landscape shell, shared simulation, camera transforms, scoring, AI, physics, telemetry meanings, saved-run compatibility, and supported `gravityDebug=1` diagnostics.
- Added controlled canvas-initialization and critical-module failure states. `?gravityDebug=1&gravityCanvasFailure=1` is the supported canvas fallback simulation.
- Added deterministic validator assertions that the legacy selector and compatibility branches remain absent.

## Local production-artifact evidence

The generated `dist/` artifact was served over HTTP and exercised in the Codex in-app Chromium browser on Windows. The exact browser version was not exposed by the test surface.

- Desktop setup, tutorial, match start, live canvas, forced deterministic outcome, results, post-match analytics, and focus transfer passed at 1440 x 900.
- The responsive matrix at 1280 x 720, 1366 x 768, 1440 x 900, 1920 x 1080, 360 x 800, 390 x 844, 430 x 932, 667 x 375, 844 x 390, 768 x 900, and 1024 x 768 reported zero document-level horizontal overflow.
- Direct load and refresh passed before a run and after the result flow.
- The canvas-failure simulation displayed `Tactical map unavailable`, hid the unusable canvas and setup dialog, preserved navigation, and exposed reload and project-navigation actions.
- Temporarily withholding the built critical game module caused the external watchdog to expose the same controlled fallback after three seconds. The generated module was restored immediately and artifact validation was rerun.
- A clean fresh tab reported no application console errors after direct load.

The in-app browser did not expose coarse-pointer emulation, reduced-motion emulation, request interception, or browser zoom controls. Those capabilities are not claimed from viewport resizing alone. Joey's physical evidence remains authoritative for the completed mobile rows, while the final immutable Cloudflare artifact and any remaining agent-executable row limitations must be recorded honestly in the Review Log.

## Validation record

`npm ci` and `uv sync --dev --locked` completed successfully. `npm run lint`, `npm run validate`, `npm run test`, `npm run build`, `npm run validate:dist`, and `npm run test:dist` completed successfully. The dedicated Gravity Fleet validator passed.

`npm run format:check` and therefore the aggregate `npm run check` remain blocked by pre-existing Prettier findings in the untouched files `docs/architecture/cloudflare-dist-cutover-runbook.md` and `docs/architecture/current-route-and-deployment-inventory.md`. Pass 10.8 does not modify those files or claim that failure as resolved.

## HR-065 recommendation

After the pull request produces an immutable Cloudflare preview, repeat the supported final artifact checks and review the consolidated Review Log evidence. If no blocking regression appears, Pass 10.8 is suitable for Joey Wisto's final HR-065 decision. HR-065 must remain `Not Started` until Joey explicitly approves the exact commit and deployed artifact.
