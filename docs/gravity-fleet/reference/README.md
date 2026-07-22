# Gravity Fleet Visual References

## Purpose

This directory contains visual references for the Gravity Fleet modernization.

These files document:

* The preferred mobile design direction.
* The current mobile layouts that need to be replaced or improved.
* The specific responsive, telemetry, header, hero, and post-match problems that must remain visible during implementation.
* The intended information hierarchy for portrait and landscape mobile play.

These images are **implementation references**, not production assets. They should not be loaded by the public site or treated as exact pixel specifications.

The modernization should preserve the game’s visual identity and analytical character while implementing the underlying layout, camera, input, telemetry, and runtime requirements described in:

* `../architecture-study.md`
* `../modernization-roadmap.md`
* The relevant Gravity Fleet pass in `../../../PORTFOLIO_ROADMAP.md`

When an image conflicts with the written roadmap, the written roadmap is authoritative.

---

## Reference principles

The visual target is not to reproduce a generated image literally.

Use these references to understand:

* Hierarchy.
* Relative importance.
* Control placement.
* Information density.
* Tactical viewport dominance.
* Telemetry composition.
* Mobile interaction intent.

Do not copy:

* Generated placeholder statistics.
* Invented buttons or controls that Gravity Fleet does not support.
* Decorative labels with no matching game behavior.
* Fake charts.
* Generated planet arrangements that conflict with the real level data.
* Generated artwork that would require changing the shared simulation.

The modernization must retain one shared gameplay engine across desktop and mobile. Camera framing, controls, interface composition, chart layout, render quality, and information density may differ.

---

# Primary design reference

## `preferred-mobile-layout.png`

### Role

This is the primary mobile design reference.

It represents the preferred overall hierarchy for portrait gameplay:

1. Compact match status.
2. Large tactical battlefield.
3. Clear command controls.
4. Accessible live telemetry.
5. Minimal secondary information.

The original source was the generated image referred to during planning as `my favorite.png`. The accompanying notes identify it as the strongest design direction.

### Preserve

#### Compact top area

The top of the interface should feel minimal and meaningful.

It should prioritize:

* Current mission or level.
* Match timer.
* Compact faction status.
* Pause.
* A compact telemetry or menu trigger.

The public FPS indicator should not occupy permanent prime space. It belongs in development mode.

#### Dominant tactical viewport

The battlefield should occupy most of the usable mobile screen.

In portrait:

* The world should be presented through a rotated camera.
* The underlying world coordinates should not rotate or change.
* Cyan’s starting side should appear toward the bottom.
* The world should fit inside a tactical region that already reserves space for the HUD and command controls.
* Controls should not float arbitrarily over important planets.

The intended result is a game designed for a tall screen, not a landscape canvas scaled down until it fits.

#### Launch and Wormhole controls

Launch and Wormhole should be large, obvious, and mutually exclusive modes.

Expected behavior:

* Selecting Launch deactivates Wormhole.
* Selecting Wormhole deactivates Launch.
* The selected mode is visibly distinct.
* Switching modes cancels an incomplete gesture safely.
* Both modes use touch-drag-release interactions.

#### Clear Wormhole control

The smaller control beside Wormhole should become a dedicated Clear or Collapse Wormhole action.

It should:

* Be disabled when no Cyan wormhole exists.
* Collapse the current Cyan wormhole immediately.
* Never double as a placement control.
* Provide brief confirmation when used.

#### Fleet Strength chart

The line chart should represent **Fleet Strength over Time**.

It should:

* Display Cyan, Red, and Orange.
* Be the primary live chart in the mobile telemetry drawer.
* Update only while the drawer is visible.
* Use real telemetry values.

#### System Mix chart

The generated concept includes a non-real chart region.

Replace that region with the real **System Mix** donut chart.

It should communicate:

* Current controlled-world share.
* Cyan, Red, and Orange proportions.
* A compact legend or matching values.

The original design notes explicitly identify the generated bar-chart area as the preferred location for System Mix.

#### Compact tactical metrics

Supporting metrics should use compact label/value rows or a small grid.

Suitable examples include:

* Largest launch.
* Ships in flight.
* Deep-space fights.
* Ship transits.
* Star control.
* Wormholes.

These should not become large individual cards.

### Do not reproduce literally

* Do not add a Focus button.
* Do not use generated fake values.
* Do not freeze planets merely to match the image.
* Do not recreate generated planet locations if they differ from actual level state.
* Do not permanently display every metric shown in the concept.
* Do not treat the generated artwork as a final graphic asset.
* Do not rotate HUD text or charts sideways.

### Landscape interpretation

Do not rotate the entire portrait interface and all its text when the device enters landscape.

Instead:

* Use a landscape-specific shell.
* Keep text upright.
* Use the native landscape world orientation.
* Use a compact top HUD.
* Place controls at a side or compact lower corner.
* Prefer a side-sheet telemetry panel.
* Redraw charts for the available space.

---

# Secondary design references

## `generated-mobile-layout-1.png`

### Role

This image is a secondary composition reference.

It may help with:

* Compact top status treatment.
* Faction-status grouping.
* Pause and settings placement ideas.
* Separation between battlefield and command controls.
* Showing how a mobile game can reserve space for controls rather than overlaying everything.

### Useful ideas

* Clear division between HUD, battlefield, and controls.
* Compact faction information.
* Large touch controls.
* Persistent telemetry access.
* Strong active-mode styling.

### Avoid

* Do not copy its layout when it conflicts with the preferred reference.
* Do not add unsupported menus or controls.
* Do not crowd the battlefield with too many permanent status elements.
* Do not replace the preferred Launch/Wormhole hierarchy.

---

## `generated-mobile-layout-2.png`

### Role

This image is primarily a reference for the expanded telemetry drawer and the possibility of a Pause control.

The original design notes specifically identify:

* The Pause control as worth considering.
* The expanded telemetry panel as a useful structural example.
* The generated command and fleet submenus as unnecessary for the current game.

### Useful ideas

#### Pause

A mobile Pause control should:

* Stop simulation advancement.
* Stop AI updates.
* Stop match timers.
* Stop telemetry sampling.
* Leave the interface responsive.
* Resume without a large elapsed-time jump.

Its final location should follow the mobile shell hierarchy rather than this image literally.

#### Expanded telemetry

The image demonstrates a useful expanded-panel composition.

The real Gravity Fleet telemetry drawer should prioritize:

* Fleet Strength over Time.
* System Mix.
* A compact tactical metric grid.
* Close or Resume.
* Secondary Reset and Choose Level actions.

### Avoid

* Do not add generated command tabs.
* Do not add generated fleet-management tabs.
* Do not copy placeholder charts or values.
* Do not make the drawer consume the full screen unless the viewport genuinely requires it.
* Do not render hidden charts continuously.

---

# Current-state problem references

## `current-mobile-portrait.png`

### Demonstrates

* The desktop-oriented 16:10 battlefield being scaled to phone width.
* Excess unused vertical space.
* The tactical field occupying too little of the screen.
* Controls and status being visually disconnected from the battlefield.
* A layout that technically fits but does not feel authored for portrait play.

### Required correction

The implementation should replace this with:

* A portrait camera.
* A reserved tactical rectangle.
* A compact top HUD.
* A bottom command dock.
* A compact telemetry handle.
* Meaningful use of the available height.

### Acceptance evidence

A successful replacement should show:

* Substantially less empty space.
* A larger tactical viewport.
* Cyan’s starting side toward the bottom.
* Upright text and controls.
* No major overlaps.
* Accurate touch targeting near the edges.

---

## `current-mobile-landscape.png`

### Demonstrates

* Multiple independently positioned overlays competing for the same space.
* The return/setup action overlapping the game area.
* The telemetry trigger competing with the canvas edge.
* HUD values floating over the battlefield.
* Command controls covering or crowding tactical content.
* Short-height landscape layouts exposing the weakness of fixed positioning.

### Required correction

Landscape should use one composed layout system:

* Slim top HUD.
* Wide tactical viewport.
* Compact command dock or side controls.
* Telemetry side sheet where practical.
* Reachable return action outside critical gameplay space.

### Acceptance evidence

A successful replacement should show:

* No major controls covering important planets.
* No clipped telemetry trigger.
* No second row of game controls.
* Upright text.
* Usable short-height behavior.
* Safe-area compliance.

---

## `current-telemetry-portrait.png`

### Demonstrates

* A mobile drawer containing statistics and recent events but not the primary live charts.
* Excessive space assigned to lower-value event history.
* Metrics presented without a clear analytical hierarchy.
* Important game actions sharing space with telemetry content.

### Required correction

The portrait drawer should prioritize:

1. Fleet Strength over Time.
2. System Mix.
3. Compact tactical metrics.
4. Close or Resume.
5. Secondary Reset and Choose Level actions.

The event feed should move to one of the following:

* Post-match analytics.
* An optional Log disclosure.
* A development-only panel.
* A single latest-event line.

### Performance requirement

* Hidden charts should not redraw.
* Opening the drawer should draw immediately.
* Visible charts may update at approximately one-second intervals.
* Closing the drawer should stop chart rendering.
* Pausing or hiding the document should stop telemetry sampling.

---

## `current-telemetry-landscape.png`

### Demonstrates

