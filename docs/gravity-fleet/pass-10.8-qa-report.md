# Gravity Fleet Pass 10.8 QA and cleanup report

## Release boundary

Pass 10.8 is complete and approved for merge. Pass 09.7 and PHX Transit Pass 13.1a are complete and remain preserved in their historical evidence. Joey Wisto approved HR-065 on August 4, 2026 for runtime commit `2dc732af3d3eba86f50109add77d302d49fe5255` and immutable Cloudflare preview `https://4471768d.portfolio-deo.pages.dev/`.

The authoritative row-level status, exact release-candidate commit, immutable preview URL, reviewer, date, evidence, defects, and retest state are recorded in the Portfolio Review Log. This repository report summarizes the implemented cleanup and evidence boundary without representing unperformed checks as complete. Any commit after the approved runtime candidate is documentation-only closeout unless separately identified.

## Human evidence recorded

Joey Wisto reviewed the mobile experience on August 3, 2026 and reported the following results:

- HR-050 physical phone portrait - Pass.
- HR-051 mobile landscape - Pass.
- HR-052 live orientation changes during a run - Pass.
- HR-056 touch-target usability - Pass.
- HR-061 replacement-experience parity - Pass.
- HR-062 legacy mobile shell removal - Approved.

On August 4, 2026, Joey also tested the three shipped level configurations, accepted the final orbit-speed tuning, and approved HR-065 for release.

The earlier physical review covered portrait, landscape, live orientation changes, touch usability, and modern-versus-legacy experience parity. Exact device details and screenshots were not supplied for those physical checks, so this report does not infer them.

## Approved level tuning

The final release candidate keeps Level 1 as the baseline and ships the following approved level-specific orbit-speed multipliers:

- Level 1: `1`
- Level 2: `2`
- Level 3: `3.5`

Joey Wisto manually tested the levels and approved this tuning on August 4, 2026. The dedicated validator pins these values and confirms that each successive level is faster than the prior level.

## Repeatable scenario

The canonical automated scenario is `tools/fixtures/gravity-fleet/level-1-command-sequence.json`: Level 1 (`First Orbit`), seed `20260722`, fresh run, fixed `1/60`-second steps, one Cyan launch from `(140, 400)` toward `(238, 400)`, one wormhole from `(260, 360)` to `(500, 360)`, then 720 fixed steps. The deterministic validator requires identical state for repeated runs, validates win and loss paths, and checks saved-run compatibility using `tools/fixtures/gravity-fleet/saved-run-v1.json`.

## Cleanup implemented

- Removed the `gravityMobileShell` query selector and runtime shell-flavor state.
- Removed legacy readiness, stacking, focus, camera-reservation, wormhole-lifespan, and diagnostic branches.
- Removed the legacy shell class toggles and shell-only CSS.
- Preserved the composed portrait and landscape shell, shared simulation, camera transforms, scoring, AI, physics, telemetry meanings, saved-run compatibility, and supported `gravityDebug=1` diagnostics.
- Added controlled canvas-initialization and critical-module failure states. `?gravityDebug=1&gravityCanvasFailure=1` is the supported canvas fallback simulation.
- The external module watchdog now listens for a real module-script load error, retains a five-second initialization timeout as a backup, and reconciles a delayed success by clearing the timeout, hiding a non-simulated fallback, restoring the canvas, and restoring mission setup.
- Added deterministic validator assertions that the legacy selector and compatibility branches remain absent.

## Local production-artifact evidence

The generated `dist/` artifact was served over HTTP and exercised in the Codex in-app Chromium browser on Windows. The exact browser version was not exposed by the test surface.

- Desktop setup, tutorial, match start, live canvas, forced deterministic outcome, results, post-match analytics, and focus transfer passed at 1440 x 900.
- The responsive matrix at 1280 x 720, 1366 x 768, 1440 x 900, 1920 x 1080, 360 x 800, 390 x 844, 430 x 932, 667 x 375, 844 x 390, 768 x 900, and 1024 x 768 reported zero document-level horizontal overflow.
- Direct load and refresh passed before a run and after the result flow.
- The canvas-failure simulation displayed `Tactical map unavailable`, hid the unusable canvas and setup dialog, preserved navigation, and exposed reload and project-navigation actions.
- Temporarily withholding the built critical game module caused the external watchdog to expose the same controlled fallback. The generated module was restored immediately and artifact validation was rerun. Validator coverage also proves that a successful initialization arriving after the backup timeout removes the false fallback and restores the playable setup state.
- A clean fresh tab reported no application console errors after direct load.

The in-app browser did not expose coarse-pointer emulation, reduced-motion emulation, request interception, or browser zoom controls. Those capabilities are not claimed from viewport resizing alone. Joey's physical evidence remains authoritative for the completed mobile rows, and remaining unchecked review items remain recorded as nonblocking follow-ups rather than silently marked complete.

## Module-watchdog correction artifact

PR #49 runtime commit `cda8262416806f16699fb28bf8d7ad31c666860b` corrected the module-failure watchdog. The rebuilt 122-file production artifact had SHA-256 `a582968c3f3d322ba8bd4810e1fbccd4d54bedfe072e8bdc4a8c06df76cbe1b7`. Cloudflare Pages assigned immutable deployment `2beb3b5d-fe98-43cc-a27e-07d4f42dbcdc` and URL `https://2beb3b5d.portfolio-deo.pages.dev/` to that commit.

Local rendered production-artifact QA verified that a genuinely missing generated module exposes the fallback immediately through the module script's `error` event. After the module was restored, a successful initialization remained ready beyond the five-second backup timeout with the fallback hidden, the canvas and mission setup restored, and no application console errors. The controlled `gravityCanvasFailure=1` simulation continued to display the fallback. Deterministic validator coverage separately advances the backup timeout before delivering a delayed success event and proves that the false fallback is removed and the timeout is cleared.

## Final approved release candidate

- Runtime commit: `2dc732af3d3eba86f50109add77d302d49fe5255`
- Immutable Cloudflare preview: `https://4471768d.portfolio-deo.pages.dev/`
- Cloudflare result: deploy successful
- GitHub Actions run: `30928985986` - success
- Human approval: HR-065 approved by Joey Wisto on August 4, 2026

The final runtime commit includes the approved Level 2 and Level 3 orbit-speed retuning. Joey tested the levels and accepted the release candidate.

## Validation record

`npm ci` and `uv sync --dev --locked` completed successfully. Local `npm run lint`, `npm run validate`, `npm run test`, `npm run build`, `npm run validate:dist`, and `npm run test:dist` completed successfully. The dedicated Gravity Fleet validator passed.

GitHub Actions passed formatting, tracked-source linting, repository-contract validation, deterministic tests, production-artifact testing, and diff-whitespace validation on runtime commit `2dc732af3d3eba86f50109add77d302d49fe5255`.

## HR-065 decision

**Approved.** Joey Wisto approved the exact runtime commit and immutable deployed artifact on August 4, 2026 after testing the final level tuning. No blocking defects remain for PR #49. Existing unchecked Pass 10.8 items remain visible as nonblocking follow-ups and are not represented as completed by this approval.
