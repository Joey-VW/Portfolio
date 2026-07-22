# Portfolio Roadmap

> North star: make joewisto.com immediately understandable, easy to explore, honest about what is finished, and strong enough that every public project demonstrates both technical judgment and thoughtful presentation.

- Last reviewed: July 22, 2026
- Primary tracker: this file
- Public project registry: `data/projects.json`

## How to use this roadmap

- Check an item only after its acceptance criteria are met.
- Keep one focused branch or pull request per recommended pass unless two items are inseparable.
- Update the status table when work starts, becomes blocked, or is completed.
- Add newly discovered work to the relevant pass instead of creating an unprioritized list at the bottom.
- Treat accessibility, reduced motion, responsive behavior, and plain-language copy as part of completion rather than follow-up polish.

Status labels:

- `NEXT` - the recommended starting queue.
- `IN REVIEW` - implementation is complete in a draft pull request and awaiting final verification.
- `READY` - clear and unblocked.
- `BLOCKED` - waiting on another pass or an external setup step.
- `LATER` - intentionally deferred until higher-impact work is complete.
- `DONE` - implemented and verified.

## Recommended execution order

| Pass | Status | Outcome | Main dependencies |
| --- | --- | --- | --- |
| 01. Project governance | DONE | Only ready projects appear publicly and all project ordering has one source of truth. | None |
| 02. Landing page clarity | DONE | The top-level rÃ©sumÃ© content is polished, the supplied metric-card issue is fixed, and outdated copy is removed. | Pass 01 for project links |
| 03. Showcase launcher controls | DONE | Launcher sizing, polar placement, and the full development lab are easier to tune. | Pass 01 for project order |
| 04. Shrinkflation reliability | DONE | The hero is tighter, product imagery is resilient, and the weekly Kroger update is automated. | Secrets for automation |
| 05. EV hero animation | DONE | The EV case study opens with a responsive, purposeful car-and-charger scene. | Preserve the animation prototype until complete |
| 06. Gravity Fleet game flow | DONE | Match flow, navigation, terminology, level-three fairness, and command states feel intentional. | None |
| 07. Gravity Fleet analytics | DONE | Analytics, minimap, control hints, and planet-motion implementation are complete; physical validation is deferred to Pass 12. | Pass 06 |
| 08. Faithful publishing-system integration | DONE | Postcard Atlas was structurally integrated beneath its final project-scoped routes and is public/ready. | PR #3 merged July 19, 2026 |
| 09. Mobile layout corrections and responsive bug fixes | NEXT | Resolve the confirmed mobile and responsive findings in `MOBILE_QA_REPORT.md`. | Pass 08 structural integration |
| 10. Gravity Fleet modernization | NEXT | Preserve the proven mobile prototype, extract one shared game engine, restore desktop fidelity, and deliver purpose-built desktop and mobile presentations with a camera system, touch controls, live telemetry, and compact analytics. | Pass 06, Pass 07, PR #13 mobile reference, and Pass 09 shared-header coordination |
| 11. Production deployment and custom-domain release | BLOCKED | Complete custom-domain and final production-route work; contact delivery remains deferred. | Pass 09, Pass 10, and domain access |
| 12. Final repository validation and release QA | LATER | Complete final repository validation after mobile corrections, Gravity Fleet device QA, and production-route release. | Pass 11 production release |

The recommended execution order is:

1. Completed governance and feature passes.
2. Completed faithful Pass 08 publishing-system integration.
3. Pass 09 mobile layout corrections and responsive bug fixes.
4. Pass 10 staged Gravity Fleet modernization, including shared-core extraction, desktop restoration, mobile camera/shell work, and device verification.
5. Pass 11 custom-domain and production-route release.
6. Pass 12 final repository validation and release QA.
7. Deferred backend and operational automation work.

## Decisions already made

These choices remove ambiguity from later implementation work.

1. **The site stays build-light.** Continue with plain HTML, CSS, and JavaScript unless a specific feature clearly justifies a build step.
2. **This roadmap is the internal progress tracker.** Do not create a second large tracking system. `data/projects.json` should contain only the small amount of lifecycle metadata needed by the frontend.
3. **Unfinished projects are filtered explicitly.** Add `status`, `visibility`, and `createdAt` fields instead of relying on array position, `featured`, or missing links.
4. **Project order is newest first.** Both the projects page and Showcase launcher sort by the same `createdAt` field in descending order.
5. **The contact form should eventually submit.** Keep the current email-draft fallback until a Cloudflare endpoint is deployed and verified. Do not ship a submit button that silently fails.
6. **Gravity Fleet work is split into game-flow and analytics passes.** The combined request is too large for one safe, reviewable change.
7. **Global cleanup happens after prototype extraction.** In particular, keep the looping-animation prototype until the EV animation and any remaining reusable scenes have been integrated.
8. **Repository-history remediation is complete.** This repository is the clean active replacement, and normal feature work proceeds from clean `main`. Do not add another history-rewrite or repository-replacement task to this roadmap.
9. **Pass 08 has an approved source.** Its already-anonymized, fictional implementation has been relocated to the project-scoped demo route. Its preservation contract appears in Pass 08.
10. **Gravity Fleet uses one gameplay engine with adaptive presentations.** Desktop and mobile must share level data, simulation, AI, combat, scoring, telemetry meanings, analytics, and saved-run compatibility. Camera framing, input adapters, interface composition, chart layout, render quality, and information density may differ. Do not introduce a game framework, bundler, package manager, backend, or new runtime dependency unless profiling later proves a renderer migration is justified and Joe Wisto explicitly approves it.

## Pass 01 - Project governance

Implemented and verified July 15, 2026. The current registry contains five public/ready projects and three hidden/in-progress projects. Automated HTTP DOM verification confirms that every public consumer uses the same lifecycle filter and creation-date order. This pass is complete.

### 01.1 Add explicit lifecycle metadata

- [x] Add the following fields to every entry in `data/projects.json`:
  - `createdAt`: an ISO date such as `2026-07-14` representing when the project was originally created, not when its card was added to this repository.
  - `status`: `ready`, `in-progress`, or `planned`.
  - `visibility`: `public` or `hidden`.
- [x] Treat a project as publishable only when `status === "ready"` and `visibility === "public"`.
- [x] Filter the homepage cards, projects page, and Showcase launcher through the same publishability helper.
- [x] Keep `featured` only as a selection signal for the homepage and launcher, not as a readiness signal.
- [x] Add `noindex` to unfinished standalone pages that must remain reachable during development.

Acceptance criteria:

- Hidden or unfinished projects do not appear in any public project list or launcher.
- Direct URLs are understood to be unlisted, not access-controlled. Anything sensitive must not be committed or deployed.
- Invalid or missing lifecycle values fail closed and do not publish a card by accident.
- The expected number of public cards is documented in the pull request and verified on the homepage, `/projects/`, and the launcher.

### 01.2 Use creation date as the shared order

- [x] Add one `sortProjectsNewestFirst()` helper and reuse it wherever project cards or launcher nodes are rendered.
- [x] Sort by `createdAt` descending, then title ascending as a deterministic tie-breaker.
- [x] Remove `showcase.order` once all consumers use the date sort, or retain it only if a documented manual override is still genuinely needed.
- [x] Confirm the actual creation date of each older project rather than guessing from the current JSON order.

Acceptance criteria:

- The homepage, projects page, and Showcase launcher present public projects in the same newest-first order.
- The EV case study, Shrinkflation Tracker, Gravity Fleet Lab, and other recent work land in the expected relative order.
- Adding a future project requires entering its date once, with no second ordering array to maintain.

## Pass 02 - Landing page clarity and credibility

### 02.1 Fix the annotated impact card

Reference: `ScreenShot_7_15_2026_9_39_24_AM.png`.

- [x] Vertically align the first metric label with the labels in the other three metric cards.
- [x] Preserve the equal card heights and the large-number hierarchy.
- [x] Prefer a consistent content grid or shared label position over a one-off transform on the first card.

Acceptance criteria:

- All four metric labels begin on the same visual baseline at desktop widths.
- Wrapped labels remain readable and do not collide with the metric values at tablet or mobile widths.
- Print layout remains aligned.

### 02.2 Add contract work to the current timeline entry

- [x] Retitle the entry to `Independent Technical Projects & Career Development` unless a stronger, equally accurate title emerges during copy review.
- [x] Change the company line to `Contract work, portfolio systems, and applied technical development`.
- [x] Add client work without naming the client or implying a specific number of clients.
- [x] Use copy along these lines:
  - `Delivered client-facing web and publishing workflows that connected a responsive static site with Google Sheets, Forms, Drive, Apps Script, and Cloudflare.`
  - `Built supporting automation and content-management tools that let nontechnical users update posts, photos, maps, and shared content without editing code.`
- [x] Retain one concise bullet covering self-directed analytics, automation, BI, and front-end development.
- [x] Verify the date range and wording before publishing.

Acceptance criteria:

