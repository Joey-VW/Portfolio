# Portfolio Roadmap

> North star: make joewisto.com immediately understandable, easy to explore, honest about what is finished, and strong enough that every public project demonstrates both technical judgment and thoughtful presentation.

- Last reviewed: July 18, 2026
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
| 03. Showcase launcher controls | IN PROGRESS | Launcher sizing, polar placement, and the full development lab are easier to tune. | Pass 01 for project order |
| 04. Shrinkflation reliability | DONE | The hero is tighter, product imagery is resilient, and the weekly Kroger update is automated. | Secrets for automation |
| 05. EV hero animation | DONE | The EV case study opens with a responsive, purposeful car-and-charger scene. | Preserve the animation prototype until complete |
| 06. Gravity Fleet game flow | DONE | Match flow, navigation, terminology, level-three fairness, and command states feel intentional. | None |
| 07. Gravity Fleet analytics | IN PROGRESS | Live and post-match analytics become more useful and spatially meaningful. | Pass 06 |
| 08. Publishing-system case study | IN PROGRESS | The existing blog system becomes an anonymized, self-contained portfolio project with behavior parity. | Clean staging copy, portfolio-owned Google resources, and privacy review |
| 09. Production deployment and contact | BLOCKED | The site deploys through Cloudflare and the contact form can submit safely. | Stable main branch and domain access |
| 10. Cleanup and release QA | BLOCKED | Dead files are removed, mobile and print are polished, and the release has no obvious regressions. | All major visual and content passes |

## Decisions already made

These choices remove ambiguity from later implementation work.

1. **The site stays build-light.** Continue with plain HTML, CSS, and JavaScript unless a specific feature clearly justifies a build step.
2. **This roadmap is the internal progress tracker.** Do not create a second large tracking system. `data/projects.json` should contain only the small amount of lifecycle metadata needed by the frontend.
3. **Unfinished projects are filtered explicitly.** Add `status`, `visibility`, and `createdAt` fields instead of relying on array position, `featured`, or missing links.
4. **Project order is newest first.** Both the projects page and Showcase launcher sort by the same `createdAt` field in descending order.
5. **The contact form should eventually submit.** Keep the current email-draft fallback until a Cloudflare endpoint is deployed and verified. Do not ship a submit button that silently fails.
6. **Gravity Fleet work is split into game-flow and analytics passes.** The combined request is too large for one safe, reviewable change.
7. **Global cleanup happens after prototype extraction.** In particular, keep the looping-animation prototype until the EV animation and any remaining reusable scenes have been integrated.

## Pass 01 - Project governance

Implemented July 15, 2026. The registry contains four public/ready projects and four hidden/in-progress projects. Automated HTTP DOM verification confirms that every public consumer uses the same lifecycle filter and creation-date order. Final visual review remains open on the draft pull request before this pass moves to `DONE`.

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

## Pass 07 - Gravity Fleet analytics and tuning

Subsections 07.1 and 07.2 were implemented July 18, 2026. The live telemetry renderer now uses a configurable 200ms timer outside the gameplay animation loop and skips unchanged chart/DOM work. Run summaries now derive seven evidence-based observations and a level-specific replay suggestion from recorded telemetry. JavaScript syntax and deterministic summary regressions pass; physical laptop and mobile-width frame-pacing measurement remains open because a browser executable was unavailable in the implementation environment.

Pass 07.5 received a focused implementation pass on July 18, 2026: main control-hint mouse icons grew from 1.05 by 1.35rem to 1.3 by 1.7rem while the compact supporting text was preserved, and `PLANET_MOTION_MULTIPLIER` is 1.2 in addition to each level's existing `orbitSpeedMultiplier`. Ship movement constants were not changed. Browser-based desktop/mobile layout inspection and all-level fairness testing remain open in this environment because no Chromium, Firefox, or Playwright executable is available; the 200ms telemetry interval therefore also remains provisional pending frame-pacing evidence.

