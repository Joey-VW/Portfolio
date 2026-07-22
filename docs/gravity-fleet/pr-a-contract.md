# Gravity Fleet PR A Baseline and Gameplay Contract

This document records the Pass 10.0 baseline evidence and the Pass 10.1 shared
core boundary. The architecture study and modernization roadmap remain the
authoritative specification.

## Starting point and ancestry

- Intended parent pull request: PR #13, **Optimize Gravity Fleet for polished
  mobile play**.
- Source branch: `codex/make-gravity-fleet-touch-playable`.
- Starting commit: `53f1e20862067c449e7400db6a665512b74fc7f0`.
- PR #13 base branch: `codex/fix-responsive-header-layout-on-/projects` at
  `121c1307517e0f24d02d4c5ce24c989e6bff96b3`; the branch does not start from
  `main`.
- Required mobile commit:
  `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9`.
- Ancestry evidence: comparing the required mobile commit to the PR #13 head
  reports the head one commit ahead and zero commits behind, with the required
  commit as the merge base. The mobile implementation is therefore present and
  recoverable in the parent branch history.
- Working tree before source edits: the supplied scratch workspace contained
  no repository checkout. The exact PR #13 files were materialized from the
  connected repository at the starting commit; there were no local user edits
  to preserve.

## Baseline evidence

The known-good mobile reference remains
`d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9`. PR #13 records a successful full
match on a physical phone in portrait and landscape with no significant heating
observed. That evidence does not erase the documented portrait sizing,
landscape overlap, telemetry, hero, header, or post-match presentation issues.
Those are later-pass work.

The last pre-mobile ancestry point is
`121c1307517e0f24d02d4c5ce24c989e6bff96b3`. It is a desktop reference
candidate, not a verified preferred desktop baseline. Commit history establishes
its position, but the available screenshots cannot demonstrate frame pacing,
trail/effect quality, or mouse responsiveness. No historical browser trace or
authenticated historical checkout was available for direct verification.

The curated reference images and the additional project-source images were
reviewed as presentation evidence. They guide later portrait shell, header,
hero, telemetry, and post-match passes; none is treated as proof of interaction,
performance, thermal behavior, or a reason to redesign PR A.

## Responsibility contract

| Area | Owner in PR A | Contract |
| --- | --- | --- |
| Level definitions and initial conditions | Engine | One shared level registry; same seeds, orbit paths, production, AI tuning, home fleets, and neutral defenders. |
| Simulation and entities | Engine | Planet motion, gravity, ships, wormholes, combat, capture, production, victory, defeat, and score equations remain shared. |
| AI | Engine | Shared team memory, targeting, launch staging, wormhole decisions, opening grace, and wave sizing. |
| Gameplay commands | Engine | Presentation-neutral begin/update/commit/cancel launch and wormhole commands, clear/toggle wormhole, pause, resume, and reset. |
| Runtime | Page bootstrap | Existing variable-delta clock, frame limiter, visibility handling, requestAnimationFrame scheduling, and HUD cadence. Fixed timestep is PR B. |
| Camera and view | Page bootstrap | Canvas/world projection, viewport sizing, drawing, effects display policy, and static layers. No camera redesign is included. |
| Input adapters | Page bootstrap | Existing pointer, touch, keyboard, pointer-capture, coarse-target, right-click, and two-tap mobile wormhole behavior translated to commands. |
| Telemetry production | Engine | Raw launch, capture, combat, wormhole, heatmap, ownership, fleet, and outcome totals. |
| Telemetry projection | Page bootstrap | Live charts, drawers, labels, cards, analysis, and DOM cadence consume shared engine state. |
| Persistence | Engine helpers plus bootstrap adapter | Storage key remains `gravityFleetRuns`; the public run object keeps the existing fields and the five-run limit. Unreadable storage still falls back safely. |
| Desktop/mobile presentation policy | Page bootstrap | Media queries, device/coarse-pointer policy, layout, mobile stage portal, drawer, quality, and trail/effect display decisions remain outside the engine. |

The files intentionally stay cohesive rather than splitting every helper:

- `games/gravity-fleet/levels.mjs`: level registry and immutable shared
  constants.
- `games/gravity-fleet/core.mjs`: state, simulation, AI, commands, outcomes,
  telemetry, scoring, serialization, seeded validation random source, and
  storage compatibility helpers.
- `games/gravity-fleet/performance.mjs`: zero-work disabled monitor and bounded
  development samples.
- `games/gravity-fleet-lab.js`: route bootstrap, runtime scheduling, rendering,
  input compatibility adapters, DOM projection, charts, and presentation.

The engine modules do not query the DOM, viewport, canvas, media queries,
orientation, device type, drawer state, CSS, or portfolio header.

## Deterministic fixtures

`tools/fixtures/gravity-fleet/level-1-command-sequence.json` uses an explicit
seed and commands a Level 1 launch, a player wormhole, and twelve seconds of
simulation. Normal public play still receives the engine's default
`Math.random`; no global browser random source is replaced.

`tools/fixtures/gravity-fleet/saved-run-v1.json` is synthetic, contains no
browser export or identifying data, and represents the current saved-run shape.
PR A does not rename the storage key or change the public schema.

Run both through:

```bash
node tools/validate_gravity_fleet.js
```

The validator also initializes every level, compares repeated checkpoints,
checks controlled win and loss paths, confirms telemetry relationships, checks
serialization keys, exercises command handling, and scans the engine boundary
for presentation dependencies.

## Development-only performance measurements

Instrumentation is enabled only on localhost or with the existing
`?gravityDebug=1` access gate. Normal visitors receive a disabled monitor whose
measurement wrapper immediately invokes the original work and whose gauges are
no-ops. No periodic console output is added.

When enabled, `window.gravityFleetDiagnostics.snapshot()` reports bounded
samples for simulation, AI, combat, canvas draw, HUD/DOM, and chart time; active
ship and effect counts; median and 95th-percentile frame time; sampled frames
over 50 ms; and total observed long frames. The monitor observes work but does
not feed values back into simulation.

## Deferred work

PR A does not introduce the fixed-timestep runtime, portrait camera, mobile
shell redesign, touch redesign, telemetry redesign, header or hero changes, or
post-match redesign. Those remain Pass 10.2 and later.
