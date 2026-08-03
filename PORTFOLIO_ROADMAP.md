# Portfolio Roadmap

> North star: make joewisto.com immediately understandable, easy to explore, honest about what is finished, and strong enough that every public project demonstrates both technical judgment and thoughtful presentation.

- Last reviewed: August 2, 2026
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
- `IN REVIEW` - implementation is complete and awaiting final verification or approval.
- `READY` - clear and unblocked.
- `BLOCKED` - waiting on another pass or an external setup step.
- `LATER` - intentionally deferred until higher-impact work is complete.
- `DONE` - implemented and verified.

## Recommended execution order

| Pass | Status | Outcome | Main dependencies |
| --- | --- | --- | --- |
| 01. Project governance | DONE | Only ready projects appear publicly and all project ordering has one source of truth. | None |
| 02. Landing page clarity | DONE | The top-level résumé content is polished, the supplied metric-card issue is fixed, and outdated copy is removed. | Pass 01 for project links |
| 03. Showcase launcher controls | DONE | Launcher sizing, polar placement, and the full development lab are easier to tune. | Pass 01 for project order |
| 04. Shrinkflation reliability | DONE | The hero is tighter, product imagery is resilient, and the weekly Kroger update is automated. | Secrets for automation |
| 05. EV hero animation | DONE | The EV case study opens with a responsive, purposeful car-and-charger scene. | Preserve the animation prototype until complete |
| 06. Gravity Fleet game flow | DONE | Match flow, navigation, terminology, level-three fairness, and command states feel intentional. | None |
| 07. Gravity Fleet analytics | DONE | Analytics, minimap, control hints, and planet-motion implementation are complete; physical validation is deferred to Pass 12. | Pass 06 |
| 08. Faithful publishing-system integration | DONE | Postcard Atlas was structurally integrated beneath its final project-scoped routes and is public/ready. | PR #3 merged July 19, 2026 |
| 09. Mobile layout corrections and responsive bug fixes | IN REVIEW | Source corrections merged through PRs #6-#12; remaining work is the documented regression and deployment verification. | Pass 08 structural integration |
| 10. Gravity Fleet modernization | IN REVIEW | Passes 10.0-10.7 are merged, including the page-shell polish in PR #23 and setup/orbit-speed follow-up in PR #25. Pass 10.8 integrated QA, cleanup verification, and release approval remain open. | Pass 06, Pass 07, merged PRs #13, #15-#21, #23, #25, and Pass 09 shared-header coordination |
| 11. Production deployment and custom-domain release | BLOCKED | Complete custom-domain and final production-route work; contact delivery remains deferred. | Pass 09, Pass 10, and domain access |
| 12. Final repository validation and release QA | LATER | Complete final repository validation after mobile corrections, Gravity Fleet device QA, and production-route release. | Pass 11 production release |
| 13. PHX Transit Pulse | IN REVIEW | The synthetic operations console now uses a real interactive Phoenix-area basemap with fictional operational overlays and an automatic schematic fallback. Targeted mapped-build regression and Cloudflare preview QA remain; live ingestion is still blocked by provider terms. | Mapped-build QA and provider terms only for live ingestion or provider replay |
| 14. Legacy analytics modernization | IN REVIEW | Passes 14.0-14.3 are implemented. Procurement and Where Revenue Gets Stuck remain hidden pending publication QA; legacy-repository retirement remains gated. | Rendered publication QA and migration decisions before Pass 14.4 |
| 15. Plain-English copy pass | LATER | Apply the repository-wide copy audit so visitors understand each project before encountering technical terminology, while preserving useful technical depth and search-relevant keywords. | Passes 09-14 as applicable; complete before final public release QA |
| 16. Repository architecture modernization | IN REVIEW | Passes 16.0-16.4 are implemented and verified. Cloudflare now builds from the repository command and publishes only `dist/`; source relocation and broader browser gates remain deferred. | Stable `dist/` release gate before Pass 16.5; no live credentials |

The recommended execution order is:

1. Completed governance and feature passes.
2. Completed faithful Pass 08 publishing-system integration.
3. PHX Transit Pulse targeted regression and Cloudflare preview QA on the mapped synthetic build.
4. Pass 09.7 regression and deployment verification.
5. Pass 10.8 Gravity Fleet integrated QA, cleanup verification, and release approval.
6. Pass 11 custom-domain and production-route release.
7. Pass 12 final repository validation and release QA.
8. Pass 14 publication QA for the implemented Procurement and Where Revenue Gets Stuck case studies after the current portfolio release is stable.
9. Pass 15 plain-English copy pass after the affected project surfaces are stable and before their final publication approval.
10. Pass 16 repository architecture modernization in focused slices after recording the post-cutover production-stability gate.
11. Deferred live-ingestion, backend, and operational automation work.

## Decisions already made

These choices remove ambiguity from later implementation work.

1. **The site stays static and multi-page.** Continue with plain HTML, CSS, and JavaScript while adding the approved Pass 16 tooling, CI, schemas, and later `dist/` proof. Do not introduce a framework, backend, database, or production output-directory change outside its approved pass.
2. **This roadmap is the internal progress tracker.** Do not create a second large tracking system. `data/projects.json` should contain only the small amount of lifecycle metadata needed by the frontend.
3. **Unfinished projects are filtered explicitly.** Add `status`, `visibility`, and `createdAt` fields instead of relying on array position, `featured`, or missing links.
4. **Project order is newest first.** Both the projects page and Showcase launcher sort by the same `createdAt` field in descending order.
5. **The contact form should eventually submit.** Keep the current email-draft fallback until a Cloudflare endpoint is deployed and verified. Do not ship a submit button that silently fails.
6. **Gravity Fleet work is split into game-flow and analytics passes.** The combined request is too large for one safe, reviewable change.
7. **Prototype extraction and cleanup are complete.** The EV scene was integrated and verified, and the standalone looping-animation prototype was removed as an obsolete artifact. Future cleanup should remove only files proven superseded or temporary.
8. **Repository-history remediation is complete.** This repository is the clean active replacement, and normal feature work proceeds from clean `main`. Do not add another history-rewrite or repository-replacement task to this roadmap.
9. **Pass 08 has an approved source.** Its already-anonymized, fictional implementation has been relocated to the project-scoped demo route. Its preservation contract appears in Pass 08.
10. **Gravity Fleet uses one gameplay engine with adaptive presentations.** Desktop and mobile must share level data, simulation, AI, combat, scoring, telemetry meanings, analytics, and saved-run compatibility. Camera framing, input adapters, interface composition, chart layout, render quality, and information density may differ. Do not introduce a game framework, bundler, package manager, backend, or new runtime dependency unless profiling later proves a renderer migration is justified and Joe Wisto explicitly approves it.

## Pass 01 - Project governance

Implemented and verified July 15, 2026. As reconciled August 2, 2026, the registry contains five public/ready projects and five hidden projects, with PHX Transit Pulse published and Colony Ops retained as a hidden project. Automated HTTP DOM verification confirms that every public consumer uses the same lifecycle filter and creation-date order. This pass is complete.

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
- It reads naturally in both the website and print résumé.

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

Historical reference: `ScreenShot_7_15_2026_1_14_00_PM.png` and the former standalone looping-animation prototype, which was removed after successful extraction and verification.