### 07.1 Increase live telemetry cadence safely

- [x] Move the current live telemetry interval from 350ms to a configurable target near 200ms.
- [x] Avoid rebuilding expensive DOM or charts when underlying values have not changed.
- [x] Keep gameplay animation on `requestAnimationFrame` and telemetry rendering on its own cadence.
- [ ] Measure for dropped frames on a typical laptop and a mobile-width emulation before settling on the final value.

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

Subsections 07.3 and 07.4 were implemented July 18, 2026. Recent local runs are selectable, clearable with confirmation, and rendered with the same level/outcome/score/duration/timestamp fields as explicitly labeled mock benchmarks. The dashboard now reports rank and percentile context. New runs store separate normalized 24-by-15 movement and combat layers plus a level map snapshot; the dashboard renders them as an accessible mode-switchable minimap with orbit and planet landmarks. Legacy 12-by-8 local heat arrays remain readable as movement-only data.

### 07.5 Improve control hints and planet motion

- [ ] Increase the mouse icons in the control hints while keeping the accompanying text compact.
- [x] Increase base planet-orbit speed by approximately 15 to 25 percent through a dedicated planet-motion multiplier.
- [x] Do not change ship orbit, travel, formation, or combat speeds as part of this item.
- [ ] Verify that faster planets do not make level objectives or wormhole placement unfair.

Acceptance criteria for Pass 07:

- Live widgets feel close to real time without visible gameplay stutter.
- Selecting a past run updates the dashboard reliably.
- The heatmap can be related back to the actual map at a glance.
- Planet motion is more visible while ship behavior remains unchanged.

## Pass 08 - Anonymized multi-platform publishing system

Pass 08 began July 18, 2026 on `publishing-system quarantine branch`. The branch contains a working source copy, the original local background-video set and manifest, a replacement-resource inventory, and links to duplicated Google Drive resources. It remains a private working quarantine branch while client-specific content and identifiers are present. Do not merge this staging branch into `main`.

Target public architecture:

- `/projects/multi-platform-publishing-system.html` - portfolio case study and project entry route.
- `/projects/multi-platform-publishing-system/demo/` - self-contained noindex demo, with `index.html`, supporting pages, scripts, styles, and media nested beneath this directory.
- Every demo page includes one clearly labeled `Return to Joe Wisto portfolio` navigation option without otherwise changing the original site flow.
- The demo preserves the original homepage, About, Journal, Photos, Map, Ask, background-video, loading, filtering, lightbox, and reduced-motion behaviors using fictional content and approved local fixtures for this review build.

### 08.0 Preserve a safe staging boundary

- [x] Create `quarantine staging directory/` on the dedicated `publishing-system quarantine branch` branch.
- [x] Copy the reusable HTML, CSS, JavaScript, tools, fallback background, background videos, and generated video manifest into the staging directory.
- [x] Add a Drive-resource inventory identifying a portfolio-owned Google Form, Google Sheet, and two replacement media files.
- [x] Verify the staging directory contains no nested `.git` directory, remote configuration, `.env` file, credentials, cookies, API keys, private deployment configuration, local editor state, or unrelated source history.
- [ ] Treat `google_drive_repo_pack.txt`, `ASSET_URL_REPLACEMENTS.txt`, and `PASS_08_DUPLICATION_TRACKER.md` as temporary working artifacts, not public project files.
- [ ] Keep the staging project `hidden` and `in-progress`; do not expose or deploy its direct route while original names, content, domains, coordinates, Google IDs, or client assets remain.
- [ ] Before final integration, create a fresh implementation branch from the then-current `main` and copy only the sanitized allowlisted project files onto it. Do not merge the staging branch or preserve its unsanitized commits in the public project history.
- [ ] Delete the remote staging branch only after the sanitized integration branch is complete, reviewed, and independently recoverable.

Acceptance criteria:

- The staging branch is clearly treated as quarantined working material rather than a release candidate.
- The final integration diff contains only sanitized project files and intentional shared portfolio changes.
- No nested repository, local secret, source archive, repo pack, resource inventory, or temporary tracker reaches `main`.

### 08.1 Inventory, ownership, and cleanup decisions

- [ ] Build one keep, replace, move, or remove inventory for every staging file before reorganizing it.
- [ ] Record the byte size, duration, dimensions, format, and source or ownership status of the fallback image and all 17 background videos.
- [ ] Confirm that every retained local image and video is original, licensed for public portfolio redistribution, or replaced with an approved equivalent.
- [ ] Confirm Leaflet 1.9.4 licensing and preserve required attribution.
- [ ] Preserve visible OpenStreetMap attribution and verify that demo traffic remains appropriate for the public tile service.
- [ ] Replace the client-specific family hero/share image and the four omitted farewell-event images with coherent fictional alternatives.
- [ ] Decide whether all 17 background clips materially improve the demo. Retain exact behavior while removing only clips that are redundant, oversized, unlicensed, broken, or visually inconsistent.
- [ ] Optimize retained videos for web delivery without changing the shuffle, transition, dwell, fallback, autoplay, visibility-pause, failure-recovery, or reduced-motion behavior.
- [ ] Regenerate `assets/video-bg/manifest.json` after final filenames and paths are settled.
- [ ] Consolidate useful setup and maintenance instructions into the final project README; remove duplicate trackers and generated inventories after their actionable information is transferred.

Acceptance criteria:

- Every retained binary asset has a documented public-use basis.
- The final media set has no missing manifest entry, orphaned file, broken poster, or unexplained duplicate.
- Temporary audit material and source archives are absent from the public project directory.

### 08.2 Establish the nested project structure

- [ ] Create `projects/multi-platform-publishing-system/` as the final self-contained demo directory.
- [ ] Preserve the current page set as `index.html`, `about.html`, `journal.html`, `photos.html`, `map.html`, and `ask.html` unless a page is intentionally redirected and the behavior remains equivalent.
- [ ] Keep the existing `/projects/multi-platform-publishing-system.html` route as the portfolio case study rather than overwriting it with the demo homepage.
- [ ] Replace root-owned paths such as `/assets/...`, `/journal.html`, `/photos.html`, `/map.html`, and `/ask.html` with project-scoped paths that work from the nested directory.
- [ ] Centralize dynamic URL construction around one validated project base path instead of scattering hard-coded `/projects/multi-platform-publishing-system/` strings through JavaScript.
- [ ] Update `assets/js/config.js`, all page navigation, dynamic journal/photo/map links, manifest URLs, poster URLs, the video-manifest builder, and any CSS asset URLs to use the nested path consistently.
- [ ] Preserve hash links between Journal, Photos, and Map pages after the path migration.
- [ ] Add `Return to Joe Wisto portfolio` to the shared site navigation on every demo page, including the not-found experience, without replacing or confusing the demo's Home link.
- [ ] Ensure the portfolio-return link points to the canonical portfolio homepage and remains keyboard accessible at desktop and mobile widths.
- [ ] Remove or repurpose nested deployment-root files that cannot function from a subdirectory:
  - Move required cache or security rules from the nested `_headers` file into the portfolio root `_headers`, scoped only to `/projects/multi-platform-publishing-system/*`.
  - Remove the nested `.nojekyll` unless a verified deployment behavior still requires it.
  - Remove the nested `robots.txt` and `sitemap.xml`; represent public demo routes in the portfolio's root metadata only if indexing is intentional.
  - Integrate any desired nested 404 behavior with the portfolio's root routing strategy rather than assuming a project-level `404.html` is automatically selected.
- [ ] Verify that the project does not collide with the portfolio's root `/assets/`, root JavaScript, styles, headers, redirects, service paths, or other project routes.

Acceptance criteria:

- Loading any demo page directly or refreshing it resolves the correct project-scoped CSS, JavaScript, media, and internal links.
- No request from the demo accidentally resolves to the portfolio's root `/assets/` directory or root page routes.
- Demo Home stays inside the demo; `Return to Joe Wisto portfolio` exits it intentionally.
- The live demo and case-study routes remain distinct and understandable.

### 08.3 Choose and apply one fictional publication identity

- [ ] Choose one fictional publication name, owner identity, purpose, visual story, and geographic theme before rewriting individual pages.
- [ ] Define a small editorial fixture with at least three journal entries, six to nine photos, two or more locations, one multi-media entry, and one hidden or draft row.
- [ ] Use public landmarks or generalized fictional coordinates; do not reproduce private homes, workplaces, travel logistics, or client-specific map positions.
- [ ] Replace the original farewell story with a fictional sample story that still exercises static-content fallback, multiple media, map grouping, captions, tags, alt text, anchors, and search.
- [ ] Keep the replacement content internally consistent across the homepage, About, Journal, Photos, Map, Ask, metadata, structured data, fallback content, and Google resources.
- [ ] Preserve the existing visual design and interaction model unless a client-specific name is embedded in a selector, variable, ID, or label that must be generalized.
- [ ] Avoid making the fictional publication look like a real person, medical practice, or active organization that visitors could mistake for the original client.

Acceptance criteria:

- The demo feels like one believable fictional publication rather than disconnected placeholder text.
- Every original behavior has representative content to exercise it.
- No fictional copy implies a real business, patient relationship, professional endorsement, or live travel schedule.

### 08.4 Complete the portfolio-owned Google resources

External work required for behavior parity:

- [ ] Inspect the duplicated `Portfolio | Blog Site Content Manager` spreadsheet and preserve the field names and tab structures consumed by `normalizePhoto()` and `normalizeJournalPost()`.
- [ ] Remove original responses, client content, submitter emails, revision-sensitive material, original Drive file IDs, and client-specific locations from the duplicate spreadsheet.
- [ ] Populate the duplicate `Map Photos` and `Blog Posts` tabs with the fictional editorial fixture.
- [ ] Replace all Sheet-linked media values with the two duplicated Drive assets or additional portfolio-owned replacements.
- [ ] Publish the duplicate `Map Photos` and `Blog Posts` tabs as public CSV endpoints and record their new publication URLs and `gid` values.
- [ ] Verify both CSV URLs load without authentication and return the expected headers before connecting the demo.
- [ ] Inspect the duplicated `Portfolio | Blog Poster` Google Form and decide whether the public demo will accept sample submissions.
- [ ] To preserve the original Ask behavior, configure the duplicate Form with name, email, and message fields; record the new `formResponse`, `viewform`, optional prefill URL, and three entry IDs.
- [ ] Ensure Form responses write only to a portfolio-owned destination and never to the original client workbook or account workflow.
- [ ] Add clear demo-language and data-minimization copy before accepting public submissions; define how test responses will be reviewed and deleted.
- [ ] If the Form is intentionally disabled, document that as a behavior-parity exception and provide an honest non-submitting demo state. Do not leave the original endpoint or a silently failing submit action.
- [ ] Test duplicated Drive image permissions in a signed-out or private browser, including thumbnail and full-size URLs.
- [ ] Update `assets/js/config.js` only after the duplicate CSV, Form, and Drive endpoints pass independent tests.

Decision: the duplicate spreadsheet is required for live Journal, Photos, Map, and homepage content parity. The duplicate Google Form is required for exact Ask-page submission parity; it may be omitted only if the Ask workflow is explicitly changed to a non-submitting demonstration.

Acceptance criteria:

- The homepage, Journal, Photos, and Map load only from the portfolio-owned fictional Sheet data.
- The Ask page either submits successfully to the portfolio-owned duplicate Form or clearly states that submission is disabled.
- No request is sent to an original client Sheet, Form, Drive file, folder, Apps Script deployment, domain, or analytics property.

