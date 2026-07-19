# Portfolio Roadmap

> North star: make joewisto.com immediately understandable, easy to explore, honest about what is finished, and strong enough that every public project demonstrates both technical judgment and thoughtful presentation.

- Last reviewed: July 19, 2026
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
| 07. Gravity Fleet analytics | DONE | Analytics, minimap, control hints, and planet-motion implementation are complete; physical validation is deferred to Pass 10. | Pass 06 |
| 08. Publishing-system case study | NEXT | Faithfully integrate the approved, fictional Postcard Atlas source into a project-scoped portfolio demo. | Fresh focused branch from current main |
| 09. Production deployment and contact | READY | Complete custom-domain and final production-route work; contact delivery remains deferred. | Pass 08 preview and domain access |
| 10. Cleanup and release QA | LATER | Complete final repository validation after the remaining front-end and release work. | Remaining front-end completion and production-route release |

The recommended execution order is:

1. Rebaseline documentation and roadmap.
2. Faithful Pass 08 integration.
3. Remaining front-end feature completion.
4. Mobile and bug pass.
5. Custom-domain and production-route release.
6. Final repository validation.
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
9. **Pass 08 has an approved source.** `multi-platform-publishing-system-staging/` on clean `main` is the already-anonymized, fictional implementation source for the publishing-system demo. Its preservation contract appears in Pass 08.

## Pass 01 - Project governance

Implemented and verified July 15, 2026. The registry contains four public/ready projects and four hidden/in-progress projects. Automated HTTP DOM verification confirms that every public consumer uses the same lifecycle filter and creation-date order. This pass is complete.

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
- A successful data commit triggers the normal Cloudflare deployment once Pass 09 is complete.

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

The remaining laptop/mobile frame-pacing measurements and planet-motion fairness playtesting are deliberately deferred to Pass 10. They have not yet passed and must not be represented as complete physical validation.

### 07.1 Increase live telemetry cadence safely

- [x] Move the current live telemetry interval from 350ms to a configurable target near 200ms.
- [x] Avoid rebuilding expensive DOM or charts when underlying values have not changed.
- [x] Keep gameplay animation on `requestAnimationFrame` and telemetry rendering on its own cadence.
- [ ] Defer dropped-frame measurement on a typical laptop and mobile-width emulation to Pass 10.

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
- [ ] Defer fairness playtesting of the faster planets, level objectives, and wormhole placement to Pass 10.

Acceptance criteria for Pass 07 implementation:

- Live widgets render close to real time without coupling telemetry work to gameplay animation.
- Selecting a past run updates the dashboard reliably.
- The heatmap can be related back to the actual map at a glance.
- Planet motion is more visible while ship behavior remains unchanged.

## Pass 08 - Faithful multi-platform publishing-system integration

`multi-platform-publishing-system-staging/` on clean `main` is the approved, already-anonymized, already-fictional source implementation for this pass. It preserves the approved fictional Postcard Atlas identity and is the authoritative source implementation for faithful integration, not a quarantine branch or a candidate for further anonymization.

All local fallback imagery and background-video assets currently committed under the approved publishing-system staging directory are owned by Joe Wisto and are approved for public redistribution within this portfolio repository. These approved assets are part of the intended public portfolio presentation and must not be replaced, removed, or substituted solely for licensing, anonymization, or placeholder purposes.

Start a fresh, focused integration branch from current `main`. Move the final demo into the project-scoped route below; do not expose the registry entry as ready/public until the integration and Cloudflare preview are approved. Privacy scans and route validation remain required verification, but they are not a reason to rewrite approved fictional content, replace approved media, or simplify the source implementation.

> [!IMPORTANT]
> **Implementation preservation contract**
>
> Future Pass 08 implementation is a **structural integration**, not a redesign or reimplementation.
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
> The objective of Pass 08 is to relocate and integrate the approved implementation into its final project structure while preserving its visual character, interaction model, and functionality.

Target public architecture:

- `/projects/multi-platform-publishing-system.html` - portfolio case study and project entry route.
- `/projects/multi-platform-publishing-system/` - self-contained live demo, with `index.html`, supporting pages, scripts, styles, fixtures, and media nested beneath this directory.
- Every demo page includes one clearly labeled `Return to Joe Wisto portfolio` navigation option without otherwise changing the approved site flow.

### 08.0 Preservation contract

Future Pass 08 work must preserve the approved implementation's:

- current fictional Postcard Atlas identity, copy, and fixtures;
- all approved local media and fallback imagery;
- complete background-video set, manifest entries, enablement, and behavior, including shuffle, crossfade, dwell, autoplay handling, visibility pause/resume, failure recovery, and reduced-motion fallback;
- local fictional CSV fixtures and their loading, normalization, filtering, empty, and fallback states;
- navigation, page structure, Home, About, Journal, Photos, Map, and Ask functionality;
- Journal deep links, sorting/filtering, multi-media rendering, and anchored entries;
- Photos search, location filtering, grouping, lightbox controls, hash targeting, and cross-page interactions;
- Map marker grouping, panels, thumbnails, and Journal/Photos cross-links;
- Ask UI, accessible validation, and clearly disabled delivery behavior. The initial public demo must state that no message is submitted or collected;
- responsive, keyboard, focus, loading, fallback, and reduced-motion behavior.

Do not perform additional fictionalization, anonymization, simplification, placeholder replacement, media reduction, or identity substitution unless Joe Wisto explicitly authorizes it. Do not rewrite already-fictional content, invent replacement identities or locations, replace approved media with placeholders, remove or disable the background-video system, or reduce the demo to a fixture-only redesign. The demo may continue using its approved local fictional fixtures while live Google Sheets, Forms, and Drive integrations remain deferred.

### 08.1 Establish the nested project structure

- [ ] Create `projects/multi-platform-publishing-system/` as the final self-contained demo directory.
- [ ] Preserve the approved page set as `index.html`, `about.html`, `journal.html`, `photos.html`, `map.html`, and `ask.html` unless an equivalent route is intentionally redirected.
- [ ] Keep `/projects/multi-platform-publishing-system.html` as the portfolio case study rather than overwriting it with the demo homepage.
- [ ] Migrate paths, dynamic URL construction, manifest URLs, and CSS asset URLs to project-scoped paths while preserving deep links, filtering, lightbox behavior, and cross-page interactions.
- [ ] Add the portfolio-return link to shared navigation, including the not-found experience, without replacing or confusing the demo's Home link.
- [ ] Scope any necessary root `_headers` work to `/projects/multi-platform-publishing-system/*`; do not change deployment behavior without a verified need.

Acceptance criteria:

- Direct loads and refreshes resolve project-scoped CSS, JavaScript, fixtures, media, and internal links.
- Demo Home remains inside the demo, while the portfolio-return link exits it intentionally.
- The demo and case-study routes remain distinct and understandable.

### 08.2 Integrate the approved source faithfully

- [ ] Copy the approved source implementation and media into the project-scoped route without content or identity substitution.
- [ ] Preserve the fallback image, every background-video file, and every manifest entry; verify all nested public URLs resolve.
- [ ] Preserve background-video behavior, failure recovery, page-visibility behavior, and reduced-motion fallback.
- [ ] Preserve local fictional CSV fixtures for Journal, Photos, Map, and homepage content; do not require live services for the initial portfolio demo.
- [ ] Keep Ask delivery disabled, with truthful copy that no message is submitted or collected, while retaining its approved validation and fallback UI.
- [ ] Preserve navigation, page functionality, loading/error states, accessibility behavior, deep links, filtering, lightbox, and cross-page interaction parity.
- [ ] Keep Leaflet and OpenStreetMap attribution where used and validate external-service behavior without introducing credentials.

Acceptance criteria:

- The final demo retains the approved Postcard Atlas experience and all preservation-contract behavior.
- Every page remains understandable and usable when a local fixture, image, or video fails.
- No future integration replaces approved content or media merely to alter the demo's fictional identity.

### 08.3 Build the portfolio case study and registry integration

- [x] Keep the existing project-registry entry `hidden` and `in-progress` during integration.
- [ ] Expand `/projects/multi-platform-publishing-system.html` into a complete case study.
- [ ] Explain the portfolio project, publishing workflow, static frontend, fixture-based demo, media handling, accessibility, privacy decisions, and deferred live integrations truthfully.
- [ ] Add a clear `Open live demo` action and a route back to all projects.
- [ ] Keep the case study and demo `noindex` while Pass 08 remains incomplete.
- [ ] Change the registry to `public` and `ready` only after faithful integration, responsive/behavior validation, and Cloudflare preview approval. Do not change `data/projects.json` before then.

### 08.4 Validate, integrate, and release