Preserve the existing desktop hero composition, especially the width, scale, and wrapping of “The Real Cost of Public Charging.” Nest the car-and-charger animation into the open lower-right area rather than converting the entire hero into two columns.

* [x] Keep the eyebrow and primary headline in the existing full-width hero flow so the headline retains its current desktop width, scale, and line wrapping.
* [x] Create a lower hero composition in which the supporting title, summary, and actions remain on the left while the car-and-charger scene occupies the existing open area on the right.
* [x] Avoid moving or materially narrowing the existing desktop text elements. Use the available negative space rather than redesigning the hero around the animation.
* [x] Give the scene a responsive, bounded stage that fills the available area without relying on fragile page-level absolute positioning.
* [x] Extract only the necessary SVG, CSS, and JavaScript from `3-looping-animations(1).html` instead of embedding the standalone prototype.
* [x] Adapt the extracted scene to the EV case study’s cyan, violet, amber, line-weight, glow, and rounded-panel language.
* [x] Keep the car in gentle motion rather than leaving it fully stopped at either end of its path.
* [x] Ensure wheel rotation follows the vehicle’s direction when approaching and leaving the charger.
* [x] Keep the charger, cable, charging indicator, and car readable at the scene’s actual rendered size.
* [x] Make the scene communicate the public-charging cost story rather than functioning as a generic driving animation.
* [x] At narrower widths, move the visual below the supporting copy and actions without changing the document’s reading order.
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

The initial merged-source mobile audit found no document-level horizontal overflow across 14 routes at 360x800, 375x812, 390x844, and 430x932. Its actionable findings were transferred into Pass 09, including Postcard Atlas fallback behavior and navigation, shared touch targets, Gravity Fleet controls, production debug gating, and narrow-screen typography.

Cloudflare preview and production checks were not available during that audit. Verify actual videos, external map behavior, headers, redirects, metadata, caching, direct loads, and production console/network behavior in Pass 11 and Pass 12. Do not mark those deployment-only checks as completed based on local evidence.

## Pass 09 - Mobile layout corrections and responsive bug fixes

**Status: IN REVIEW.** Source corrections were merged through PRs #6-#12. The first mobile audit's actionable findings are now preserved in subsections 09.1-09.6, while its generated screenshot set and standalone report have been retired as obsolete working artifacts. The remaining work is the regression and deployment verification in 09.7.

Implement these subsections as focused, independently reviewable handoffs while preserving the build-light architecture and the Pass 08 preservation contract.

### 09.1 Repair Postcard Atlas fallback behavior - highest priority

Relevant files: `projects/multi-platform-publishing-system/demo/assets/js/config.js`, `projects/multi-platform-publishing-system/demo/assets/js/background-video.js`, and `projects/multi-platform-publishing-system/demo/assets/css/styles.css`.

- [x] Normalize the configured fallback image against `document.baseURI`, or an equivalently reliable project-scoped base, before placing it in the CSS custom property.
- [x] Eliminate the incorrect request to `/projects/multi-platform-publishing-system/demo/assets/css/assets/background_image_clean.jpg` and resolve the approved image at `/projects/multi-platform-publishing-system/demo/assets/background_image_clean.jpg`.
- [x] Verify normal loading, direct nested-page loads, reduced motion, empty manifest, and forced video failure.
- [x] Preserve every approved image, video, manifest entry, transition, and recovery behavior.

### 09.2 Improve Postcard Atlas mobile navigation

The primary navigation is dense, wraps across multiple rows, has approximately 36-39px navigation targets, and consumes excessive narrow-screen header height.

- [x] Bring primary navigation and portfolio-return controls to approximately 44px touch targets.
- [x] Keep navigation clear at 320, 360, 375, 390, and 430px without merely adding padding and making the header taller.
- [x] Preserve Postcard Atlas identity, keyboard navigation, focus behavior, current-page indication, internal Home behavior, and the separate portfolio-return action.
- [x] After inspecting the implementation, choose either a compact accessible disclosure menu or a well-designed scrollable navigation row.

### 09.3 Increase shared portfolio touch targets

The report measures `Read case study` links at about 25.6px, footer links at about 23.5px, the shared brand link slightly below 44px, EV section navigation at about 43.2px, and EV/Shrinkflation back-to-top controls at about 43.8px. Relevant source families include `styles.css`, `script.js`, `projects/ev-true-cost.css`, and `projects/shrinkflation-tracker.css`.

- [x] Give important mobile controls comfortable touch areas of approximately 44 CSS pixels where practical while keeping visual weight restrained.
- [x] Preserve desktop spacing, homepage print/PDF behavior, explicit links and labels, focus states, and semantics.

### 09.4 Increase Gravity Fleet heatmap toggle targets

The Movement/Combat controls measure about 32px high. Relevant file: `games/gravity-fleet-lab.css`.

- [x] Use approximately 44px targets on mobile/coarse-pointer layouts while retaining compact desktop behavior.
- [x] Keep controls on one row where practical or wrap them cleanly at 320-390px.
- [x] Prevent collisions with analytics panels, post-match controls, and back-to-game navigation.

### 09.5 Harden debug/dev tools on production hosts

Prior local-storage state can allow Showcase or Gravity Fleet debug controls to persist on a production host. Relevant files include `script.js`, `games/gravity-fleet-lab.js`, and their fixed-panel rules in `styles.css` and game CSS.

- [x] Ensure an ordinary production visitor with no explicit debug query sees no debug toggles or panels.
- [x] Ensure persisted debug state cannot independently enable production debug UI; retain convenient localhost behavior.
- [x] Keep explicit production debug access usable and safe-area aware when intentionally invoked.
- [x] Verify with a clean profile and stale debug local-storage values.

### 09.6 Narrow-screen typography polish

After functional and accessibility corrections, consider the EV and publishing-system hero headings that wrap to four lines at 360px.

- [x] Improve first-viewport balance below 375px where possible while preserving hierarchy and readability.
- [x] Do not force truncation, tiny text, or clipping; leave this unchanged if correction would weaken the design more than it helps.

### 09.7 Mobile regression and deployment verification

- [ ] Review 320, 360, 375, 390, and 430px portrait widths; 768 and 1024px breakpoint-sensitive widths; relevant mobile landscape layouts; and 200% browser zoom.
- [ ] Verify no horizontal overflow or clipped content; direct load, refresh, Back/Forward, and anchor/hash behavior; keyboard navigation and visible focus; reduced motion; touch targets; and console and failed-network-request checks.
- [ ] Verify actual background videos and fallback recovery; Leaflet/OpenStreetMap attribution, markers, panels, and deep links; Photos filtering and lightbox; Journal filtering, expansion, and deep links; Ask validation and truthful disabled delivery; and homepage, Projects, project-page, and Showcase mobile layouts.
- [ ] Review a real Cloudflare pull-request preview where deployment behavior is involved.
- [ ] Include updated captures for materially changed routes in implementation PRs, using the existing QA screenshots only as before evidence. Do not create replacement screenshots for this documentation-only pass.

Implementation note (July 20, 2026): The fallback URL normalization, compact horizontally scrollable Postcard Atlas navigation, coarse-pointer touch targets, production debug-query gating, tablet navigation breakpoint, landscape touch-target corrections, and homepage mobile navigation disclosure with compact brand and print controls are implemented. Codex completed source implementation and local checks; Cloudflare preview deployment begins only after the branch and pull request are created, and external browser/visual QA remains a separate review step. Leave the Pass 09.7 browser and deployment checkboxes open until that review is completed.