### 08.5 Complete repository-wide anonymization

- [ ] Replace all personal names, family references, biographies, professions, patient language, business names, addresses, telephone numbers, emails, social links, professional-profile links, and organization-specific wording.
- [ ] Replace `the original production domain` in canonical links, Open Graph tags, Twitter metadata, JSON-LD, breadcrumbs, robots/sitemap references, README content, comments, and error messages.
- [ ] Replace Denmark, Copenhagen, Chandler, Arizona, the farewell-event location, Google Maps URLs, precise coordinates, map defaults, tags, slugs, anchors, and searchable text.
- [ ] Replace client-specific filenames, image alt text, captions, static-content identifiers, DOM IDs, CSS custom properties, CSS class names, JavaScript variable names, and comments where they encode the original identity.
- [ ] Remove the original Google Sheet publication ID, original tab `gid` values, original Form ID and entry IDs, original Drive folder ID, and every original linked Drive file ID.
- [ ] Remove unused Google prefill URLs, Apps Script deployment URLs, analytics IDs, Cloudflare identifiers, local filesystem paths, and copied deployment settings.
- [ ] Replace client-specific screenshots, generated output, ZIP archives, resource packs, fixtures, and metadata rather than relying on their filenames being unlinked.
- [ ] Run targeted literal searches for all known names, domains, locations, addresses, coordinates, IDs, filenames, and title fragments.
- [ ] Run broader pattern searches for email addresses, phone numbers, Google resource URLs and IDs, API-key-like strings, localhost paths, Windows paths, and external domains.
- [ ] Manually review every remaining external URL and classify it as portfolio-owned, required third-party infrastructure, removed, or intentionally retained with attribution.

Acceptance criteria:

- Repository searches find no original client name, family or staff name, practice name, biography, address, telephone number, email, domain, location, coordinates, Google identifier, profile link, media filename, or story fragment.
- Public metadata, structured data, alt text, search text, comments, and generated files pass the same anonymization standard as visible page copy.
- The demo has no dependency on the original client's accounts or deployed site.

### 08.6 Preserve original behavior with portfolio-owned content

- [ ] Establish a behavior-parity checklist from the original site before changing implementation details.
- [ ] Preserve background-video manifest loading, shuffle order, crossfade timing, dwell timing, fallback image, autoplay handling, page-visibility pause/resume, failure recovery, and reduced-motion fallback.
- [ ] Preserve CSV loading, cache busting, normalization, visibility filtering, loading skeletons, fallback states, and error handling.
- [ ] Preserve homepage recent-journal and featured-photo rendering with working deep links.
- [ ] Preserve Journal sorting, filtering/search behavior, multi-media rendering, and anchored entries.
- [ ] Preserve Photos search, location filtering, grouping, lightbox controls, original-media links, hash targeting, and keyboard close behavior.
- [ ] Preserve Map marker grouping, photo thumbnails, selected-location panels, Journal/Photos cross-links, map attribution, and responsive behavior.
- [ ] Preserve Ask validation, accessible error messages, submit state, fallback path, and duplicate-form integration if submission remains enabled.
- [ ] Preserve current navigation, focus states, skip links, live regions, keyboard interaction, responsive layouts, and touch targets while adding the portfolio-return option.
- [ ] Preserve the visual composition, background treatment, typography, glass panels, color system, transitions, and loading presentation except where anonymization requires neutral renaming.
- [ ] Document any unavoidable parity exception with its reason and user-visible impact before marking this subsection complete.

Acceptance criteria:

- Side-by-side review finds no unintended behavioral or visual regression from the original site.
- Every page remains usable when a CSV request, image, video, or Form request fails.
- Reduced-motion visitors receive the intended fallback image and no essential information depends on motion.

### 08.7 Build the portfolio case study and registry integration

