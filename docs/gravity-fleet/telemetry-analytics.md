# Gravity Fleet telemetry and analytics

Pass 10.6 keeps gameplay counters in the engine and adds one presentation-neutral projection in `games/gravity-fleet/telemetry.mjs`.

## Projection contract

`createTelemetryProjection(...)` accepts either:

* live engine state plus `engine.counts()`, or
* an existing saved-run record.

It returns the same structured fields for every presentation:

* timer and level identity;
* Cyan, Red, Orange, and Neutral faction totals;
* combined rival status;
* controlled-world System Mix values and legend percentages;
* tactical metrics;
* fleet-strength, system-control, and launch timelines;
* outcome result, highlights, detailed statistics, event history, turning point, and run insight.

The desktop HUD and charts, mobile HUD and drawer, match-result overlay, full dashboard, and local saved-run cards render this projection. They do not independently derive gameplay totals.

The saved-run storage key and public schema are unchanged. Missing legacy portal and transit fields retain their previous fallbacks.

## Mobile chart scheduling

`createTelemetryChartScheduler(...)` owns mobile drawer chart cadence:

* closed drawer: inactive, with no scheduled timer;
* opening: immediate Fleet Strength and System Mix render;
* visible, running match: one update every 1,000 milliseconds;
* drawer close, match pause, or hidden document: pending work is cancelled;
* match end: one final render without restarting the timer.

The always-visible HUD continues to use the lightweight presentation cadence and does not depend on chart rendering.

## Drawer hierarchy

The primary drawer contains:

1. Fleet Strength over Time.
2. Controlled-world System Mix.
3. Compact tactical metrics.
4. One latest-event line.
5. Close/Resume, Reset, and Choose Level actions.

The full event history remains in post-match analytics. Short landscape uses the existing right-side sheet so the drawer does not consume the battlefield's limited height.

## Post-match hierarchy

The result overlay and dashboard now lead with:

* one outcome, score, and duration strip;
* six compact highlights;
* fleet-strength and system-control charts;
* the largest turning point and one concise run insight.

Lower-priority values remain available under `All match statistics`. The minimap heatmap, match-event history, full insight list, benchmark, and local run history remain available for desktop analytical depth.

## Validation

Run:

```bash
node tools/validate_gravity_fleet.js
```

The validator checks live projection parity, outcome and chart parity, legacy saved-run compatibility without mutation, structural surface wiring, and the complete chart scheduler lifecycle.

Deterministic validation does not measure visual readability, touch ergonomics, sheet scrolling, focus behavior, or rendered breakpoints. Those deployed-browser and mobile checks were completed for PR #20, and PR #21's mobile match-end recovery follow-up was also verified.