QA progress note (August 3, 2026): Automated Cloudflare-preview review completed the responsive matrix, representative shared-site routes, Showcase Escape and focus return, Postcard Atlas navigation, journal filtering and deep links, photo filtering, map markers and attribution, Ask validation and disabled-delivery truthfulness, keyboard samples, and console review. A discovered Postcard Atlas lightbox focus defect was corrected and retested on the updated preview. Keep Pass 09.7 and its checkboxes open until Joey completes the review-log rows that still require physical-phone or unavailable DevTools evidence: HR-024, HR-026, HR-032, HR-034, HR-043, and HR-044.

Human QA follow-up (August 3, 2026): Joey approved HR-026, HR-034, HR-043, and HR-044, and confirmed that HR-032's core 200% zoom behavior passes. DEF-09.7-002 tracks the remaining homepage header height issue at phone landscape, short-height, and 200% zoom conditions. DEF-09.7-003 tracks shared project-page back-control alignment and mobile hero-action label collisions. This PR implements both focused corrections across the homepage and all four public project pages that use the shared portfolio header; HR-024, HR-027, and HR-032 remain open until the corrected immutable preview is retested. The proposed 2 x 2 mobile impact-card layout remains optional and is not included because the resulting 320px cards would be too narrow for comfortable reading.

Approved separate polish follow-up: remove the redundant `See the answer` and `Try your numbers` EV hero actions without resizing or repositioning the adjacent hero animation. Keep that work outside the Pass 09.7 closeout PR.

Pass 09 acceptance criteria:

- Every High and Medium finding transferred from the initial mobile audit into subsections 09.1-09.5 is fixed or explicitly dispositioned with rationale.
- Every changed route has updated mobile evidence, and no new horizontal overflow or clipped content is introduced.
- Touch targets meet the repository guideline where practical, production debug tools are absent for ordinary visitors, and Postcard Atlas fallback behavior works on nested routes and under reduced motion/video failure.
- Relevant interactions still work, console and network checks show no new local failures, and a Cloudflare pull-request preview is reviewed where deployment behavior is involved.
- Remaining low/cosmetic findings are completed or deliberately deferred in this roadmap.

## Pass 10 - Gravity Fleet modernization

**Status: IN REVIEW.** PR A / Passes 10.0-10.1 merged through PR #15 and commit `46dfa0ba05af90886506e779687786103030abc9`. PR B / Pass 10.2 implementation merged through PR #16 and commit `e8a46eb6571df4b8d1b885aad3c41b5c6cca0e05`; its automated fixed-step validation passes. Human Checkpoint 1 was recorded July 22, 2026 after PR #17. PR #18 / Pass 10.3 merged July 23, 2026 UTC through commit `8041c60f05ba9f99979bc968d8ac67af6231c68e`. PR #19 / Passes 10.4-10.5 merged July 23, 2026 UTC through commit `9cf984ef417851726b49c8f7b9f37f24636fe21b` after automated validation, Cloudflare-preview desktop QA, and physical-device portrait and landscape QA on an iPhone 17 Pro Max. PR #20 completed Pass 10.6 telemetry and analytics, and PR #21 corrected mobile match-end recovery; both are merged and verified following deployed-browser and mobile review. PR #23 completed Pass 10.7 page, header, and analytics polish, and PR #25 added the approved setup and orbit-speed follow-up. Pass 10.8 integrated QA, cleanup verification, and release approval remain open. PR #13 and commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` remain historical mobile-reference evidence, not the finished adaptive presentation.

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

- [x] PR #12, `Fix Projects header responsive back control`, merged into `main`.
- [x] PR #13, `Optimize Gravity Fleet for polished mobile play`, merged into `main`. Its mobile prototype and commit `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9` remain historical reference evidence, including its recorded thermal/playthrough observation.
- [x] PR #15, `Extract Gravity Fleet shared game core`, merged into `main` as PR A / Passes 10.0-10.1.
- [x] PR #16, `Add Gravity Fleet fixed-step runtime`, merged into `main` as PR B / Pass 10.2.
- [x] PR #18, `Introduce Gravity Fleet camera and viewport system`, merged into `main` as Pass 10.3 through commit `8041c60f05ba9f99979bc968d8ac67af6231c68e`.
- [x] PR #20, `Add Gravity Fleet mobile telemetry analytics`, merged into `main` as Pass 10.6.
- [x] PR #21, `Fix Gravity Fleet mobile match-end recovery`, merged into `main`; its follow-up verification completes Pass 10.6.
- [x] The shared core and fixed runtime are present on current `main`; future work starts cleanly from current `main`.
- [x] Keep unrelated shared-file changes out of Gravity Fleet implementation pull requests.
- [x] Deliver modernization through coherent, behavior-preserving pull requests rather than one rewrite commit.
- [x] Record the human desktop/mobile runtime checkpoint before beginning PR C without claiming the historical desktop candidate is a positively verified baseline.

Next branch scope:

Start from current `main` and use a focused Pass 10.8 release-candidate QA and cleanup branch. Do not reopen completed implementation passes unless the release matrix exposes a regression.

Recommended pull-request grouping:

1. **PR A - Core contracts and extraction:** merged through PR #15, Passes 10.0 and 10.1.
2. **PR B - Runtime and desktop restoration:** merged through PR #16, Pass 10.2 implementation and automated validation.
3. **Checkpoint 1 - desktop/mobile runtime evidence:** complete July 22, 2026.
4. **PR C - Camera:** merged through PR #18, Pass 10.3.
5. **PR #19 - Mobile shell and touch controls:** merged July 23, 2026 UTC through commit `9cf984ef417851726b49c8f7b9f37f24636fe21b`.
6. **PR #20 and PR #21 - Mobile telemetry and match-end recovery:** merged and verified; Pass 10.6 is complete.
7. **PR #23 and PR #25 - Page, header, analytics, setup, and orbit-speed polish:** merged; Pass 10.7 is complete.
8. **Next - Integrated QA and cleanup:** Pass 10.8 remains open pending the documented validation matrix, final cleanup verification, and release approval.

Do not ask an implementation agent to complete all remaining pull requests in one task.

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

**Implementation merged through PR #15.** Repository-supported baseline, contract, fixture, and diagnostics work is complete. The documented desktop reference remains a historical candidate rather than a positively verified performance baseline.

- [x] Preserve and document the known-good mobile reference, including the recorded playthrough and thermal observation in `docs/gravity-fleet/baseline-notes.md`.
- [x] Record the unresolved desktop-reference limitation and available candidate evidence rather than claiming a verified trace.
- [x] Document engine, runtime, view, input, telemetry, persistence, and presentation responsibilities in `docs/gravity-fleet/pr-a-contract.md`.
- [x] Capture the saved-run storage/schema as the synthetic compatibility fixture `tools/fixtures/gravity-fleet/saved-run-v1.json`.
- [x] Add a seedable validation random source and deterministic command fixture at `tools/fixtures/gravity-fleet/level-1-command-sequence.json`.
- [x] Add development-only diagnostics for timing, frame, and gameplay gauges; normal visitors do not receive the diagnostics.
- [x] Preserve normal gameplay randomness and avoid intentional gameplay changes.

Acceptance criteria: **complete for repository-supported work.** The original stop condition is satisfied by explicit documentation of the desktop-verification limitation, not by inventing historical browser performance evidence.