- [x] Keep the existing project-registry entry `hidden` and `in-progress` during integration.
- [ ] Expand `/projects/multi-platform-publishing-system.html` from its placeholder into a complete case study.
- [ ] Use the public title `Multi-Platform Publishing System` unless a stronger anonymized title is approved.
- [ ] Explain the client problem in anonymized terms, the system architecture, nontechnical publishing workflow, Google Forms/Sheets/Drive connections, static frontend, Cloudflare delivery, data normalization, media handling, accessibility, privacy decisions, and tradeoffs.
- [ ] Add a clear `Open live demo` action to the nested demo and retain a route back to all projects.
- [ ] Include an architecture visual only if it materially improves understanding of the Forms/Sheets/Drive-to-static-site workflow.
- [ ] Distinguish the production pattern from the fictional demo so visitors understand that the public data is representative rather than client content.
- [ ] Update the project registry summary, value statement, stack, Showcase metadata, and route only after the final architecture and title are stable.
- [ ] Keep the case study and demo `noindex` while Pass 08 remains incomplete.
- [ ] Change the registry to `public` and `ready` only after the final privacy, responsive, behavior-parity, content, and deployment-preview gates pass.

Acceptance criteria:

- A visitor can understand what was built, why it mattered, how a nontechnical publisher uses it, and what technical judgment the work demonstrates.
- The case study links to the demo, the demo returns to the portfolio, and neither route is mistaken for the original client website.
- Unfinished or unsanitized material never appears in project cards or the Showcase launcher.


Implementation update - July 19, 2026: the sanitized Postcard Atlas demo now lives at `/projects/multi-platform-publishing-system/demo/` rather than the originally proposed parent route. It retains only an original SVG fallback illustration documented in its README; the 17 undocumented staging videos and the undocumented staging JPEG were not released. The demo uses local CSV fixtures, disables message delivery, preserves Leaflet/OpenStreetMap attribution, declares `noindex, nofollow`, and has project-scoped headers. Local route, syntax, JSON, link, and privacy scans passed. Cloudflare Pages preview and browser capture tooling were unavailable in this environment, so those external visual/deployment checks remain follow-up verification rather than being marked complete.

### 08.8 Validate, integrate, and release

- [ ] Serve the repository root through HTTP and test the final nested route rather than serving the demo directory as if it were a deployment root.
- [ ] Run `node --check` on every changed project JavaScript file and the video-manifest builder.
- [ ] Validate `assets/video-bg/manifest.json` as JSON and verify that every listed file and poster exists at its nested public URL.
- [ ] Run the project-registry validators after registry metadata changes.
- [ ] Review the demo and case study at representative desktop, tablet, and mobile widths, including 320, 375, 390, 430, 768, and 1024 CSS pixels where relevant.
- [ ] Verify keyboard navigation, visible focus, skip links, live regions, lightbox focus/close behavior, form errors, 200 percent zoom, reduced motion, and touch targets.
- [ ] Test Home, About, Journal, Photos, Map, Ask, all cross-page hashes, direct page loads, refreshes, browser Back/Forward, the portfolio-return link, and the case-study/demo round trip.
- [ ] Test signed-out access to the two published CSVs, replacement Drive media, and duplicate Google Form.
- [ ] Inspect the browser console and network panel for uncaught errors, mixed content, CORS failures, original-domain requests, missing assets, incorrect MIME types, and unexpected root-path requests.
- [ ] Verify project-scoped `_headers` behavior, content-security requirements, caching, Leaflet/OSM access, deep links, metadata, and fallback behavior on a Cloudflare preview deployment.
- [ ] Run `git diff --check`, inspect `git status --short`, and confirm only intended sanitized files are included.
- [ ] Perform a final repository-wide privacy search on the clean integration branch, independent of the staging branch review.
- [ ] Update this roadmap and the project README with only verified completion state and any approved parity exceptions.
- [ ] Open or update a draft PR from the clean integration branch; do not merge until required external resources and preview checks pass.