- [ ] Serve the repository root through HTTP and test the final nested route rather than serving the demo directory as a deployment root.
- [ ] Run syntax checks for changed project JavaScript and the video-manifest builder, parse the manifest, and verify all listed video and fallback URLs.
- [ ] Run project-registry validators if registry metadata changes.
- [ ] Validate desktop, tablet, mobile, keyboard, focus, reduced-motion, direct-load, refresh, Back/Forward, and case-study/demo round-trip behavior.
- [ ] Verify Home, About, Journal, Photos, Map, Ask, cross-page hashes, filtering, lightbox, loading, fallback, and disabled Ask delivery.
- [ ] Inspect the console and network panel for uncaught errors, failed local requests, missing assets, incorrect paths, and unexpected external dependencies.
- [ ] Run a final repository privacy scan and route/asset scan on the integration branch, preserving approved fictional content and media.
- [ ] Verify the project-scoped route, headers as applicable, caching, deep links, metadata, and fallbacks on a Cloudflare pull-request preview.
- [ ] Open a draft PR and do not merge until the integration and preview are approved.

Final acceptance criteria for Pass 08:

- The complete approved publishing site runs beneath `/projects/multi-platform-publishing-system/` with its visual character and behavior intact, plus a clear portfolio-return option.
- Approved media, fallback imagery, background videos, manifest, fixtures, and Ask-disabled behavior are all preserved.
- The registry remains hidden/in-progress until faithful integration and preview approval, then changes to `public` and `ready` only in the reviewed release.

## Pass 09 - Production deployment and custom-domain release

Cloudflare Pages is already connected to `Joey-VW/Portfolio`; `main` is the production branch, automatic deployments are enabled, pull-request previews are enabled, and the `pages.dev` deployment is working.

### 09.1 Complete remaining production release work

- [x] Connect `Joey-VW/Portfolio` to Cloudflare Pages.
- [x] Use `main` as the production branch.
- [x] Enable automatic deployments and pull-request previews.
- [ ] Attach `joewisto.com`, confirm HTTPS, choose a canonical hostname, and add the redirect from the other host.
- [ ] Verify final production routes, `_headers`, `_redirects`, caching, deep links, JSON fetches, metadata, favicon, and 404 behavior.

Acceptance criteria:

- The custom domain and canonical-host redirect work in production.
- Every public route loads directly and after refresh on the final production host.
- Final metadata and 404 behavior are verified without exposing credentials or internal tracking details.

### 09.2 Deferred backend and live-service work - LATER

- [ ] Add a portfolio contact endpoint with server-side validation, rate limiting, Turnstile verification, and verified delivery.
- [ ] Replace the email-draft fallback only after the contact endpoint passes an end-to-end test.
- [ ] Consider live Google Sheets content, Google Forms delivery, and Google Drive media integration for Postcard Atlas only after the fixture-based portfolio demo is approved.
- [ ] Perform credentialed Kroger and other operational automation verification only when explicitly authorized and safely configured.

## Pass 10 - Final repository validation and release QA

Comprehensive validation is consolidated here. It occurs after remaining front-end feature completion, the mobile and bug pass, and custom-domain/production-route release. Every production-bound PR must still meet the minimum smoke gate below.

### 10.1 Final validation matrix

- [ ] Audit root-level artifacts, stale routes, orphaned selectors/helpers, duplicate data, captures, and obsolete comments before any deletion; preserve sources needed by unfinished work.
- [ ] Review all affected public routes at 320, 375, 390, 430, 768, and 1024 CSS pixels, relevant landscape layouts, and 200 percent browser zoom.
- [ ] Verify keyboard navigation, visible focus, screen-reader labels, reduced motion, touch targets, loading/error/fallback states, and print/PDF behavior at US Letter size.
- [ ] Run complete applicable validators, Python and JavaScript syntax checks, and JSON parsing checks.
- [ ] Perform repository privacy, route, and asset scans; review external URLs and confirm no secrets, private data, generated captures, or unintended files are present.
- [ ] Verify final Cloudflare preview and production behavior, including canonical host, routes, refreshes, headers, redirects, metadata, favicon, and 404 response.
- [ ] Measure Gravity Fleet laptop/mobile frame pacing and playtest planet motion, level objectives, and wormhole fairness. These physical checks remain open until evidence is recorded.

### 10.2 Minimum production-bound PR smoke gate

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
- remaining front-end features, mobile/bug fixes, and production-route work are complete;
- final validation confirms coherent mobile, desktop, reduced-motion, keyboard, zoom, print, route, asset, privacy, and Cloudflare behavior; and
- deferred backend and operational work is either explicitly completed with evidence or remains honestly labeled as deferred.