### 10.1 Extract the shared game core

**Implementation merged through PR #15 and commit `46dfa0ba05af90886506e779687786103030abc9`.** `games/gravity-fleet/core.mjs` and `games/gravity-fleet/levels.mjs` now hold shared gameplay truth; `games/gravity-fleet-lab.js` remains the presentation/bootstrap adapter.

- [x] Extract shared level configuration, state, orbital motion, production, AI, commands, combat, outcomes, scoring, telemetry production, and run serialization into presentation-neutral modules.
- [x] Provide presentation-neutral launch, wormhole, pause, resume, reset, and cancel command handling.
- [x] Preserve saved-run schema, storage key, telemetry meanings, analytics calculations, and existing presentation adapters.
- [x] Add and pass the no-dependency deterministic validator for levels, fixed-seed command replay, win/loss paths, telemetry, saved runs, and serialization.
- [x] Verify the shared engine boundary excludes DOM, viewport, canvas, and device dependencies.
- [x] Keep the route build-light with browser-native modules and no new framework, bundler, package manager, backend, database, or runtime dependency.
- [x] Keep implementation changes scoped to Gravity Fleet rather than unrelated shared files.

Acceptance criteria: **complete for the merged implementation.** Current desktop and mobile continue through the existing presentation adapters; camera and input redesign remain later scope.

### 10.2 Replace the runtime clock and restore desktop quality

**Implementation merged through PR #16 and commit `e8a46eb6571df4b8d1b885aad3c41b5c6cca0e05`; Human Checkpoint 1 completed July 22, 2026.** `docs/gravity-fleet/pr-b-runtime.md` records the runtime contract.

- [x] Replace elapsed-threshold skipping with a 60-step-per-second fixed simulation and separate render scheduling.
- [x] Cap catch-up work and reset the timing epoch after hidden-page restoration, pause, reset, orientation, and relevant presentation transitions.
- [x] Provide Desktop High, Mobile Balanced, and Reduced Motion presentation profiles.
- [x] Keep HUD and telemetry schedules independently controlled.
- [x] Verify deterministic equivalence at 30 Hz, 60 Hz, and 144 Hz callback schedules.
- [x] Provide runtime diagnostics and automated saved-run, telemetry, win/loss, and engine-boundary checks.
- [x] Complete a current-main desktop match through analytics and approve trails, effects, mouse responsiveness, live telemetry, and perceived frame pacing without treating the historical candidate as a verified trace.
- [x] Review the runtime debug view and confirm it does not reveal an obvious persistent failure; exact exported percentile values were optional checkpoint evidence and were not recorded.
- [x] Complete a current-main iPhone smoke/full-match check and confirm no thermal or input regression.

**Checkpoint 1 complete July 22, 2026:** Joe completed the current-main desktop and iPhone verification recorded in `docs/gravity-fleet/modernization-roadmap.md`. `node tools/validate_gravity_fleet.js` remains supporting automated evidence rather than a substitute for those observations.

### 10.3 Introduce the camera and viewport system

**Purpose:** Solve portrait composition with a world camera rather than shrinking or CSS-rotating the complete interface.

**Merged through PR #18 on July 23, 2026 UTC at `8041c60f05ba9f99979bc968d8ac67af6231c68e`; Cloudflare preview and physical-device camera review remain pending.** See `docs/gravity-fleet/pr-c-camera.md` for the coordinate-space, viewport, diagnostics, and validation contract.

- [x] Create a camera abstraction that owns world-to-screen and screen-to-world transforms, rotation, scale, translation, tactical viewport dimensions, safe gameplay bounds, orientation mode, and resize handling.
- [x] Introduce an identity-equivalent desktop camera and verify exact coordinate mapping in the deterministic validator.
- [x] For portrait mobile, rotate the world camera 90 degrees counterclockwise while leaving world coordinates unchanged.
- [x] Position Cyan's starting side toward the bottom in portrait.
- [x] Fit the rotated world inside a reserved tactical rectangle after accounting for current safe-area, HUD, control, telemetry, and breathing-room needs. Pass 10.4 will supply the final shell-owned rectangle.
- [x] Keep HUD text, controls, labels, and charts upright.
- [x] Use the inverse camera matrix for touch and pointer hit testing.
- [x] Lock camera orientation to the viewport mode; do not rotate continuously to follow a moving planet.
- [x] Preserve moving planets. Do not make planets stationary merely to solve layout.
- [x] For landscape mobile, use the native landscape world orientation and an orientation-specific tactical rectangle. The dedicated landscape shell remains Pass 10.4 scope.
- [x] Recalculate safely when browser chrome, `VisualViewport`, orientation, the game container, or safe-area dimensions change.
- [x] Cancel active gestures before applying a new transform.
- [x] Add temporary development visualization for world bounds, tactical rectangle, safe margins, camera center, scale, rotation, and pointer coordinates.

Acceptance criteria:

- Desktop camera introduction produces no observable layout or input regression.
- Portrait uses substantially more vertical space.
- Cyan begins toward the bottom in portrait.
- All worlds remain visible without distortion.
- Hit testing is accurate near edges and corners.
- No interface text or chart is sideways.
- Orientation changes do not leave stale pointer state.
- Camera transforms do not alter world state, scoring, or telemetry.

Automated camera and gameplay checks pass. Observable desktop parity, portrait space use, short-landscape composition, and real-device edge targeting remain the Cloudflare preview and physical-device review gate before the camera slice is merged.

### 10.4 Build the dedicated mobile match shell

**Purpose:** Replace independently fixed overlays with one safe-area-aware layout system.

**Implementation and QA complete in PR #19; merge pending.** Cloudflare-preview desktop review and iPhone 17 Pro Max portrait and landscape review passed. The composed shell is the default mobile presentation. Developers can recover the earlier presentation with `?gravityDebug=1&gravityMobileShell=legacy`; `?gravityDebug=1&gravityMobileShell=modern` selects the replacement explicitly. The tactical canvas is measured from the shell-owned viewport rather than interim top/bottom reservations. See `docs/gravity-fleet/mobile-shell-touch-controls.md` for the shell, pause, gesture, and rollback contract.

Required shell regions:

```text
Mobile match shell
├── Compact top HUD
├── Tactical viewport
├── Bottom command dock
└── Telemetry handle and drawer host
```

- [x] Build the shell behind an explicit development flag while retaining the current proven mobile shell as a fallback.
- [x] Make the shell own the visual viewport only during active mobile gameplay.
- [x] Reserve layout space between major regions rather than positioning all controls over a full-screen canvas.
- [x] In portrait, provide:
  - mission/level;
  - timer;
  - compact Cyan, Red, and Orange status;
  - Pause;
  - telemetry/menu trigger;
  - rotated tactical viewport;
  - large Launch and Wormhole controls;
  - smaller Clear Wormhole control;
  - compact telemetry handle.
- [x] Move the public FPS display to development mode.
- [x] Remove permanent instructional paragraphs from the tactical field; use brief contextual feedback.
- [x] In landscape, provide a compact one-row HUD, wide tactical viewport, side or compact-corner controls, and a telemetry side sheet where practical.
- [x] Add a true Pause state that stops simulation, AI, timers, and telemetry sampling while leaving the interface responsive.
- [x] Ensure Resume resets timing without a large elapsed-time jump.
- [x] Keep setup, tutorial, outcome, and return flows accessible and viewport-safe in the source implementation.
- [x] Cut over only after portrait and landscape play, setup, pause, drawer, outcome, and return flows work without a black screen.
- [ ] Remove the old mobile shell only after the replacement reaches parity. Parity is proven; retain the legacy shell temporarily as a development rollback path until Pass 10.8 cleanup.

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