- The entry clearly shows real delivery work in addition to study and portfolio building.
- It does not name a private client, expose client details, or claim multiple clients.
- It reads naturally in both the website and print rÃ©sumÃ©.

### 02.3 Generalize the contact card

- [x] Replace `Recruiter-friendly contact` with a neutral label such as `Get in touch`.
- [x] Use a casual, specific heading that welcomes both roles and projects, for example `Have a role, project, or messy workflow to untangle?`
- [x] Update the body copy to mention full-time technical roles and selective contract work without sounding like an agency pitch.
- [x] Replace recruiter-only placeholders with neutral examples such as `Your name`, `you@company.com`, and `Tell me a little about the role or project...`.
- [x] Keep direct email, LinkedIn, and GitHub paths visible even after real form submission is added.

Acceptance criteria:

- Recruiters and potential clients both feel addressed.
- The tone stays warm, capable, and concise.
- The print version remains career-focused and does not include an unusable form.

### 02.4 Remove outdated footer copy

- [x] Delete `Homepage remains optimized for recruiter-friendly browser print-to-PDF.` from the footer.
- [x] Tighten the remaining footer sentence if it repeats information already stated elsewhere on the page.

### 02.5 Normalize em dashes

- [x] Replace user-facing and internal prose uses of the em dash character with ` - ` where punctuation is intended.
- [x] Include HTML, JavaScript strings, JSON copy, Markdown, comments, labels, error messages, and sample data.
- [x] Do not replace en dashes used in date ranges, minus signs, hyphens inside words, or code syntax.
- [x] Run a repository-wide search for the literal em dash before completing the pass and document any intentional exceptions.

Acceptance criteria:

- A repository search for Unicode `U+2014` returns no unintended occurrences in maintained source files.
- Replacements do not introduce double spaces, broken wrapping, or malformed data.

## Pass 03 - Showcase launcher controls - DONE

### 03.1 Slightly increase launcher scale

- [x] Increase desktop hub, node, scene, and label sizing by roughly 5 to 8 percent as a coordinated system.
- [x] Tune spacing after the size change so nodes remain inside viewport margins and do not overlap.
- [x] Keep mobile growth smaller or unchanged if the current two/three-column layout would become crowded.
- [x] Preserve the existing depth and visibility shadows.

Acceptance criteria:

- Labels are easier to read without making the launcher dominate the page.
- All seven nodes remain fully visible and collision-free at the supported desktop breakpoints.
- Browser zoom, reduced motion, coarse pointer, and compact-height behavior remain usable.

### 03.2 Add polar node configuration without replacing launcher logic

- [x] Replace the hand-authored pixel tuple source with a readable polar configuration such as:

```js
const nodePlacements = [
  { angle: 205, radius: 298 },
  { angle: 262, radius: 164 },
  // ...
];
```

- [x] Define the coordinate convention explicitly: `0deg = right`, `90deg = down`, `180deg = left`, and `270deg = up`.
- [x] Add a pure `polarToOffset({ angle, radius })` helper that returns the existing `[x, y]` tuple format.
- [x] Generate `offsets` from `nodePlacements` so downstream layout and motion logic do not need to be rewritten.
- [x] Seed the polar values from the current positions so the default launcher shape does not unexpectedly change.
- [x] Normalize angles into the `0-359` range and reject non-finite radii in development mode.

Acceptance criteria:

- Editing only angle rotates a node around the hub.
- Editing only radius moves a node toward or away from the hub.
- Current collision handling, line endpoints, resize behavior, and motion remain intact.

### 03.3 Expand Motion Lab into Showcase Dev Lab

- [x] Rename the local-only control panel to `Showcase Dev Lab`.
- [x] Add top-level tabs for `Showcase` and reserve room for future component labs only if needed.
- [x] Within Showcase, add subtabs for `Layout`, `Nodes`, `Hub`, `Lines`, and `Motion`.
- [x] Generate controls from configuration descriptors instead of maintaining one custom control list per tab.
- [x] Support live preview, group reset, reset all, replay, and copy of the full `showcaseConfig` object.
- [x] Add polar angle/radius controls for each node placement under `Layout`.
- [x] Keep the lab available only on localhost, through the explicit debug query parameter, or from previously enabled local development state.
- [x] Make tabs and controls keyboard accessible with clear focus states.

Acceptance criteria:

- Every current `showcaseConfig` group can be inspected and adjusted at runtime.
- Copied output can replace the source config with minimal cleanup.
- The development panel never appears for an ordinary production visitor.

### 03.4 Add file-backed Dev Lab saves

- [x] Add tracked original and saved Showcase configuration snapshots in `data/showcase-config.json`.
- [x] Load the production launcher from the saved configuration snapshot with validation before applying it.
- [x] Add a local-only validated Save endpoint for repository-backed Dev Lab saves.
- [x] Replace reset-all behavior with Reset to saved.
- [x] Add an advanced Restore originals action that persists the original baseline into the saved snapshot.
- [x] Remove configuration dependence on local storage while retaining the local panel-enable preference.
- [x] Document the dedicated local save workflow.

Acceptance criteria:

- Normal static and production-style page loads read the committed saved configuration.
- Dev Lab Save writes only the `saved` block in `data/showcase-config.json` through the dedicated local server.
- Reset restores the last file-backed save without writing to the server.
- Restore originals requires confirmation and preserves the immutable `original` block.
- Legacy local-storage configuration no longer overrides committed configuration.

## Pass 04 - Shrinkflation reliability

### 04.1 Remove excess hero whitespace

Reference: `ScreenShot_7_15_2026_12_40_28_PM(1).png`.

- [x] Change the desktop hero grid from bottom-aligned to top-aligned so the title and shelf signal begin together.
- [x] Reduce oversized top padding and grid gaps only after alignment is corrected.
- [x] Keep the shelf signal, definition, and reading guide intact.
- [x] Avoid shrinking type or collapsing the guide simply to make the hero shorter.

Acceptance criteria:

- The large blank areas above the title and Shelf Signal are gone.
- The hero still has comfortable breathing room and a clear two-column hierarchy.
- Tablet and mobile remain single-column with no crowded transitions.

### 04.2 Make product images resilient

- [x] Measure current image coverage: products with no image data, products with broken URLs, and products with a valid rendered image.
- [x] Update image selection to build an ordered candidate list across front/featured perspectives and available sizes.
- [x] On image failure, try the next candidate before falling back to category art.
- [x] Keep a deterministic, polished local fallback so no card ever shows a broken-image icon or an empty block.
- [x] Normalize chosen image metadata during the Kroger fetch so frontend selection is simple and testable.
- [x] Check Kroger image-storage and redistribution terms before committing downloaded product images. If local caching is not clearly allowed, use live URLs plus local category art.
- [x] Add fixture coverage for missing images, malformed image arrays, and one valid fallback size.

Acceptance criteria:

- Every product card has either a working product image or intentional fallback art.
- Opening and closing the image modal remains keyboard accessible.
- A failed full-size modal image degrades gracefully instead of leaving a blank dialog.

### 04.3 Automate the weekly Kroger fetch

- [x] Add a GitHub Actions workflow with both `workflow_dispatch` and a Wednesday schedule.
- [x] Schedule it for 8:15 AM `America/Phoenix` to avoid the busiest top-of-hour window.
- [x] Store Kroger credentials and location values in repository Actions secrets. Never write them to frontend data, logs, or artifacts.
- [x] Run the offline merge fixture before the live call.
- [x] Fetch and apply observations through `tools/fetch_kroger_products.py`.
- [x] Validate the output, fail on empty or clearly suspicious results, and commit only the intended data file when it actually changed.
- [x] Add workflow concurrency so two fetch runs cannot write competing updates.
- [x] Document manual recovery and match-review steps in `tools/README.md`.

Acceptance criteria:

- The workflow can be run manually before the schedule is enabled.
- A successful no-change run produces no commit.
- A failed API or validation run leaves production data untouched and exposes a useful Actions error.
- A successful data commit triggers the normal Cloudflare deployment once Pass 11 is complete.

Reference: GitHub scheduled workflows support cron schedules and IANA timezones, and run from the default branch: <https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#schedule>.

## Pass 05 - EV hero animation

Reference: `ScreenShot_7_15_2026_1_14_00_PM.png` and the car scene in `3-looping-animations(1).html`.

Preserve the existing desktop hero composition, especially the width, scale, and wrapping of â€œThe Real Cost of Public Charging.â€ Nest the car-and-charger animation into the open lower-right area rather than converting the entire hero into two columns.