* A telemetry surface occupying too much of the already limited landscape height.
* Information arranged as though the device were still in portrait.
* Large vertical scrolling requirements.
* Weak relationship between the drawer and the battlefield behind it.

### Required correction

Landscape telemetry should preferably become a side sheet.

It should:

* Preserve some tactical context.
* Keep text upright.
* Resize charts rather than rotating finished chart elements.
* Use compact metrics.
* Avoid unnecessary vertical stacking.
* Remain dismissible with one clear action.

---

## `current-mobile-hero.png`

### Demonstrates

* Excessive introductory content.
* Long copy consuming several mobile viewports.
* Hero actions clipping or overflowing.
* A mission briefing that dominates the initial phone experience.
* A page composition that delays access to the game.

### Required correction

The initial mobile hero should contain:

* Eyebrow.
* `Gravity Fleet Lab`.
* One concise value statement.
* Play.
* View Analytics.
* A collapsed How to Play or Mission Briefing disclosure.

The full mission briefing can remain available below the initial action area.

### Hero action requirements

* Use two columns when sufficient space exists.
* Stack at the narrowest widths.
* Permit safe wrapping.
* Maintain comfortable touch targets.
* Do not use the shared three-column hero-action layout for two Gravity Fleet actions.
* Do not alter unrelated project heroes unintentionally.

---

## `current-header-wrap.png`

### Demonstrates

* The project header wrapping into a second row.
* Back navigation, branding, and project navigation competing for width.
* The generic responsive header rule overriding the intended compact layout.
* Excess vertical space on short mobile viewports.

### Required correction

The project header should support explicit modes:

#### Full mode

* Back action.
* Brand identity.
* Project navigation.

#### Compact mode

* Compact back action.
* Centered or concise JW identity.
* One compact project/menu action.
* One row only.

#### Active-match mode

* Hide the portfolio header.
* Use only the game-level return action.

### Acceptance evidence

Verify the compact header at:

* 320-pixel portrait widths.
* 375-pixel portrait widths.
* 390-pixel portrait widths.
* 430-pixel portrait widths.
* The previously problematic 856 × 375-like landscape layout.
* 200 percent browser zoom where applicable.

---

## `current-post-match-metrics.png`

### Demonstrates

* Desktop KPI cards collapsing into one full-width card per metric.
* Excessive scrolling.
* Weak prioritization between outcome, important metrics, and detailed statistics.
* A technically responsive layout that is not a good mobile report.

### Required correction

The mobile post-match view should use this hierarchy:

#### Result strip

Display together:

* Victory or Defeat.
* Final score.
* Match duration.

#### Highlight grid

Use compact two-column or label/value presentation for:

* Planets captured.
* Ships destroyed.
* Largest launch.
* Ship transits.
* Wormholes.
* Peak advantage.

#### Analytical explanation

Then show:

* Fleet Strength chart.
* System-control chart.
* Turning point.
* Concise run insight.

#### Detailed statistics

Place lower-priority values beneath an expandable:

`All match statistics`

### Acceptance evidence

A successful replacement should:

* Show outcome, score, and duration without scrolling through several cards.
* Avoid one large card per metric.
* Explain why the match ended as it did.
* Preserve access to all useful statistics.
* Retain desktop analytical depth.

---

# Visual hierarchy target

## During active play

### Always visible

* Match timer.
* Compact faction state.
* Active command mode.
* Launch and Wormhole controls.
* Clear Wormhole when applicable.
* Pause.
* Telemetry access.

### Visible when contextually relevant

* Wormhole countdown.
* Star-control change.
* Launch confirmation.
* Invalid-command feedback.
* Brief tactical event feedback.

### One action away

* Fleet Strength over Time.
* System Mix.
* Tactical metrics.
* Match controls.

### Post-match only

* Full event history.
* Exhaustive KPI set.
* Detailed analytics.
* Benchmarks.
* Turning-point analysis.
* Saved-run comparison.

---

# Interaction requirements reflected by these references

## Launch mode

Mobile Launch should use:

1. Select Launch.
2. Touch an owned Cyan world.
3. Drag to gather and aim.
4. Show a live field or trajectory preview.
5. Release to launch.
6. Cancel safely on pause, orientation change, drawer opening, mode change, or pointer cancellation.

## Wormhole mode

Mobile Wormhole should use:

1. Select Wormhole.
2. Touch the desired entrance.
3. Drag toward the exit.
4. Show entrance, exit, direction, range, and validity.
5. Release to create.
6. Use Clear Wormhole to collapse it.

Two-tap placement should not remain the primary mobile behavior.

## Mode exclusivity

* Launch and Wormhole cannot be active simultaneously.
* Selecting one deactivates the other.
* The current mode must be visually clear.
* An interrupted gesture must not remain active after switching modes.

## Wormhole lifecycle