**Implementation and QA complete in PR #19; merge pending.** The selected mobile lifecycle policy is a 0.75-second preparation window, a 2.5-second active countdown beginning on first eligible Cyan transit, and a 10-second absolute maximum. Automated lifecycle validation and iPhone 17 Pro Max testing confirmed placement, activation, visible countdown, expiry, Clear Wormhole, Pause/Resume, and cancellation behavior. The roadmap's broader two-configuration comparison remains deferred rather than claimed complete.

- [x] Make Launch and Wormhole explicit, mutually exclusive modes.
- [x] Selecting one mode deactivates the other and safely cancels an incomplete gesture.
- [x] Expose the selected mode visually and programmatically.
- [x] Preserve desktop mouse controls.

**Launch gesture:**

- [x] Touch an owned Cyan world.
- [x] Drag to gather and aim.
- [x] Show live selection and trajectory feedback.
- [x] Release to launch.
- [x] Cancel on pointer cancellation, pause, drawer opening, orientation change, or mode switch.

**Wormhole gesture:**

- [x] Select Wormhole.
- [x] Touch the entrance.
- [x] Drag toward the exit.
- [x] Show entrance, exit, direction, maximum range, and valid/invalid state.
- [x] Release to create.
- [x] Cancel too-short or invalid gestures clearly.
- [x] Remove two-tap placement as the primary mobile behavior.

**Clear Wormhole:**

- [x] Add a dedicated Clear or Collapse control.
- [x] Disable it when no Cyan wormhole exists.
- [x] Collapse the current Cyan wormhole immediately.
- [x] Never use it as a placement action.
- [x] Provide brief visual confirmation.

**Wormhole lifecycle experiment:**

- [x] Make lifespan configuration-owned rather than embedded in mobile presentation code.
- [x] Prototype a short preparation period.
- [x] Begin the active countdown when the first eligible Cyan ship enters.
- [x] Test collapse approximately 2-3 seconds after activation.
- [x] Keep a longer absolute maximum for an unused wormhole.
- [x] Display remaining life with a visible ring or equivalent indicator.
- [ ] Playtest at least two configurations before finalizing values. The retained configuration passed device QA; comparative tuning is deferred.

- [x] Update mobile tutorial content for Launch drag, Wormhole drag, Clear Wormhole, Pause, and telemetry access.
- [x] Keep desktop instructions specific to mouse controls.

Acceptance criteria:

- Two-tap wormhole placement is no longer the primary mobile interaction.
- Launch and Wormhole cannot both be active.
- Drag previews remain accurate through camera transforms.
- Clear Wormhole is discoverable and reliable.
- Lifespan is visible and understandable.
- Pointer cancellation never leaves stuck command state.
- Desktop controls remain unchanged.
- Tutorial instructions match actual behavior.

**Human Checkpoint 2 complete July 23, 2026:** The PR #19 Cloudflare preview passed desktop review and portrait/landscape testing on an iPhone 17 Pro Max. Launch, Wormhole, wormhole lifespan, Clear Wormhole, Pause/Resume, input cancellation, tutorial flow, camera framing, shell startup, and return flows passed. The mobile Launch tutorial illustration was corrected to show the gesture beginning on the owned Cyan planet.

### 10.6 Redesign live telemetry and mobile post-match analytics

**Purpose:** Preserve Gravity Fleet's analytical identity while using progressive disclosure and avoiding hidden chart cost.

- [x] Create one structured telemetry view model used by desktop live telemetry, mobile HUD, mobile drawer, outcome summary, full analytics, and saved-run rendering.
- [x] Prevent individual surfaces from independently recalculating gameplay totals.

**Always-visible mobile HUD:**

- Timer.
- Cyan fleet strength or ship count.
- Cyan worlds.
- Compact rival status.
- Active command mode.
- Contextual wormhole countdown, star-control change, or launch confirmation only when relevant.

**Mobile telemetry drawer:**

- [x] Make Fleet Strength over Time the primary live chart.
- [x] Add the real System Mix donut with compact faction legend.
- [x] Add compact label/value metrics for largest launch, ships in flight, deep-space fights, ship transits, star control, and wormholes where space permits.
- [x] Provide Close or Resume as the primary action.
- [x] Keep Reset and Choose Level visually secondary.
- [x] Remove the full recent-event feed from the primary drawer.
- [x] Move event history to post-match analytics, an optional Log disclosure, a single latest-event line, or development mode.
- [x] In landscape, prefer a side sheet so telemetry does not consume the limited vertical field.

**Chart scheduling:**

- [x] Do not redraw charts while the drawer is closed.
- [x] Draw immediately when the drawer opens.
- [x] Update visible charts approximately once per second.
- [x] Stop chart rendering when the drawer closes.
- [x] Stop sampling when paused or hidden.
- [x] Render one final state when the match ends.

**Mobile post-match hierarchy:**

- [x] Add one result strip containing outcome, score, and duration.
- [x] Add a compact two-column highlight grid for captures, destroyed ships, largest launch, transits, wormholes, and peak advantage.
- [x] Follow with fleet-strength and system-control charts, the most important turning point, and a concise run insight.
- [x] Place lower-priority values beneath an expandable `All match statistics` region.
- [x] Preserve full desktop analytical depth.

**Complete and verified:** PR #20 merged the presentation-neutral telemetry projection and chart-scheduling boundary in `games/gravity-fleet/telemetry.mjs`; PR #21 then fixed mobile match-end recovery. Deterministic validation covers live/run parity, legacy saved-run compatibility, zero scheduled chart work while closed or paused, immediate opening render, one-second visible cadence, and one final match-end render. Deployed-browser and mobile review verified the telemetry and analytics presentation, completing Pass 10.6.

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

**Implementation:** Complete through PR #23, with the approved setup and orbit-speed follow-up in PR #25. Final cross-route, device, accessibility, and production verification remains in Pass 10.8.

**Header modes:**

- [x] Full: back action, brand identity, and project navigation.
- [x] Compact: compact back action, centered or concise JW identity, one compact project/menu action, and one row only.
- [x] Active match: hide the portfolio header and use the game-level return action.
- [x] Prefer a stable component mode over accumulating device-specific width patches.
- [x] Coordinate shared `styles.css` changes with Pass 09 and verify unrelated project pages.

**Gravity hero:**

- [x] On mobile, show the eyebrow, `Gravity Fleet Lab`, one concise value statement, Play, View Analytics, and a collapsed How to Play or Mission Briefing disclosure.
- [x] Move the full six-step mission briefing out of the first mobile viewport.
- [x] Use a two-column action layout when it fits.
- [x] Stack at the narrowest widths.
- [x] Allow safe button wrapping.
- [x] Preserve approximately 44px touch targets.
- [x] Avoid changing unrelated hero layouts unintentionally.

**Active-match transition:**

- [x] Remove the surrounding portfolio page from active layout participation while the mobile match shell owns the viewport.
- [x] Restore document state, scroll position, and focus predictably when leaving the match.
- [x] Keep browser Back and Forward behavior coherent.