* [x] Keep the eyebrow and primary headline in the existing full-width hero flow so the headline retains its current desktop width, scale, and line wrapping.
* [x] Create a lower hero composition in which the supporting title, summary, and actions remain on the left while the car-and-charger scene occupies the existing open area on the right.
* [x] Avoid moving or materially narrowing the existing desktop text elements. Use the available negative space rather than redesigning the hero around the animation.
* [x] Give the scene a responsive, bounded stage that fills the available area without relying on fragile page-level absolute positioning.
* [x] Extract only the necessary SVG, CSS, and JavaScript from `3-looping-animations(1).html` instead of embedding the standalone prototype.
* [x] Adapt the extracted scene to the EV case studyâ€™s cyan, violet, amber, line-weight, glow, and rounded-panel language.
* [x] Keep the car in gentle motion rather than leaving it fully stopped at either end of its path.
* [x] Ensure wheel rotation follows the vehicleâ€™s direction when approaching and leaving the charger.
* [x] Keep the charger, cable, charging indicator, and car readable at the sceneâ€™s actual rendered size.
* [x] Make the scene communicate the public-charging cost story rather than functioning as a generic driving animation.
* [x] At narrower widths, move the visual below the supporting copy and actions without changing the documentâ€™s reading order.
* [x] Provide a composed static state for `prefers-reduced-motion` that still shows the car, charger, cable, and charging context.
* [x] Preserve the existing hero navigation, links, section anchors, accessibility, and the content immediately following the hero.

Acceptance criteria:

* The eyebrow and headline retain their current desktop prominence and approximately the same line wrapping.
* The animation occupies the annotated lower-right opening rather than forcing the entire hero into equal columns.
* The supporting title, summary, and action buttons remain comfortably readable and are not compressed simply to make room for the visual.
* The scene feels intentionally nested within the hero, with no unnecessary inner panel or competing headline treatment.
* The hero remains visually balanced at wide and narrower desktop widths.
* The scene does not overlap the headline, supporting copy, actions, or subnavigation.
* The animation does not add enough height to push the subnavigation or following section below the fold unnecessarily at a representative desktop viewport.
* Tablet and mobile layouts place the scene below the copy in a clear single-column sequence.
* No clipping, horizontal overflow, or unreadably small scene details occur at supported desktop, tablet, or mobile widths.
* Wheel motion, vehicle direction, charger state, and cable behavior remain visually coherent.
* Reduced-motion mode presents a polished static charging scene with no essential information dependent on animation.
* The extracted scene uses no external image dependency and does not interfere with the existing EV calculator behavior.
* The source prototype remains in the repository until the extraction and responsive behavior are verified, after which it becomes eligible for the cleanup pass.


## Pass 06 - Gravity Fleet game flow

### 06.1 Add intentional end-of-match actions

* [x] When a match ends, show an outcome panel with the result and three actions:

  * `View match analysis` - render the completed match dashboard if needed, scroll it into view, and move focus to the analytics heading.
  * `Play again` - reset and immediately restart the currently selected level, center the game canvas in the viewport, and move focus back to the game.
  * `Choose level` - reset safely, return to the existing level-selection overlay, center the game canvas, and focus the currently selected level.
* [x] Keep keyboard focus inside the outcome panel until an action is chosen, then release the focus trap and move focus to the selected destination.
* [x] Do not auto-scroll when victory or defeat occurs; scroll only after the player chooses an outcome action.

### 06.2 Center the canvas after game-progression actions

- [x] Add one reusable `scrollGameIntoView()` helper using `block: "center"` and respecting reduced motion.
- [x] Call it after actions that advance the playable state, including starting a level, replaying/resetting, and progressing to a new level.
- [x] Do not attach it to controls that only change a setting or tutorial slide.

### 06.3 Connect game and telemetry navigation

- [x] Add a small, non-blocking badge near the lower edge of the game area: `Live telemetry recording`.
- [x] Make the badge scroll to the live telemetry module when clicked.
- [x] Add a floating `Back to game` button that scrolls and centers the canvas.
- [x] Show `Back to game` only after the visitor has left the canvas area for telemetry/analytics; hide it while the canvas is substantially visible.
- [x] Use `IntersectionObserver` rather than permanent scroll-event polling.

### 06.4 Improve level-three opening fairness

- [x] Add a configurable 10-second opening grace period to Broken Helix.
- [x] During the grace period, Red and Orange may expand, reinforce, or fight elsewhere, but may not target the player's home planet.
- [x] After 10 seconds, restore the normal AI scoring and targeting behavior.
- [x] Keep the rule scoped to level three unless playtesting shows it should be generalized.

### 06.5 Normalize naming and dashboard copy

- [x] Change all player-facing uses of `Rival` to `Red`.
- [x] Preserve internal identifiers such as `enemy` unless renaming them clearly improves maintainability and can be done safely.
- [x] Change `Live + post-match analytics dashboard` to `Post-match analytics dashboard`.
- [x] Update legends, event messages, tutorial copy, summaries, sample run labels, and accessibility text.

### 06.6 Give the command dock clear pre-game, live, and post-game states

- [x] Define three explicit dock modes:
  - **Pre-game:** level objective, selected difficulty, short control reminder, and a clear start action.
  - **Live:** current objective, selected source/target context, fleet readiness, and meaningful live telemetry.
  - **Post-game:** outcome, strongest match signal, and direct analysis/replay actions.
- [x] Hide or disable controls that have no meaning in the current state instead of showing inert placeholders.
- [x] Use status copy that explains what the player can do next.

Acceptance criteria for Pass 06:

- A player can move from level selection to play, telemetry, analysis, and replay without losing their place.
- Broken Helix never sends an AI wave to the player's home planet during the first 10 seconds.
- No player-facing `Rival` copy remains.
- Command dock content always reflects the current game state.
- All new navigation works with keyboard, reduced motion, and mobile layouts.

## Pass 07 - Gravity Fleet analytics and tuning - DONE

Implementation was completed July 18, 2026. Live telemetry uses a configurable 200ms timer outside the gameplay animation loop and skips unchanged chart and DOM work. Run summaries provide evidence-based observations and replay guidance; leaderboard, recent-run, and minimap improvements are implemented. Control-hint mouse icons were enlarged, and `PLANET_MOTION_MULTIPLIER` is 1.2 without changing ship movement constants.

The remaining laptop/mobile frame-pacing measurements and planet-motion fairness playtesting are deliberately deferred to Pass 12. They have not yet passed and must not be represented as complete physical validation.

### 07.1 Increase live telemetry cadence safely

- [x] Move the current live telemetry interval from 350ms to a configurable target near 200ms.
- [x] Avoid rebuilding expensive DOM or charts when underlying values have not changed.
- [x] Keep gameplay animation on `requestAnimationFrame` and telemetry rendering on its own cadence.
- [ ] Defer dropped-frame measurement on a typical laptop and physical mobile hardware to Pass 12.

### 07.2 Make run summary insights more specific

- [x] Expand the summary from three generic sentences into evidence-based observations derived from the run.
- [x] Cover opening pace, fleet efficiency, capture sequence, combat outcome, wormhole use, and the largest turning point when data is available.
- [x] Avoid claiming causation that the telemetry cannot support.
- [x] Provide one concrete replay suggestion tied to the selected level.

### 07.3 Improve leaderboard and recent-run cards

- [x] Add percentile or benchmark context, not just rank.
- [x] Allow recent local runs to be selected and re-rendered in the dashboard.
- [x] Add clear empty states and a small `Clear local runs` action with confirmation.
- [x] Show level, outcome, score, duration, and timestamp consistently.
- [x] Distinguish mock benchmark runs from the visitor's local runs.

### 07.4 Replace the abstract grid with a minimap heatmap

- [x] Record movement and combat intensity in normalized canvas coordinates with explicit heatmap width and height metadata.
- [x] Render a compact minimap matching the selected level's canvas proportions.
- [x] Draw recognizable planet positions/orbits and overlay movement/combat intensity in the correct spatial locations.
- [x] Add a legend or mode toggle if movement and combat need separate readings.
- [x] Preserve an accessible text summary of the hottest regions.

### 07.5 Improve control hints and planet motion

- [x] Increase the mouse icons in the control hints while keeping the accompanying text compact.
- [x] Increase base planet-orbit speed by approximately 15 to 25 percent through a dedicated planet-motion multiplier.
- [x] Do not change ship orbit, travel, formation, or combat speeds as part of this item.
- [ ] Defer fairness playtesting of the faster planets, level objectives, and wormhole placement to Pass 12.

Acceptance criteria for Pass 07 implementation:

- Live widgets render close to real time without coupling telemetry work to gameplay animation.
- Selecting a past run updates the dashboard reliably.
- The heatmap can be related back to the actual map at a glance.
- Planet motion is more visible while ship behavior remains unchanged.

## Pass 08 - Faithful multi-platform publishing-system integration - DONE

Structural integration was merged in PR #3 on July 19, 2026. The approved, already-anonymized, fictional Postcard Atlas source was moved faithfully into its final project-scoped routes: `/projects/multi-platform-publishing-system.html` for the portfolio case study and `/projects/multi-platform-publishing-system/demo/` for the self-contained demo. The registry now correctly lists the project as `public` and `ready`.

All local fallback imagery and background-video assets currently committed under `projects/multi-platform-publishing-system/demo/` are owned by Joe Wisto and are approved for public redistribution within this portfolio repository. These approved assets are part of the intended public portfolio presentation and must not be replaced, removed, or substituted solely for licensing, anonymization, or placeholder purposes.