The final lifespan requires playtesting, but the first prototype should support:

* A short preparation period.
* An active countdown associated with actual ship use.
* A visible remaining-life indicator.
* A longer absolute maximum if unused.
* Immediate manual collapse through Clear Wormhole.

The lifespan must remain configurable rather than being embedded in mobile presentation code.

---

# Camera and orientation requirements

## Portrait

* Rotate the world camera 90 degrees counterclockwise.
* Keep world coordinates unchanged.
* Keep Cyan’s starting side toward the bottom.
* Keep HUD, controls, labels, and charts upright.
* Use the inverse camera transform for pointer coordinates.
* Fit the world inside a reserved tactical rectangle.
* Do not make planets stationary merely to fit the layout.
* Do not rotate continuously to follow Cyan’s moving home planet.

## Landscape

* Use the native landscape world orientation.
* Use a separate shell composition.
* Keep text upright.
* Prefer telemetry as a side sheet.
* Recalculate the tactical rectangle after browser-chrome or viewport changes.
* Cancel active gestures before applying an orientation change.

## Desktop

* Preserve the original desktop orientation.
* Restore the high-fidelity visual profile.
* Keep precise mouse input.
* Do not inherit reduced mobile rendering quality.

---

# Implementation guidance

## Use images as evidence, not as exact specifications

Implementation agents should ask:

* What hierarchy does this image establish?
* Which real Gravity Fleet data belongs in each region?
* Which generated elements are placeholders?
* Which layout choices depend on the actual viewport?
* Which controls represent existing mechanics?
* Which mechanics require explicit implementation?

They should not ask:

* How can every generated pixel be copied?
* How can the live game be forced to match an invented planet arrangement?
* How can unsupported generated buttons be made functional?
* How can the interface be rotated wholesale to imitate one screenshot?

## Preserve the shared engine

No reference image authorizes changes to:

* Level data.
* AI.
* Combat.
* Production.
* Planet motion.
* Scoring.
* Victory conditions.
* Telemetry definitions.
* Saved-run schema.

Any deliberate gameplay change requires separate roadmap scope and acceptance criteria.

## Preserve the build-light repository architecture

These references do not authorize:

* A front-end framework.
* A game engine migration.
* A bundler.
* A package manager.
* A backend.
* Third-party UI dependencies.

Such changes require explicit approval and a separate architectural decision.

---

# Screenshot handling and privacy

All committed screenshots must be reviewed before publication.

Remove or crop:

* Personal notifications.
* Email addresses.
* Account names.
* Local file paths.
* Browser profile information.
* Private preview URLs.
* Query parameters containing private data.
* Device identifiers.
* Addresses.
* Unrelated tabs.
* Tokens or credentials.
* Private client information.

Use compressed PNG, WebP, or JPEG files at a resolution sufficient for implementation review.

Do not commit:

* Original phone photo metadata when unnecessary.
* Duplicate screenshots.
* Repository packs.
* Raw conversation exports.
* Unselected generated concepts.
* Temporary QA captures that are already reproducible through repository tooling.

---

# File naming

Use stable descriptive names rather than generation timestamps.

Preferred names:

```text
preferred-mobile-layout.png
generated-mobile-layout-1.png
generated-mobile-layout-2.png
current-mobile-portrait.png
current-mobile-landscape.png
current-telemetry-portrait.png
current-telemetry-landscape.png
current-mobile-hero.png
current-header-wrap.png
current-post-match-metrics.png
```

When replacing a reference with a materially newer baseline:

* Keep the stable filename.
* Update this README.
* Record the relevant implementation commit in the change description or pull request.
* Avoid accumulating numbered copies unless historical comparison is genuinely necessary.

---

# Maintenance

Update this directory when:

* The preferred mobile direction changes.
* A current-state problem is resolved and a new baseline becomes relevant.
* A reference no longer matches the written roadmap.
* New real-device evidence materially changes an acceptance criterion.
* A screenshot contains outdated controls or terminology that could mislead future implementation.

Do not update it for:

* Small visual polish.
* Temporary in-progress states.
* Every pull-request iteration.
* Minor spacing changes.
* Generated alternatives that were not selected.

Once modernization is complete:

* Retain the preferred design reference.
* Retain a small before/after set where it is useful to explain the project.
* Remove obsolete troubleshooting screenshots that no longer provide architectural value.
* Ensure the written roadmap describes what actually shipped.

---

# Source notes

The preferred layout and generated references originated from design exploration and should be treated as conceptual material.

The current-state screenshots document the mobile layout, telemetry drawer, hero, header, and post-match issues observed before modernization.

The architectural decisions, implementation order, and acceptance criteria are defined in the Gravity Fleet architecture study and modernization roadmap, not by the generated images alone.