**Debug tools:**

- [x] Ensure stale local-storage values cannot expose development controls to ordinary production visitors.
- [x] Keep explicit query access where intentionally supported.
- [x] Keep development panels safe-area aware.
- [x] Keep FPS, camera bounds, and performance diagnostics development-only.

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

1. **After PR B - Desktop restored - COMPLETE**
   - Desktop feel, visual quality, mouse responsiveness, gameplay continuity, and the mobile fallback were reviewed before camera work continued.

2. **After PR #19 through PR #21 - Mobile game experience - COMPLETE**
   - Portrait and landscape play, Launch, Wormhole, Clear, Pause, Telemetry, match-end recovery, and mobile composition were reviewed before shared-page polish.

3. **After Pass 10.8 - Release candidate - PENDING**
   - Complete a mobile playthrough.
   - Complete a desktop playthrough.
   - Inspect header, hero, live telemetry, outcome, and post-match analytics.
   - Approve final release after the full validation and cleanup matrix is recorded.

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

## Pass 13 - PHX Transit Pulse

**Status: IN REVIEW.** Pass 13.1a is approved and closed. Its mapped-build closeout was completed August 3, 2026 against commit `6111ac3d702e24baefb0a9219bcaa31fe9ef80a9` and immutable Cloudflare deployment `https://b5736fb1.portfolio-deo.pages.dev/`. The accepted 200 percent zoom limitation and the explicitly deferred blocked-style and individual blocked-tile resilience checks remain documented as nonblocking follow-up work; those deferred checks were not run and are not claimed as passing. Later PHX Transit passes remain gated as described below.

Commit `728434f23210611e1efc9da7c218cbedbed1fec5` subsequently delivered a material working-copy redesign across the PHX Transit fixtures, HTML, CSS, and JavaScript. The July 26 mapped-build implementation then added pinned MapLibre GL JS, OpenFreeMap's dark Phoenix-area basemap, fictional geographic overlays, synchronized interaction, and the retained schematic fallback. The route-polish pass later aligned those fictional service patterns to OpenStreetMap road and rail infrastructure without introducing provider operational data or runtime routing. Because these changes occurred after the recorded Pass 13.1 QA, the earlier report must not be treated as full verification of the current mapped build.

Current PHX Transit queue:

- [x] Complete the original Pass 13.1 synthetic dashboard, deterministic replay, explicit states, accessible map alternative, and browser QA.
- [x] Complete the synthetic operations-console redesign while preserving fictional data, deterministic behavior, accessibility, and explicit non-live labeling.
- [x] Resolve the interactive-map plan's dependency-delivery, tile-service, synthetic-geography, and fallback decision gates.
- [x] Replace the schematic-only primary map with a real Phoenix-area basemap plus fictional routes, stops, vehicles, and alerts while preserving the accessible records table and a reliable fallback.
- [x] Run repository-supported mapped-build regression across 360-1440 pixel layouts, all six demonstration states, replay, filtering, selection/reset, schematic fallback, artifact validation, and route smoke testing; record the mobile-hierarchy follow-up separately.
- [x] Update the detailed PHX Transit roadmap and validation evidence to distinguish the original schematic baseline, mapped-build local regression, artifact-parity evidence, and remaining controlled checks.
- [x] Complete the controlled mapped-build release gate for short-height layouts, 200 percent zoom, full keyboard traversal, reduced motion, hidden-tab restoration, blocked MapLibre, console/network health, and a fresh Cloudflare preview; preserve blocked-style and individual blocked-tile resilience as nonblocking follow-up work without claiming those checks passed.

Public live ingestion and provider-derived replay remain blocked until provider terms permit the intended credential handling, polling, caching, retention, normalization, and redistribution. The baseline and mapped-build QA record remains at [`docs/phx-transit/validation/pass-13.1-viewport-interaction-qa-report.md`](docs/phx-transit/validation/pass-13.1-viewport-interaction-qa-report.md). Current design guidance and the completed historical map plan are documented in [`docs/phx-transit/design/README.md`](docs/phx-transit/design/README.md) and [`docs/phx-transit/plans/interactive-map-implementation-plan.md`](docs/phx-transit/plans/interactive-map-implementation-plan.md), with later live-data gates maintained in [`docs/phx-transit/roadmap.md`](docs/phx-transit/roadmap.md).

## Pass 14 - Legacy analytics modernization

**Status: IN REVIEW.** Passes 14.0-14.3 are implemented; rendered publication QA for Procurement and Where Revenue Gets Stuck and legacy-repository retirement remain gated. The legacy `Joey-VW/DataAnalyticsPortfolio` repository contains useful analytics work, but its strongest projects predate the current portfolio's standards for plain-language storytelling, reproducible data preparation, interactive presentation, validation, accessibility, and truthful lifecycle metadata. Do not copy the old repository wholesale. Treat it as source material and selectively rebuild only the projects that materially strengthen the current portfolio.

Rendered publication QA and lifecycle changes should resume only after the current release path through Pass 12 is stable. Small registry or documentation corrections may be handled earlier when they are low-risk and independently verifiable.

### Migration decisions

- **Procurement KPI Analysis - migrate and substantially modernize.** This is the highest-priority legacy project because it directly demonstrates SQL, BigQuery, Python, pandas, ETL, KPI design, supplier-performance analysis, and Looker Studio.
- **Quote-to-Cash Workflow Audit - migrate and rebuild.** Preserve the cross-system lifecycle concept, but replace the notebook-only presentation and strengthen the analytical methodology, synthetic-data design, exception handling, and case-study UX.
- **DataFrameInspector - selectively extract.** Preserve the focused dataframe-profiling behavior as supporting implementation code when maintained projects actually use it; do not migrate the entire legacy utilities module by default.
- **ScrapeX - do not migrate.** Leave the X/Twitter scraping utility as unsupported historical work. Do not create a new project card or active case study for it.
- **CFPB Complaint Intelligence - treat separately.** Do not classify it as a legacy migration unless an actual source implementation is found in the legacy repository. Keep it hidden until independently implemented and point its repository metadata at the implementation that actually owns the code.
- Preserve the legacy repository and Git history until migrated projects no longer depend on it. Prefer archiving it after migration rather than deleting it.

### 14.0 Migration governance and registry cleanup

- [x] Add or retain a detailed migration plan under `docs/plans/` that records the source audit, migration decisions, analytical gaps, presentation requirements, and acceptance criteria for each selected project.
- [x] Keep Procurement KPI Analysis `status: "in-progress"` and `visibility: "hidden"` until the modernized implementation is complete and verified.
- [x] Add Quote-to-Cash Workflow Audit to `data/projects.json` as hidden/in-progress before implementation work begins.
- [x] Use the original project creation date for Quote-to-Cash rather than the date it is added to the new registry; use `2025-06-30` unless repository history or surviving source evidence establishes an earlier creation date.
- [x] Correct CFPB Complaint Intelligence repository metadata if it still points at `Joey-VW/DataAnalyticsPortfolio` without a corresponding implementation there.
- [x] Do not expose unfinished migration work through the homepage, project index, or Showcase launcher.

Acceptance criteria:

- Every reviewed legacy asset has an explicit migrate, extract, retire, or separate-project decision.
- Registry metadata points to the repository that actually owns each maintained implementation.
- No unfinished migrated project becomes publishable through accidental lifecycle metadata.
- Legacy creation dates remain chronological and are not reset to the migration date.