The structural move included project-scoped paths, metadata, local fixtures, media, video manifest, headers, nested routes, and the separate `Return to Joe Wisto portfolio` action. Remaining mobile, deployment-only, and regression findings are deliberately tracked in Pass 09 and the later production and final-QA gates; they do not reopen the completed structural integration.

> [!IMPORTANT]
> **Implementation preservation contract**
>
> Pass 08 was a **structural integration**, not a redesign or reimplementation.
>
> Unless a project-scoped route or deployment change makes a modification technically unavoidable, preserve the approved implementation's:
>
> - fictional Postcard Atlas identity;
> - approved fictional copy and local fixtures;
> - all approved local images and background videos;
> - fallback imagery and video manifest;
> - background-video behavior, timing, transitions, and reduced-motion handling;
> - page structure and navigation;
> - Home, About, Journal, Photos, Map, and Ask functionality;
> - deep links, filtering, lightbox behavior, and cross-page interactions;
> - loading, accessibility, fallback, and responsive behavior.
>
> Future corrections must preserve the approved implementation's visual character, interaction model, and functionality rather than substitute content, media, or identity.

Target public architecture:

- `/projects/multi-platform-publishing-system.html` - portfolio case study and project entry route.
- `/projects/multi-platform-publishing-system/demo/` - self-contained live demo, with `index.html`, supporting pages, scripts, styles, fixtures, and media nested beneath this directory.
- Every demo page includes one clearly labeled `Return to Joe Wisto portfolio` navigation option without otherwise changing the approved site flow.

### 08.0 Preservation contract

Future work must preserve the approved implementation's:

- current fictional Postcard Atlas identity, copy, and fixtures;
- all approved local media and fallback imagery;
- complete background-video set, manifest entries, enablement, and behavior, including shuffle, crossfade, dwell, autoplay handling, visibility pause/resume, failure recovery, and reduced-motion fallback;
- local fictional CSV fixtures and their loading, normalization, filtering, empty, and fallback states;
- navigation, page structure, Home, About, Journal, Photos, Map, and Ask functionality;
- Journal deep links, sorting/filtering, multi-media rendering, and anchored entries;
- Photos search, location filtering, grouping, lightbox controls, hash targeting, and cross-page interactions;
- Map marker grouping, panels, thumbnails, and Journal/Photos cross-links;
- Ask UI, accessible validation, and clearly disabled delivery behavior. The public demo must state that no message is submitted or collected;
- responsive, keyboard, focus, loading, fallback, and reduced-motion behavior.

Do not perform additional fictionalization, anonymization, simplification, placeholder replacement, media reduction, or identity substitution unless Joe Wisto explicitly authorizes it. Do not rewrite already-fictional content, invent replacement identities or locations, replace approved media with placeholders, remove or disable the background-video system, or reduce the demo to a fixture-only redesign. The demo may continue using its approved local fictional fixtures while live Google Sheets, Forms, and Drive integrations remain deferred.

### 08.1 Completed structural integration

- [x] Create `projects/multi-platform-publishing-system/demo/` as the final self-contained demo directory.
- [x] Preserve the approved page set as `index.html`, `about.html`, `journal.html`, `photos.html`, `map.html`, and `ask.html`, plus the demo not-found experience.
- [x] Keep `/projects/multi-platform-publishing-system.html` as the portfolio case study rather than overwriting it with the demo homepage.
- [x] Move project paths, dynamic URL construction, manifest URLs, CSS assets, local fixtures, media, and nested routes into the project-scoped structure.
- [x] Add the portfolio-return link to shared navigation, including the not-found experience, without replacing or confusing the demo's Home link.
- [x] Scope root `_headers` rules to `/projects/multi-platform-publishing-system/*`.
- [x] Copy the approved source implementation and media without content or identity substitution.
- [x] Preserve the fallback image, every background-video file, manifest entry, and local fictional CSV fixture.
- [x] Keep Ask delivery disabled with truthful no-submission/no-collection copy while retaining its validation and fallback UI.
- [x] Provide the portfolio case study, `Open live demo` action, and return to the project index.
- [x] Update the registry to the shipped `public` and `ready` lifecycle state.
- [x] Run the recorded local structural checks: HTTP nested-route loading, changed-JavaScript syntax checks, manifest parsing, asset URL verification, and registry validation.

The case study and demo remain `noindex` in the currently shipped source. That deployment choice and Cloudflare-only behavior remain for Pass 11 verification; it does not change the public/ready registry lifecycle.

### 08.2 Evidence transferred to later gates

`MOBILE_QA_REPORT.md` provides the first mobile QA evidence for the merged source. It confirms no document-level horizontal overflow across 14 routes at 360×800, 375×812, 390×844, and 430×932, but identifies a fallback-image defect and several mobile/responsive issues. Pass 09 owns their correction and regression evidence.

Cloudflare preview and production checks were not available in that audit. Verify actual videos, external map behavior, headers, redirects, metadata, caching, direct loads, and production console/network behavior in Pass 11 and Pass 12. Do not mark those deployment-only checks as completed based on local evidence.

## Pass 09 - Mobile layout corrections and responsive bug fixes

**Status: IN REVIEW.** `MOBILE_QA_REPORT.md` is the detailed evidence source for this first mobile QA pass. Its screenshots are before evidence and supporting visual references, not a replacement for updated captures after implementation. The audit covered 14 routes at 360×800, 375×812, 390×844, and 430×932 and found no document-level horizontal overflow at those widths; the confirmed findings below remain active.

Implement these subsections as focused, independently reviewable handoffs while preserving the build-light architecture and the Pass 08 preservation contract.

### 09.1 Repair Postcard Atlas fallback behavior - highest priority

Relevant files: `projects/multi-platform-publishing-system/demo/assets/js/config.js`, `projects/multi-platform-publishing-system/demo/assets/js/background-video.js`, and `projects/multi-platform-publishing-system/demo/assets/css/styles.css`.

- [ ] Normalize the configured fallback image against `document.baseURI`, or an equivalently reliable project-scoped base, before placing it in the CSS custom property.
- [ ] Eliminate the incorrect request to `/projects/multi-platform-publishing-system/demo/assets/css/assets/background_image_clean.jpg` and resolve the approved image at `/projects/multi-platform-publishing-system/demo/assets/background_image_clean.jpg`.
- [ ] Verify normal loading, direct nested-page loads, reduced motion, empty manifest, and forced video failure.
- [ ] Preserve every approved image, video, manifest entry, transition, and recovery behavior.

### 09.2 Improve Postcard Atlas mobile navigation

The primary navigation is dense, wraps across multiple rows, has approximately 36-39px navigation targets, and consumes excessive narrow-screen header height.

- [ ] Bring primary navigation and portfolio-return controls to approximately 44px touch targets.
- [ ] Keep navigation clear at 320, 360, 375, 390, and 430px without merely adding padding and making the header taller.
- [ ] Preserve Postcard Atlas identity, keyboard navigation, focus behavior, current-page indication, internal Home behavior, and the separate portfolio-return action.
- [ ] After inspecting the implementation, choose either a compact accessible disclosure menu or a well-designed scrollable navigation row.

### 09.3 Increase shared portfolio touch targets

The report measures `Read case study` links at about 25.6px, footer links at about 23.5px, the shared brand link slightly below 44px, EV section navigation at about 43.2px, and EV/Shrinkflation back-to-top controls at about 43.8px. Relevant source families include `styles.css`, `script.js`, `projects/ev-true-cost.css`, and `projects/shrinkflation-tracker.css`.

- [ ] Give important mobile controls comfortable touch areas of approximately 44 CSS pixels where practical while keeping visual weight restrained.
- [ ] Preserve desktop spacing, homepage print/PDF behavior, explicit links and labels, focus states, and semantics.

### 09.4 Increase Gravity Fleet heatmap toggle targets

The Movement/Combat controls measure about 32px high. Relevant file: `games/gravity-fleet-lab.css`.

- [ ] Use approximately 44px targets on mobile/coarse-pointer layouts while retaining compact desktop behavior.
- [ ] Keep controls on one row where practical or wrap them cleanly at 320-390px.
- [ ] Prevent collisions with analytics panels, post-match controls, and back-to-game navigation.

### 09.5 Harden debug/dev tools on production hosts

Prior local-storage state can allow Showcase or Gravity Fleet debug controls to persist on a production host. Relevant files include `script.js`, `games/gravity-fleet-lab.js`, and their fixed-panel rules in `styles.css` and game CSS.

- [ ] Ensure an ordinary production visitor with no explicit debug query sees no debug toggles or panels.
- [ ] Ensure persisted debug state cannot independently enable production debug UI; retain convenient localhost behavior.
- [ ] Keep explicit production debug access usable and safe-area aware when intentionally invoked.
- [ ] Verify with a clean profile and stale debug local-storage values.

### 09.6 Narrow-screen typography polish

After functional and accessibility corrections, consider the EV and publishing-system hero headings that wrap to four lines at 360px.