Final acceptance criteria for Pass 08:

- The complete publishing site runs beneath `/projects/multi-platform-publishing-system/` with its original behavior and visual character intact, plus a clear portfolio-return option.
- The demo uses only fictional sample content, portfolio-owned Google resources, approved local media, and required attributed third-party services.
- No client-specific name, content, asset, location, identifier, account dependency, deployment setting, or unsanitized history reaches `main`.
- Background videos, fallback media, homepage content, Journal, Photos, Map, Ask, cross-links, loading states, error states, keyboard behavior, reduced motion, and responsive layouts work on the Cloudflare preview.
- The case study accurately explains the system and links cleanly to the demo.
- The registry remains hidden until every privacy, parity, content, responsive, and preview gate passes, then moves to `public` and `ready` in the same reviewed release.

## Pass 09 - Production deployment and contact delivery

### 09.1 Deploy through Cloudflare Pages

- [ ] Connect `Joey-VW/Portfolio` to Cloudflare Pages through the GitHub integration.
- [ ] Use `main` as the production branch and enable pull-request preview deployments.
- [ ] Keep the repository root as the site root, with no framework preset and no unnecessary build command.
- [ ] Attach `joewisto.com`, confirm HTTPS, and choose one canonical hostname with a redirect from the other.
- [ ] Verify `_headers`, `_redirects`, caching, deep links, JSON fetches, OG metadata, favicon, and 404 behavior in production.
- [ ] Enable lightweight web analytics only if it does not add a consent or privacy burden that outweighs its value.

Acceptance criteria:

- A merge to `main` deploys automatically.
- Pull requests receive safe preview URLs for visual review.
- Every public route loads directly and after refresh.
- No credentials or internal tracking details are present in the deployed output.

Reference: Cloudflare Pages' GitHub integration supports branch deployments, pull-request previews, and deployment checks: <https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/>.

### 09.2 Add real contact submission after deployment

- [ ] Add a Pages Function or Worker endpoint for `POST /api/contact`.
- [ ] Validate and length-limit name, email, message, and an optional `reason` field such as `Role`, `Project`, or `Something else`.
- [ ] Add a honeypot, basic rate limiting, and Cloudflare Turnstile with mandatory server-side token verification.
- [ ] Send the message to Joe through a verified Cloudflare email binding, with the visitor's address set as `replyTo` rather than as the sender.
- [ ] Return clear inline success and failure states and retain a direct `mailto:` fallback.
- [ ] Do not log full message bodies or email addresses longer than needed for error diagnosis.
- [ ] Test with Cloudflare's Turnstile test keys before production keys are enabled.

Decision: add a true `Send message` button only when the endpoint and delivery path pass an end-to-end test. Until then, keep `Open email draft` so the interface remains truthful.

References:

- Pages Functions can handle form submissions without a dedicated server: <https://developers.cloudflare.com/pages/functions/>.
- Cloudflare Workers can send through a configured email binding: <https://developers.cloudflare.com/email-service/api/send-emails/workers-api/>.
- Turnstile requires server-side Siteverify validation: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>.

## Pass 10 - Cleanup and release QA

### 10.1 Audit the repository before deleting files

- [ ] Build a keep/move/delete inventory for every root-level development artifact and placeholder.
- [ ] Review these likely candidates first:
  - `3-looping-animations(1).html` - keep until reusable scenes are extracted, then move to a clearly named prototype/archive location or delete.
  - `ev-true-cost-foundation-spec.md` - keep if it remains the active design/data contract; otherwise archive under project docs.
  - `ev-true-cost-seed-data.json` - compare with `data/ev-true-cost.json` and remove only if it is a superseded duplicate.
  - Empty `.gitkeep` files - remove when their directories contain real assets, or remove the empty directory if it has no near-term purpose.
  - Old commented configuration values in `script.js` - remove once the Dev Lab can reproduce and export the chosen defaults.