### 14.1 Procurement KPI Analysis modernization

#### Analytical foundation

- [x] Reacquire or preserve a reproducible copy of the source dataset and document its provenance, date coverage, licensing information supplied by the source, and known limitations.
- [x] Define a procurement data contract covering identifiers, dates, quantities, prices, defect counts, compliance values, category values, and permitted nulls.
- [x] Add explicit data-quality checks for unique purchase-order IDs, parseable dates, valid quantities and prices, defect counts within valid bounds, known compliance values, missing deliveries, and impossible delivery sequences.
- [x] Define every displayed KPI in a metric dictionary, including formula, denominator, missing-data behavior, and business assumption.
- [x] Make the assumed on-time-delivery threshold explicit rather than burying it in SQL.
- [x] Verify the existing weekly-period derivation semantics before carrying forward any claim about the start day of the week.
- [x] Replace unsupported universal "best supplier" claims with quantified tradeoffs or a documented scoring model.

#### Reproducible pipeline

- [x] Refactor the legacy Kaggle-to-pandas-to-BigQuery pipeline so source paths, project IDs, destination tables, and other environment-specific configuration are not hard-coded into the analytical logic.
- [x] Stop destructively moving the downloaded source CSV into the working directory.
- [x] Add structured failure handling and logging appropriate to a reproducible portfolio workflow.
- [x] Keep BigQuery as a documented implementation component without requiring cloud credentials merely to view the public case study.
- [x] Produce a deterministic, committed browser-ready JSON artifact from the validated analytical model.
- [x] Add focused tests for transformations, quality rules, and KPI calculations.

#### Analytical model and portfolio experience

- [x] Generate supplier-level, category-level, and time-based summaries from one documented metric layer.
- [x] Add a transparent supplier-priority comparison that can demonstrate how the preferred supplier changes when cost, reliability, quality, or compliance is weighted differently.
- [x] Replace the current generic placeholder page with a project-specific experience that explains the business question before implementation details.
- [x] Include a clear source/data section, pipeline/data-flow explanation, supplier scorecard, category drill-down, quantified findings, methodology, assumptions, and limitations.
- [x] Preserve useful Looker Studio screenshots or a live dashboard link only if the external dashboard is still available and accurately reflects the documented model.
- [x] Ensure the public page does not claim staging tables, fact/dimension modeling, validation checks, or other architecture that the maintained implementation does not actually contain.

Publication acceptance criteria:

- The browser-ready artifact can be reproduced from documented source inputs.
- All public KPI definitions match the maintained code and data.
- Business findings are quantified and do not imply an unsupported scoring model.
- Source provenance, assumptions, synthetic or derived elements, and limitations are visible to the reader.
- Responsive, keyboard, zoom, reduced-motion, console/network, direct-route, and Cloudflare preview checks meet the applicable production smoke gate.
- Only after verification should Procurement change to `status: "ready"` and `visibility: "public"`.

### 14.2 Quote-to-Cash Workflow Audit modernization

#### Synthetic source and analytical methodology

- [x] Replace the workbook-centered workflow with deterministic synthetic source generation or reproducible source fixtures while preserving the transparent fictional framing.
- [x] Model the opportunity, subscription, and revenue-recognition stages as separate related entities with documented keys and relationships.
- [x] Add meaningful variation in deal size, product or plan, lifecycle timing, downstream status, and intentionally injected workflow exceptions so the audit has realistic signals to inspect.
- [x] Use a fixed seed or equivalent deterministic mechanism so generated case-study results remain reproducible.
- [x] Replace blanket `dropna()` filtering with stage-specific cohorts so incomplete lifecycle records are measured rather than silently removed.
- [x] Define conversion rates independently for opportunity-to-won, won-to-subscription, and subscription-to-recognized stages.
- [x] Calculate stage timing with documented cohorts and include appropriate summary statistics such as median and upper-percentile delay, not only mean.

#### Integrity and exception analysis

- [x] Validate unique identifiers and opportunity-to-subscription and subscription-to-revenue relationships.
- [x] Detect broken joins, duplicate identifiers, impossible date sequences, subscriptions attached to ineligible opportunities, recognition without valid activation, missing downstream records, suspended or stalled states, and unusually slow stage transitions.
- [x] Surface incomplete-stage rates and exception counts as first-class audit findings.
- [x] Preserve the legacy notebook's useful next-step themes - outlier detection, revenue over time, status comparisons, and downstream delay simulation - only where they are implemented or clearly labeled as future work.

#### Portfolio experience

- [x] Build the case study around the plain-English question: where is revenue getting stuck between a sale and recognized revenue?
- [x] Include a lifecycle overview, conversion funnel, stage-time comparison, distributions or percentile views, exception summary, bottleneck narrative, methodology, and limitations.
- [x] Consider a simple scenario control that shows how reducing one stage's delay affects total Quote-to-Cash elapsed time.
- [x] Keep the notebook as supporting evidence if useful, but do not make a raw notebook the primary portfolio experience.

Publication acceptance criteria:

- Synthetic-data rules are documented and deterministic.
- Cohorts, joins, conversion denominators, and timing calculations are explicit and reproducible.
- Missing or broken lifecycle records are measured rather than discarded.
- The public story distinguishes generated data from real operational data.
- Responsive, keyboard, zoom, reduced-motion, console/network, direct-route, and Cloudflare preview checks meet the applicable production smoke gate.
- When approved, publish Quote-to-Cash as `status: "ready"` and `visibility: "public"`; default to `featured: false` unless Showcase capacity and portfolio balance justify promotion.

### 14.3 Shared analytics utility cleanup

- [x] Extract only the focused `DataFrameInspector` behavior needed by maintained analytics workflows into a small shared module.
- [x] Remove unrelated BigQuery, monitoring, charting, and other heavy imports from the inspector module unless the inspector itself genuinely requires them.
- [x] Add type hints, focused documentation, predictable sample-value limits, and unit tests.
- [x] Migrate PivotTable, PivotChart, BigQuery extraction/insertion helpers, or other legacy utility classes only when current maintained code has a demonstrated use for them.
- [x] Do not create a public "utilities" project merely to preserve old code.

Acceptance criteria:

- Every migrated helper is used by maintained code or has an independently justified near-term purpose.
- Small dataframe profiling does not require unrelated cloud or visualization dependencies.
- Utility behavior has focused automated coverage.

### 14.4 Legacy repository retirement

- [ ] Do not retire `DataAnalyticsPortfolio` until Procurement and Quote-to-Cash have either been migrated or explicitly abandoned.
- [ ] Replace the legacy root README with a concise archived-portfolio notice that points visitors to the current portfolio.
- [ ] Record the final disposition of major legacy work: Procurement migrated, Quote-to-Cash migrated, ScrapeX unsupported/not migrated, and utilities selectively absorbed where applicable.
- [ ] Remove active current-portfolio dependencies on the legacy repository except intentional historical/original-version links.
- [ ] Preserve Git history and archive the repository rather than deleting it.

Acceptance criteria:

- The current portfolio contains the maintained implementation and documentation for every migrated project.
- Visitors to the legacy repository are clearly directed to the active portfolio.
- Unsupported projects are not presented as maintained.
- No useful migration provenance is lost.