- [ ] Improve first-viewport balance below 375px where possible while preserving hierarchy and readability.
- [ ] Do not force truncation, tiny text, or clipping; leave this unchanged if correction would weaken the design more than it helps.

### 09.7 Mobile regression and deployment verification

- [ ] Review 320, 360, 375, 390, and 430px portrait widths; 768 and 1024px breakpoint-sensitive widths; relevant mobile landscape layouts; and 200% browser zoom.
- [ ] Verify no horizontal overflow or clipped content; direct load, refresh, Back/Forward, and anchor/hash behavior; keyboard navigation and visible focus; reduced motion; touch targets; and console and failed-network-request checks.
- [ ] Verify actual background videos and fallback recovery; Leaflet/OpenStreetMap attribution, markers, panels, and deep links; Photos filtering and lightbox; Journal filtering, expansion, and deep links; Ask validation and truthful disabled delivery; and homepage, Projects, project-page, and Showcase mobile layouts.
- [ ] Review a real Cloudflare pull-request preview where deployment behavior is involved.
- [ ] Include updated captures for materially changed routes in implementation PRs, using the existing QA screenshots only as before evidence. Do not create replacement screenshots for this documentation-only pass.

Implementation note (July 20, 2026): The fallback URL normalization, compact horizontally scrollable Postcard Atlas navigation, coarse-pointer touch targets, production debug-query gating, tablet navigation breakpoint, landscape touch-target corrections, and homepage mobile navigation disclosure with compact brand and print controls are implemented. Codex completed source implementation and local checks; Cloudflare preview deployment begins only after the branch and pull request are created, and external browser/visual QA remains a separate review step. Leave the Pass 09.7 browser and deployment checkboxes open until that review is completed.

Pass 09 acceptance criteria:

- Every High and Medium finding in `MOBILE_QA_REPORT.md` is fixed or explicitly dispositioned with rationale.
- Every changed route has updated mobile evidence, and no new horizontal overflow or clipped content is introduced.
- Touch targets meet the repository guideline where practical, production debug tools are absent for ordinary visitors, and Postcard Atlas fallback behavior works on nested routes and under reduced motion/video failure.
- Relevant interactions still work, console and network checks show no new local failures, and a Cloudflare pull-request preview is reviewed where deployment behavior is involved.
- Remaining low/cosmetic findings are completed or deliberately deferred in this roadmap.

## Pass 10 - Gravity Fleet modernization

**Status: NEXT.** PR #13 and commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` are the proven mobile-play reference, not the finished mobile edition. A full match has been completed on a physical phone without significant heat, but desktop smoothness has regressed and the current mobile presentation still scales the landscape canvas inside independently positioned overlays. Preserve that reference while replacing the combined architecture through staged, behavior-preserving work.

Authoritative supporting documents:

- `docs/gravity-fleet/architecture-study.md`
- `docs/gravity-fleet/modernization-roadmap.md`
- `docs/gravity-fleet/baseline-notes.md`
- `docs/gravity-fleet/reference/README.md`
- Curated images in `docs/gravity-fleet/reference/`

When a visual reference conflicts with the written architecture or roadmap, the written specification is authoritative. Reference images establish hierarchy and interaction intent; they are not pixel-perfect implementation specifications or authorization to change gameplay rules.

### Pass 10 north star

Deliver one Gravity Fleet game with two polished presentations:

- A restored, high-fidelity desktop experience.
- A purpose-built mobile experience inspired primarily by `preferred-mobile-layout.png`.
- Shared level definitions, state, orbital motion, AI, combat, scoring, telemetry meanings, analytics calculations, and saved-run compatibility.
- Separate cameras, input adapters, interface compositions, chart dimensions, and rendering-quality policies.
- No framework migration unless the shared core and renderer are already separated and profiling proves Canvas 2D rendering remains the limiting factor.

Given the same initial state, random seed, fixed simulation steps, and gameplay command sequence, desktop and mobile must produce the same gameplay state, outcome, score, and telemetry values.

### Repository and pull-request strategy

- [ ] Preserve PR #13 and commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` as the known-good mobile reference until the replacement modernization branch reaches equivalent playthrough capability.
- [ ] Identify and record the last verified desktop commit with the preferred smoothness, trails, effects, responsiveness, and visual quality. Do not assume the PR #13 base is that reference without testing it.
- [ ] Resolve the current stacked-base relationship before broad implementation. Do not rewrite remote history without explicit authorization.
- [ ] Create the modernization work from a checkout that contains the successful PR #13 mobile implementation and has a clean relationship to current `main`.
- [ ] Keep unrelated shared-file changes out of Gravity Fleet implementation pull requests.
- [ ] Deliver the modernization through coherent, behavior-preserving pull requests rather than one rewrite commit.
- [ ] Keep each stage runnable and reviewable before beginning the next high-risk stage.
- [ ] Close PR #13 as superseded only after the replacement draft pull request exists, ancestry is verified, and current mobile play remains recoverable.

Recommended branch name:

`gravity-fleet-shared-engine-modernization`

Recommended pull-request grouping:

1. **PR A - Core contracts and extraction:** Pass 10.0 and 10.1.
2. **PR B - Runtime and desktop restoration:** Pass 10.2.
3. **PR C - Camera and mobile shell:** Pass 10.3 and 10.4.
4. **PR D - Touch controls and telemetry:** Pass 10.5 and 10.6.
5. **PR E - Page, header, and analytics polish:** Pass 10.7.
6. **PR F - Integrated QA and cleanup:** Pass 10.8.

Do not ask an implementation agent to complete all six pull requests in one task.

### Shared gameplay invariants

The following remain shared across desktop and mobile unless a separately approved rules variant is introduced:

- Level definitions and initial conditions.
- Planet movement and orbital paths.
- Launch-field calculations.
- Wormhole range and influence rules, except an explicitly documented and tested lifespan configuration.
- AI decisions and targeting.
- Ship production, movement, combat, and ownership resolution.
- Victory and defeat conditions.
- Score calculations.
- Telemetry event meanings and totals.
- Analytics calculations.
- Saved-run schema, storage keys, and existing local history compatibility.

The following may differ by presentation:

- Camera rotation, scale, and viewport framing.
- Canvas backing resolution.
- Desktop and mobile gesture mapping.
- HUD, command-dock, drawer, and outcome composition.
- Chart dimensions and visible chart set.
- Effect density and trails.
- Render cadence and DOM-update cadence.
- Intro-page and post-match information density.
- Portrait and landscape layouts.

### 10.0 Baselines, contracts, and regression harness

**Purpose:** Protect the working game before restructuring it.

- [ ] Preserve the known-good mobile reference and document the device, browser, orientation, level, approximate match duration, thermal observation, interaction notes, and saved-run result.
- [ ] Identify the known-good desktop reference with evidence.
- [ ] Capture representative current states for setup, tutorial, early match, large launch, active wormhole, telemetry open, victory, defeat, and post-match analytics.
- [ ] Document engine-owned behavior, runtime behavior, camera/view behavior, input-adapter behavior, telemetry projection, persistence, and presentation policy.
- [ ] Record current saved-run objects, storage keys, and schema as safe compatibility fixtures without committing private browser data.
- [ ] Inventory the current responsibilities inside `games/gravity-fleet-lab.js` before extraction.
- [ ] Introduce a seedable random source for validation without changing normal public randomness or replacing browser randomness globally.
- [ ] Add at least one repeatable command-sequence fixture that exercises level initialization, time advancement, launch behavior, wormhole behavior where practical, ownership/combat changes, telemetry production, and a deterministic checkpoint or completed result.
- [ ] Add development-only instrumentation for simulation/update time, draw time, AI time, combat time, HUD/DOM time, chart time, active ships, effects, long frames, median frame time, 95th-percentile frame time, and frames exceeding 50ms where practical.
- [ ] Keep instrumentation disabled for normal visitors, free of noisy production logging, and low-cost when inactive.
- [ ] Record initial desktop and mobile performance evidence before replacing the runtime.

Acceptance criteria:

- Both known-good reference points remain identifiable and recoverable.
- A representative deterministic run can be reproduced.
- Existing saved-run compatibility is captured.
- Instrumentation is development-only and does not change simulation results.
- No intentional gameplay, visual, input, storage, or analytics behavior changes occur.
- If the desktop reference cannot be directly verified, the limitation and available evidence are documented honestly.

Stop condition:

Do not begin the shared-core extraction until the desktop reference has been positively identified or the inability to verify it has been explicitly documented and accepted.

### 10.1 Extract the shared game core

**Purpose:** Separate gameplay truth from the DOM, canvas, device conditions, and presentation.

Target conceptual areas:

```text
games/gravity-fleet/
  core/
    levels
    state
    simulation
    ai
    commands
  runtime/
    clock
    performance-profile
  view/
    camera
    renderer
  input/
    desktop-input
    mobile-input
  telemetry/
    telemetry-model
    run-storage
  presentation/
    desktop-presentation
    mobile-presentation

games/gravity-fleet-lab.js
  bootstrap and compatibility coordination
```