- [ ] Check for orphaned CSS selectors, unused JavaScript helpers, stale routes, duplicate data, temporary captures, and obsolete comments.
- [ ] Update `README.md`, `tools/README.md`, and the repository map after changes.

Acceptance criteria:

- Every deletion is backed by a reference search and a local smoke test.
- No source asset needed by an unfinished roadmap item is removed early.
- Root-level files are intentional and easy for a new contributor to understand.

### 10.2 Complete a full mobile pass

- [ ] Test at 320, 375, 390, 430, 768, and 1024 CSS pixels, in portrait and relevant landscape layouts.
- [ ] Review the homepage, projects page, Showcase launcher, Shrinkflation Tracker, EV case study, Gravity Fleet Lab, Colony Ops Lab, and the publishing-system case study.
- [ ] Fix horizontal overflow, clipped headings, sticky-nav collisions, undersized tap targets, cramped forms, chart overflow, modal sizing, and canvas/control usability.
- [ ] Verify keyboard focus, screen-reader labels, reduced motion, and 200 percent browser zoom.
- [ ] Use `tools/capture_page.py` for repeatable desktop/mobile captures and compare important before/after states.

Acceptance criteria:

- No public route has unintended horizontal scrolling at 320px.
- Primary controls meet a comfortable touch target and remain visible.
- Sticky elements do not cover anchor destinations or each other.
- Interactive projects provide a usable mobile fallback where full gameplay is impractical.

### 10.3 Recheck the print/PDF rÃ©sumÃ©

- [ ] Run this only after the landing-page content and layout passes are complete.
- [ ] Review Chrome print preview at US Letter size with backgrounds both enabled and disabled.
- [ ] Confirm the welcome guide, Showcase, project cards, interactive controls, and decorative visuals do not leak into the rÃ©sumÃ© unless intentionally designed for print.
- [ ] Fix clipped headings, awkward page breaks, orphaned timeline items, crowded contact details, and stray blank pages.
- [ ] Confirm URLs and contact information remain readable in a saved PDF.

Acceptance criteria:

- The PDF reads as a polished rÃ©sumÃ© rather than a printed website.
- There are no clipped elements, accidental overlays, or empty pages.
- The screen experience is not compromised to satisfy print layout.

### 10.4 Final release gate

- [ ] Serve locally from the repository root with `python -m http.server 8000` and click through every public route.
- [ ] Run `python tools/validate_ev_true_cost.py`.
- [ ] Run `python tools/fetch_kroger_products.py --test-merge-fixture`.
- [ ] Confirm all JSON fetches succeed and the browser console has no uncaught errors.
- [ ] Verify Cloudflare preview and production URLs after the final merge.
- [ ] Check links, metadata, favicon, redirects, 404 behavior, forms, modals, and keyboard navigation.
- [ ] Update this roadmap, the README roadmap section, and project statuses to reflect what actually shipped.

## Deferred ideas and guardrails

- Do not add a framework solely to organize this roadmap. Reconsider templating only when duplicated page structure becomes a material maintenance problem.
- Do not publish private client material to make the publishing-system case study feel more realistic. Fictional sample content is enough.
- Do not treat unlisted static pages as private or secure.
- Do not cache or redistribute third-party product imagery until the relevant terms allow it.
- Do not increase Gravity Fleet telemetry frequency at the expense of input responsiveness.
- Do not use decorative brand colors or motion if they make the rÃ©sumÃ© harder to scan.

## Completion definition

The portfolio reaches the current north star when:

- visitors immediately understand what the site is and how to explore it;
- every public project is intentionally marked ready and appears in correct date order;
- mobile, desktop, reduced-motion, keyboard, and print experiences are coherent;
- core case studies have reliable data, purposeful visuals, and clear next actions;
- deployment and recurring data updates are automated without exposing secrets;
- recruiters and potential clients can contact Joe through a trustworthy path; and
- the repository is clean enough that the next improvement starts from an understandable baseline.