### Pass 14 release strategy

Recommended sequence after the current release is stable:

1. Pass 14.0 migration governance and registry cleanup.
2. Pass 14.1 Procurement KPI Analysis modernization and publication.
3. Pass 14.2 Quote-to-Cash Workflow Audit modernization and publication.
4. Pass 14.3 shared analytics utility cleanup, performed alongside 14.1/14.2 where practical.
5. Pass 14.4 legacy repository retirement.

Do not hold Procurement publication until Quote-to-Cash is complete. Procurement is the stronger and more mature legacy asset and should ship independently once its own acceptance criteria are satisfied.

## Pass 15 - Plain-English copy pass

**Status: LATER.** Use [`docs/plans/plain-english-copy-audit.md`](docs/plans/plain-english-copy-audit.md) as the detailed source audit. The portfolio is already strongest where it explains the visitor's question or outcome first, then introduces technical terminology as supporting evidence. This pass should make that pattern consistent across navigation, project cards, controls, helper text, generated states, accessibility labels, and case-study prose.

Do not remove useful technical keywords from skill inventories, methodology sections, source notes, or implementation evidence. The goal is layered communication: plain meaning first, technical term second when it improves precision or credibility.

### 15.0 Copy inventory and implementation guardrails

- [ ] Reconfirm the audit against the current branch before editing because project copy may have changed since the original review.
- [ ] Treat visible HTML copy, JavaScript-generated strings, JSON-driven project descriptions, controls, helper text, status messages, empty/error states, accessibility labels, and data-source explanations as in scope.
- [ ] Exclude source-only names, CSS classes, internal identifiers, test fixtures not shown to visitors, and intentionally technical debug/development labs.
- [ ] Preserve domain terms that function as evidence, established labels, units, or themed names; add a plain-English explanation rather than flattening meaningful terminology.
- [ ] Prefer targeted edits over redesigns. Do not change analytical meaning, data provenance, lifecycle status, interaction behavior, or implementation claims while simplifying copy.

Acceptance criteria:

- Every changed phrase can be traced to a visible visitor-facing surface.
- Technical accuracy and project-specific meaning are preserved.
- No hidden or in-progress project becomes public as a side effect of copy work.
- Copy changes do not require new runtime dependencies or a build-system change.

### 15.1 P0 public-facing copy

- [ ] Update global portfolio language where navigation, card taxonomy, résumé framing, and repeated labels describe implementation before value.
- [ ] Review `data/projects.json` so project summaries and categories describe what each project helps a visitor understand or do before describing the stack or architecture.
- [ ] Complete the Gravity Fleet pass across desktop and mobile controls, setup/help text, live states, pause/reset messages, post-match results, benchmark comparisons, and accessibility labels.
- [ ] Complete the Colony Ops pass across instructions, controls, generated insights, results language, sample comparisons, and reduced-motion messaging.
- [ ] Complete the Shrinkflation Tracker pass across metric labels, data-status language, source/history explanations, formulas, and modeled-versus-collected data disclosures.

Priority guidance from the audit:

- Replace implementation-first labels such as `Telemetry`, `KPIs`, `benchmark`, `normalization`, and `trend-ready` where a clearer first-read label exists.
- Keep the technical term in secondary copy, methodology, tool inventories, or units when it adds useful specificity.
- Explain mixed collected and modeled data in direct visitor language before presenting pipeline terminology.

Acceptance criteria:

- A nontechnical visitor can understand the purpose of each public control, metric, status, and result without reading implementation documentation.
- Gravity Fleet and Colony Ops retain their game-specific tone while removing unnecessary analytics jargon from the first layer.
- Shrinkflation clearly distinguishes collected observations, sample or modeled history, parsing/review states, and formulas.
- Project-card copy remains accurate, concise, and consistent wherever the registry is rendered.

### 15.2 P1 case-study and supporting copy

- [ ] Apply the small EV Cost Check terminology and grammar corrections documented in the audit without disturbing its existing story structure.
- [ ] Rewrite the Multi-Platform Publishing System explanation around the publisher workflow first, then retain CSV, Apps Script, Cloudflare, normalization, fallback, and routing details as technical evidence.
- [ ] Review the Postcard Atlas About page and related labels so architecture is explained in visitor language before implementation terminology.
- [ ] Standardize repeated headings and labels such as `Impact`, `Featured`, `stack`, `architecture`, provenance/source language, and benchmark/sample comparisons where the audit identifies clearer alternatives.

Acceptance criteria:

- The publishing-system case study first explains what the publisher can do and how the website responds, before describing its architecture.
- EV Cost Check remains concise and technically accurate, including units and source classifications.
- Shared labels use the same wording across homepage, project hub, project pages, and generated UI where they represent the same concept.

### 15.3 P2 hidden and pre-publication projects

- [x] Apply the audit to PHX Transit Pulse before publication, using plain-language labels first and GTFS-Realtime, feed-age, operational, and reliability terminology as supporting detail. Completed before publication in PR #36.
- [ ] Review Procurement KPI Analysis and Quote-to-Cash Workflow Audit after their modernization copy stabilizes and before either project changes to public/ready.
- [ ] Review CFPB Complaint Intelligence, Video Cutter, and any other hidden project only when an actual implementation approaches publication; do not spend release time polishing placeholder copy that may be replaced.
- [ ] Add project-specific copy acceptance checks to publication QA for future projects so jargon does not accumulate again.

Acceptance criteria:

- Every project moving from hidden/in-progress to public/ready receives a plain-English copy review as part of its release gate.
- PHX Transit Pulse explains freshness, delay, alerts, filters, replay, and fictional/synthetic data states without requiring transit-data expertise.
- Analytics case studies lead with the business question, finding, and implication before pipeline or modeling terminology.

### 15.4 Verification and completion

- [ ] Search maintained source files for the audit's highest-risk terms and inspect each visitor-facing occurrence in context rather than applying blind replacements.
- [ ] Verify generated and state-dependent copy by exercising controls, empty/error states, pause/reset flows, filters, scenario controls, and local-history or comparison views.
- [ ] Run the applicable repository validators and JavaScript/Python syntax checks for every edited data or script file.
- [ ] Perform responsive, 200 percent zoom, keyboard, screen-reader-label, reduced-motion, and print checks where copy length can affect layout or comprehension.
- [ ] Confirm that simplified copy does not overstate real-time status, data completeness, benchmark validity, causal conclusions, or production readiness.
- [ ] Update the detailed audit when recommendations are intentionally rejected or superseded so the document remains a useful record rather than a stale checklist.

Pass completion criteria:

- P0 public-facing surfaces are complete and verified.
- Applicable P1 and P2 work is completed before each affected project receives final publication approval.
- Technical terms remain available where they add evidence, but the first reading layer consistently explains meaning, action, or outcome.
- No material regressions appear in layout, accessibility, project lifecycle filtering, data claims, or interactions.

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
- PHX Transit Pulse's current synthetic presentation and interactive-map phase are validated while provider-blocked live ingestion remains honestly deferred;
- public-facing and publication-bound copy follows the plain-English-first, technical-detail-second standard documented in Pass 15;
- Pass 12 final validation confirms coherent mobile, desktop, reduced-motion, keyboard, zoom, print, route, asset, privacy, and Cloudflare behavior; and
- deferred backend and operational work is either explicitly completed with evidence or remains honestly labeled as deferred.