The exact file structure must be verified against the repository. Avoid one file per tiny helper; prefer a small number of cohesive modules with clear ownership.

- [ ] Extract level configuration, state creation/reset, planet orbit updates, ship production, AI, launch commands, wormhole commands, combat, outcome checks, scoring, telemetry event production, and run serialization into presentation-neutral modules.
- [ ] Move toward a shared command interface for begin/update/commit/cancel launch, begin/update/commit/cancel wormhole, clear wormhole, pause, resume, and reset.
- [ ] Keep existing desktop and mobile pointer behavior through compatibility adapters during this pass; do not redesign gestures yet.
- [ ] Ensure the shared engine does not directly query viewport size, pointer media queries, screen orientation, HTML controls, CSS classes, drawer state, device type, canvas dimensions, or portfolio-header state.
- [ ] Keep normal gameplay randomness unchanged while allowing deterministic validation.
- [ ] Preserve existing desktop presentation, mobile presentation, frame limiter, mobile drawer, touch fallback, header, hero, and post-match layout during this extraction.
- [ ] Preserve current storage keys, saved-run schema, local history, telemetry meanings, and analytics calculations.
- [ ] Add a no-dependency Node validator, preferably `tools/validate_gravity_fleet.js`, covering:
  - all existing levels initialize;
  - a fixed seed and command fixture are repeatable;
  - deterministic match or checkpoint state;
  - controlled win and loss paths where practical;
  - telemetry consistency;
  - saved-run fixture readability;
  - serialization compatibility;
  - presentation-neutral command handling;
  - absence of DOM, viewport, canvas, or device dependencies in the engine boundary.
- [ ] Keep the public route build-light. Do not add a framework, bundler, package manager, backend, database, external test library, or runtime dependency.
- [ ] Use browser-native ES modules only when they are the smallest maintainable solution and verify static/Cloudflare loading without a build step.

Acceptance criteria:

- Current desktop play remains functional from setup through analytics.
- Current mobile play remains functional from setup through analytics.
- No level, AI, physics, scoring, telemetry, analytics, or saved-run behavior intentionally changes.
- Device and viewport checks exist only in runtime/presentation selection.
- Existing saved runs remain readable and new runs retain the current schema.
- The deterministic validator passes.
- The bootstrap file is materially smaller and primarily coordinates modules instead of owning the complete simulation.
- No unrelated project or shared-file changes are introduced.

Rollback point:

If extraction changes gameplay behavior or breaks compatibility, stop and restore parity before beginning runtime replacement, camera work, or visual redesign.

### 10.2 Replace the runtime clock and restore desktop quality

**Purpose:** Decouple simulation advancement from rendering and recover the preferred desktop feel without undoing mobile thermal improvements.

- [ ] Replace the current elapsed-threshold frame skipping with a fixed simulation timestep and separate render scheduling.
- [ ] Accumulate elapsed real time, advance simulation in fixed-size steps, cap catch-up work, and render separately.
- [ ] Ensure simulation results do not depend on display refresh rate or render profile.
- [ ] Reset timing cleanly after pause, tab restoration, orientation changes, and drawer transitions that intentionally suspend play.
- [ ] Stop hidden-page work and prevent background elapsed time from creating simulation jumps.
- [ ] Keep telemetry sampling and DOM/HUD writes on independently controlled schedules.
- [ ] Add explicit presentation profiles instead of scattered mobile conditions.

**Desktop High:**

- Display-synchronized rendering.
- Full trails and effects.
- Preferred glow and pulse quality.
- High-quality canvas backing resolution.
- Full live telemetry availability.
- Precise mouse interactions.

**Mobile Balanced:**

- Stable 30 FPS render target initially.
- Shared fixed simulation step.
- Reduced nonessential effects.
- Capped effective pixel density where needed.
- No expensive hidden chart rendering.
- Compact HUD and telemetry updates.

**Reduced Motion:**

- Minimal nonessential movement.
- Clear static state.
- Shared gameplay behavior preserved.

- [ ] Compare desktop against the frozen reference.
- [ ] Restore desktop trails and effects only through Desktop High rather than globally undoing mobile optimizations.
- [ ] Verify static-layer caching does not create stale or lower-quality desktop output.
- [ ] Verify mobile telemetry throttling cannot degrade desktop telemetry.
- [ ] Measure before/after median frame time, 95th-percentile frame time, long frames, simulation time, draw time, and input responsiveness.
- [ ] Preserve the successful full-match mobile thermal baseline.

Acceptance criteria:

- Desktop appearance and perceived smoothness match or materially improve upon the reference.
- Mobile remains playable and thermally acceptable.
- Simulation outcomes and telemetry do not depend on render frequency.
- Pause and tab restoration do not create time jumps.
- Desktop High cannot accidentally inherit Mobile Balanced visual reductions.
- Actual measurements and limitations are recorded.

Decision gate:

If desktop remains unacceptable and profiling identifies Canvas 2D drawing as the primary remaining bottleneck, create a separate renderer experiment after this pass. Do not migrate frameworks based only on subjective lag.

### 10.3 Introduce the camera and viewport system

**Purpose:** Solve portrait composition with a world camera rather than shrinking or CSS-rotating the complete interface.

- [ ] Create a camera abstraction that owns world-to-screen and screen-to-world transforms, rotation, scale, translation, tactical viewport dimensions, safe gameplay bounds, orientation mode, and resize handling.
- [ ] Introduce an identity-equivalent desktop camera first and verify that it reproduces the existing desktop composition.
- [ ] For portrait mobile, rotate the world camera 90 degrees counterclockwise while leaving world coordinates unchanged.
- [ ] Position Cyan's starting side toward the bottom in portrait.
- [ ] Fit the rotated world inside the reserved tactical rectangle after accounting for safe-area insets, compact HUD, command dock, telemetry handle, and breathing room.
- [ ] Keep HUD text, controls, labels, and charts upright.
- [ ] Use the inverse camera matrix for touch and pointer hit testing.
- [ ] Lock camera orientation for the match; do not rotate continuously to follow a moving planet.
- [ ] Preserve moving planets. Do not make planets stationary merely to solve layout.
- [ ] For landscape mobile, use the native landscape world orientation and a landscape-specific shell.
- [ ] Recalculate safely when browser chrome, `VisualViewport`, orientation, the game container, or safe-area dimensions change.
- [ ] Cancel active gestures before applying a new transform.
- [ ] Add temporary development visualization for world bounds, tactical rectangle, safe margins, camera center, scale, rotation, and pointer coordinates.

Acceptance criteria:

- Desktop camera introduction produces no observable layout or input regression.
- Portrait uses substantially more vertical space.
- Cyan begins toward the bottom in portrait.
- All worlds remain visible without distortion.
- Hit testing is accurate near edges and corners.
- No interface text or chart is sideways.
- Orientation changes do not leave stale pointer state.
- Camera transforms do not alter world state, scoring, or telemetry.

### 10.4 Build the dedicated mobile match shell

**Purpose:** Replace independently fixed overlays with one safe-area-aware layout system.

Required shell regions:

```text
Mobile match shell
├── Compact top HUD
├── Tactical viewport
├── Bottom command dock
└── Telemetry handle and drawer host
```

- [ ] Build the shell behind an explicit development flag while retaining the current proven mobile shell as a fallback.
- [ ] Make the shell own the visual viewport only during active mobile gameplay.
- [ ] Reserve layout space between major regions rather than positioning all controls over a full-screen canvas.
- [ ] In portrait, provide:
  - mission/level;
  - timer;
  - compact Cyan, Red, and Orange status;
  - Pause;
  - telemetry/menu trigger;
  - rotated tactical viewport;
  - large Launch and Wormhole controls;
  - smaller Clear Wormhole control;
  - compact telemetry handle.
- [ ] Move the public FPS display to development mode.
- [ ] Remove permanent instructional paragraphs from the tactical field; use brief contextual feedback.
- [ ] In landscape, provide a compact one-row HUD, wide tactical viewport, side or compact-corner controls, and a telemetry side sheet where practical.
- [ ] Add a true Pause state that stops simulation, AI, timers, and telemetry sampling while leaving the interface responsive.
- [ ] Ensure Resume resets timing without a large elapsed-time jump.
- [ ] Keep setup, tutorial, outcome, and return flows accessible and viewport-safe.
- [ ] Cut over only after portrait and landscape play, setup, pause, drawer, outcome, and return flows work without a black screen.
- [ ] Remove the old mobile shell only after the replacement reaches parity.

Acceptance criteria:

- No major control overlaps the reserved tactical viewport.
- Portrait no longer contains the current large unused lower region.
- Landscape remains usable at short viewport heights.
- Safe-area insets are respected.
- Pause genuinely freezes the match.
- Return to setup restores page state and focus reliably.
- No stale fixed elements remain behind the new shell after cutover.
- The fallback shell remains recoverable until replacement parity is proven.

### 10.5 Replace mobile touch mechanics

**Purpose:** Make touch commands deliberate, visible, and consistent with presentation-neutral engine commands.

- [ ] Make Launch and Wormhole explicit, mutually exclusive modes.
- [ ] Selecting one mode deactivates the other and safely cancels an incomplete gesture.
- [ ] Expose the selected mode visually and programmatically.
- [ ] Preserve desktop mouse controls.

**Launch gesture:**

- [ ] Touch an owned Cyan world.
- [ ] Drag to gather and aim.
- [ ] Show live selection and trajectory feedback.
- [ ] Release to launch.
- [ ] Cancel on pointer cancellation, pause, drawer opening, orientation change, or mode switch.

**Wormhole gesture:**

- [ ] Select Wormhole.
- [ ] Touch the entrance.
- [ ] Drag toward the exit.
- [ ] Show entrance, exit, direction, maximum range, and valid/invalid state.
- [ ] Release to create.
- [ ] Cancel too-short or invalid gestures clearly.
- [ ] Remove two-tap placement as the primary mobile behavior.

**Clear Wormhole:**

- [ ] Add a dedicated Clear or Collapse control.
- [ ] Disable it when no Cyan wormhole exists.
- [ ] Collapse the current Cyan wormhole immediately.
- [ ] Never use it as a placement action.
- [ ] Provide brief visual confirmation.

**Wormhole lifecycle experiment:**

- [ ] Make lifespan configuration-owned rather than embedded in mobile presentation code.
- [ ] Prototype a short preparation period.
- [ ] Begin the active countdown when the first eligible Cyan ship enters.
- [ ] Test collapse approximately 2-3 seconds after activation.
- [ ] Keep a longer absolute maximum for an unused wormhole.
- [ ] Display remaining life with a visible ring or equivalent indicator.
- [ ] Playtest at least two configurations before finalizing values.

- [ ] Update mobile tutorial content for Launch drag, Wormhole drag, Clear Wormhole, Pause, and telemetry access.
- [ ] Keep desktop instructions specific to mouse controls.

Acceptance criteria:

- Two-tap wormhole placement is no longer the primary mobile interaction.
- Launch and Wormhole cannot both be active.
- Drag previews remain accurate through camera transforms.
- Clear Wormhole is discoverable and reliable.
- Lifespan is visible and understandable.
- Pointer cancellation never leaves stuck command state.
- Desktop controls remain unchanged.
- Tutorial instructions match actual behavior.

### 10.6 Redesign live telemetry and mobile post-match analytics

**Purpose:** Preserve Gravity Fleet's analytical identity while using progressive disclosure and avoiding hidden chart cost.

- [ ] Create one structured telemetry view model used by desktop live telemetry, mobile HUD, mobile drawer, outcome summary, full analytics, and saved-run rendering.
- [ ] Prevent individual surfaces from independently recalculating gameplay totals.

**Always-visible mobile HUD:**

- Timer.
- Cyan fleet strength or ship count.
- Cyan worlds.
- Compact rival status.
- Active command mode.
- Contextual wormhole countdown, star-control change, or launch confirmation only when relevant.

**Mobile telemetry drawer:**

- [ ] Make Fleet Strength over Time the primary live chart.
- [ ] Add the real System Mix donut with compact faction legend.
- [ ] Add compact label/value metrics for largest launch, ships in flight, deep-space fights, ship transits, star control, and wormholes where space permits.
- [ ] Provide Close or Resume as the primary action.
- [ ] Keep Reset and Choose Level visually secondary.
- [ ] Remove the full recent-event feed from the primary drawer.
- [ ] Move event history to post-match analytics, an optional Log disclosure, a single latest-event line, or development mode.
- [ ] In landscape, prefer a side sheet so telemetry does not consume the limited vertical field.

**Chart scheduling:**

- [ ] Do not redraw charts while the drawer is closed.
- [ ] Draw immediately when the drawer opens.
- [ ] Update visible charts approximately once per second.
- [ ] Stop chart rendering when the drawer closes.
- [ ] Stop sampling when paused or hidden.
- [ ] Render one final state when the match ends.

**Mobile post-match hierarchy:**

- [ ] Add one result strip containing outcome, score, and duration.
- [ ] Add a compact two-column highlight grid for captures, destroyed ships, largest launch, transits, wormholes, and peak advantage.
- [ ] Follow with fleet-strength and system-control charts, the most important turning point, and a concise run insight.
- [ ] Place lower-priority values beneath an expandable `All match statistics` region.
- [ ] Preserve full desktop analytical depth.

Acceptance criteria:

- Fleet Strength and System Mix are available live on mobile.
- Hidden charts perform no continuous rendering work.
- The primary drawer is not dominated by event history.
- Landscape telemetry remains usable.
- Outcome, score, and duration appear together.
- Mobile post-match metrics no longer require one full-width card per value.
- Desktop and mobile display the same underlying telemetry totals.
- Saved-run rendering remains compatible.

### 10.7 Condense the Gravity page and stabilize the shared header

**Purpose:** Fix surrounding-page composition without mixing site layout into the engine.

**Header modes:**

- [ ] Full: back action, brand identity, and project navigation.
- [ ] Compact: compact back action, centered or concise JW identity, one compact project/menu action, and one row only.
- [ ] Active match: hide the portfolio header and use the game-level return action.
- [ ] Prefer a stable component mode over accumulating device-specific width patches.
- [ ] Coordinate shared `styles.css` changes with Pass 09 and verify unrelated project pages.

**Gravity hero:**

- [ ] On mobile, show the eyebrow, `Gravity Fleet Lab`, one concise value statement, Play, View Analytics, and a collapsed How to Play or Mission Briefing disclosure.
- [ ] Move the full six-step mission briefing out of the first mobile viewport.
- [ ] Use a two-column action layout when it fits.
- [ ] Stack at the narrowest widths.
- [ ] Allow safe button wrapping.
- [ ] Preserve approximately 44px touch targets.
- [ ] Avoid changing unrelated hero layouts unintentionally.

**Active-match transition:**

- [ ] Remove the surrounding portfolio page from active layout participation while the mobile match shell owns the viewport.
- [ ] Restore document state, scroll position, and focus predictably when leaving the match.
- [ ] Keep browser Back and Forward behavior coherent.

**Debug tools:**

- [ ] Ensure stale local-storage values cannot expose development controls to ordinary production visitors.
- [ ] Keep explicit query access where intentionally supported.
- [ ] Keep development panels safe-area aware.
- [ ] Keep FPS, camera bounds, and performance diagnostics development-only.

Acceptance criteria:

- The compact header remains one row at 320-430px portrait widths and the previously failing 856x375-like landscape size.
- Gravity hero actions do not clip or overflow.
- The mission briefing does not dominate the initial phone experience.
- Desktop hero composition remains polished.
- Active mobile play contains no portfolio-header collision.
- Shared CSS changes do not regress other project pages.
- Production debug UI remains absent by default.

### 10.8 Integrated QA, accessibility, cleanup, and release

**Purpose:** Validate complete states across browsers and real devices, then remove temporary and superseded code.

Automated and structural validation:

- [ ] Run `node --check` on changed non-module JavaScript.
- [ ] Run import/syntax checks appropriate to any browser modules introduced.
- [ ] Run the Gravity Fleet deterministic validator.
- [ ] Run saved-run compatibility checks.
- [ ] Run applicable HTML duplicate-ID and CSS structural checks.
- [ ] Run directly affected existing repository validators.
- [ ] Run `git diff --check` and inspect `git status --short`.
- [ ] Do not invent an npm workflow or claim checks that the repository does not provide.

Viewport matrix:

- [ ] 320x568.
- [ ] 360x800.
- [ ] 375x812.
- [ ] 390x844.
- [ ] 430x932.
- [ ] 768px and 1024px breakpoint-sensitive layouts.
- [ ] Representative short-height landscape.
- [ ] Representative 1366-class desktop.
- [ ] Representative 1920-class desktop.
- [ ] 200 percent browser zoom.

Required state matrix:

- [ ] Direct page load and refresh.
- [ ] Setup and tutorial.
- [ ] Match start.
- [ ] Launch drag.
- [ ] Wormhole drag.
- [ ] Active and cleared wormhole.
- [ ] Pause and Resume.
- [ ] Telemetry closed and open.
- [ ] Orientation change.
- [ ] Victory and defeat.
- [ ] Outcome actions.
- [ ] Post-match analytics.
- [ ] Return to setup.
- [ ] Browser Back and Forward.
- [ ] Background tab and restore.

Real-device testing:

- [ ] Repeat a full match on the same iPhone used for the PR #13 reference.
- [ ] Test one additional mobile device class where available, preferably Android or another iPhone generation.
- [ ] Test one representative desktop or laptop.
- [ ] Record full-match success, input comfort, frame pacing, browser chrome behavior, orientation behavior, temperature, drawer usability, accidental gesture rate, and clipped safe-area content.
- [ ] Do not represent emulation as physical-device or thermal evidence.

Accessibility:

- [ ] Keyboard access to setup, pause, drawer, outcome, analytics, and return controls.
- [ ] Dialog focus containment and restoration.
- [ ] Escape behavior.
- [ ] Visible focus.
- [ ] Accessible selected/pressed states.
- [ ] Labels for icon-only controls.
- [ ] Reduced motion.
- [ ] 200 percent zoom.
- [ ] No color-only status communication.
- [ ] Approximately 44px touch targets where practical.
- [ ] Useful canvas description and fallback context.

Cloudflare preview:

- [ ] Direct load and refresh.
- [ ] Correct module and asset loading.
- [ ] No MIME failures.
- [ ] No console errors.
- [ ] No failed local requests.
- [ ] No black screen.
- [ ] Back and Forward behavior.
- [ ] Saved-run persistence.
- [ ] Production debug gating.

Final cleanup:

- [ ] Remove the old mobile shell after replacement parity is confirmed.
- [ ] Remove the two-tap mobile wormhole fallback if no longer required.
- [ ] Remove dead device-condition branches.
- [ ] Remove temporary camera visualization and development logging.
- [ ] Remove duplicate telemetry calculations.
- [ ] Remove unused CSS only after reference checks.
- [ ] Update roadmap and supporting docs to describe what actually shipped.
- [ ] Retain a small useful before/after reference set and remove obsolete troubleshooting images when they no longer provide architectural value.

Pass 10 release acceptance criteria:

- One shared simulation powers desktop and mobile.
- Desktop matches the preserved high-fidelity and smoothness reference.
- Portrait uses a rotated world camera instead of a shrunken landscape canvas.
- Landscape has its own upright composition.
- Mobile Launch and Wormhole modes are explicit and mutually exclusive.
- Mobile wormholes use drag creation, a dedicated clear action, and an understandable temporary lifecycle.
- The mobile shell reserves space for major controls.
- Live mobile telemetry contains Fleet Strength and System Mix.
- Event history no longer displaces the primary live charts.
- Mobile post-match analytics are compact and narrative-driven.
- The Gravity hero and project header no longer waste scarce mobile space.
- Full portrait and landscape matches work from setup through analytics.
- Real-device evidence confirms usability, frame pacing, and acceptable thermal behavior.
- Desktop and mobile runs remain analytically comparable.
- Existing saved history remains compatible.
- No ordinary production visitor sees development UI.
- No required console, network, accessibility, route, or regression finding remains unresolved.

### Human approval checkpoints

To reduce review turns while preserving meaningful control, use three planned approval points:

1. **After PR B - Desktop restored**
   - Confirm desktop feel, visual quality, and mouse responsiveness.
   - Confirm no obvious gameplay drift.
   - Confirm the current mobile fallback still works.

2. **After PR D - Mobile game experience**
   - Complete one portrait match.
   - Complete part or all of one landscape match.
   - Test Launch, Wormhole, Clear, Pause, and Telemetry.
   - Approve the mobile composition before shared-page polish.

3. **After PR F - Release candidate**
   - Complete a mobile playthrough.
   - Complete a desktop playthrough.
   - Inspect header, hero, live telemetry, outcome, and post-match analytics.
   - Approve final merge.

### AI execution and usage policy for Pass 10

- Use one lead agent by default.
- Allow at most one additional read-only agent only for a tightly scoped, independent investigation that materially reduces risk or unblocks the pass.
- Do not use parallel writing agents.
- Keep all writes with the lead.
- Do not delegate broad repository review.
- Reuse delegated findings and avoid duplicate analysis.
- Batch related searches, reads, and validation.
- Run checks proportional to changed systems and broaden only when risk or failures justify it.
- Keep progress reports and final summaries focused on files changed, architectural decisions, checks run, remaining risks, and required human QA.

### Framework checkpoint

No framework migration is included in Pass 10.

Reconsider only after the shared engine and renderer are separated and profiling shows that:

- Canvas 2D drawing remains the primary bottleneck.
- Mobile Balanced cannot maintain acceptable performance after resolution and effect tuning.
- Expected game growth justifies a dependency and build workflow.
- Joe Wisto explicitly approves the architectural change.

Possible later options are modular Canvas 2D, a PixiJS renderer prototype behind the same engine, or Phaser only if Gravity Fleet becomes a substantially larger game product. A framework must not be used to solve header wrapping, hero overflow, telemetry hierarchy, or control placement.


## Pass 11 - Production deployment and custom-domain release

**Status: BLOCKED by Pass 09 and Pass 10.** Cloudflare Pages is already connected to `Joey-VW/Portfolio`; `main` is the production branch, automatic deployments are enabled, pull-request previews are enabled, and the `pages.dev` deployment is working.

### 11.1 Complete remaining production release work

- [x] Connect `Joey-VW/Portfolio` to Cloudflare Pages.
- [x] Use `main` as the production branch.
- [x] Enable automatic deployments and pull-request previews.
- [ ] Attach `joewisto.com`, confirm HTTPS, choose a canonical hostname, and add the redirect from the other host.
- [ ] Verify final production routes, `_headers`, `_redirects`, caching, deep links, JSON fetches, metadata, favicon, 404 behavior, and Postcard Atlas deployment-only behavior.

Acceptance criteria:

- The custom domain and canonical-host redirect work in production.
- Every public route loads directly and after refresh on the final production host.
- Final metadata and 404 behavior are verified without exposing credentials or internal tracking details.

### 11.2 Deferred backend and live-service work - LATER

- [ ] Add a portfolio contact endpoint with server-side validation, rate limiting, Turnstile verification, and verified delivery.
- [ ] Replace the email-draft fallback only after the contact endpoint passes an end-to-end test.
- [ ] Consider live Google Sheets content, Google Forms delivery, and Google Drive media integration for Postcard Atlas only after the fixture-based portfolio demo is approved.
- [ ] Perform credentialed Kroger and other operational automation verification only when explicitly authorized and safely configured.

## Pass 12 - Final repository validation and release QA

Comprehensive validation is consolidated here after Pass 09 mobile corrections, Pass 10 Gravity Fleet modernization and device verification, and Pass 11 custom-domain/production-route release. Every production-bound PR must still meet the minimum smoke gate below.

### 12.1 Final validation matrix

- [ ] Audit root-level artifacts, stale routes, orphaned selectors/helpers, duplicate data, captures, and obsolete comments before any deletion; preserve sources needed by unfinished work.
- [ ] Review all affected public routes at 320, 375, 390, 430, 768, and 1024 CSS pixels, relevant landscape layouts, and 200% browser zoom.
- [ ] Verify keyboard navigation, visible focus, screen-reader labels, reduced motion, touch targets, loading/error/fallback states, and print/PDF behavior at US Letter size.
- [ ] Run complete applicable validators, Python and JavaScript syntax checks, and JSON parsing checks.
- [ ] Perform repository privacy, route, and asset scans; review external URLs and confirm no secrets, private data, generated captures, or unintended files are present.
- [ ] Verify final Cloudflare preview and production behavior, including canonical host, routes, refreshes, headers, redirects, metadata, favicon, and 404 response.
- [ ] Measure Gravity Fleet laptop/mobile frame pacing and playtest planet motion, level objectives, and wormhole fairness. These physical checks remain open until evidence is recorded.

### 12.2 Minimum production-bound PR smoke gate

Every production-bound PR must complete and report this minimum gate:

- `git diff --check`
- syntax validation for changed Python and JavaScript
- parse changed JSON files
- run any directly affected existing repository validator
- serve the repository root over HTTP
- verify every changed route loads directly and after refresh
- inspect for uncaught console errors and failed local requests
- review at one desktop width
- review at approximately 390px
- verify the Cloudflare pull-request preview when routes, headers, redirects, or deployment behavior change

Do not claim broader QA occurred unless there is evidence.

## Deferred ideas and guardrails

- Do not add a framework solely to organize this roadmap. Reconsider templating only when duplicated page structure becomes a material maintenance problem.
- The approved Postcard Atlas staging source, fictional content, local fixtures, fallback image, background videos, and manifest are preservation requirements, not material to replace or disable.
- Do not treat unlisted static pages as private or secure.
- Do not cache or redistribute third-party product imagery until the relevant terms allow it.
- Do not increase Gravity Fleet telemetry frequency at the expense of input responsiveness.
- Live Sheets, Forms, Drive, portfolio contact delivery, credentialed operational automation verification, and Gravity Fleet physical frame-pacing/fairness validation are deferred, not blockers for the front-end portfolio release.

## Completion definition

The portfolio reaches the current north star when:

- visitors immediately understand what the site is and how to explore it;
- every public project is intentionally marked ready and appears in correct date order;
- Pass 09 mobile layout corrections, Pass 10 Gravity Fleet modernization and device verification, and Pass 11 production-route work are complete;
- Pass 12 final validation confirms coherent mobile, desktop, reduced-motion, keyboard, zoom, print, route, asset, privacy, and Cloudflare behavior; and
- deferred backend and operational work is either explicitly completed with evidence or remains honestly labeled as deferred.
