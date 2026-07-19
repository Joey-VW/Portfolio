# Mobile QA report - Portfolio `main`

**Audit date:** July 19, 2026  
**Repository reviewed:** `Joey-VW/Portfolio`, default branch `main`  
**Merged state reviewed:** roadmap rebaseline PR #2 and faithful Postcard Atlas integration PR #3  
**Target deployment:** `https://portfolio-deo.pages.dev/`

## Scope and method

Reviewed 14 routes at **360×800, 375×812, 390×844, and 430×932**:

- Portfolio home and Projects listing
- Shrinkflation Tracker
- The Real Cost of Public Charging
- Gravity Fleet Lab
- Colony Ops Lab
- Multi-Platform Publishing System case study
- Postcard Atlas Home, About, Journal, Photos, Map, Ask, and 404

The audit used Chromium/Playwright against a local reconstruction of the exact merged HTML, CSS, and JavaScript from the current repository pack. Current GitHub registry data was reconciled from `main`. Large approved media files were represented by local placeholders. External network services were blocked.

**Deployment limitation:** this execution environment could not resolve the `pages.dev` hostname, and the web fetcher returned a cache miss. Therefore Cloudflare-only behavior - response headers, actual video files, Leaflet/OpenStreetMap, remote images, and production console/network traffic - remains a separate verification gate.

## Headline result

- **No document-level horizontal overflow** was detected on any of the 14 routes at any of the four tested mobile widths.
- Main cards, headings, forms, game panels, and project grids remained within the viewport.
- Journal search/expansion, Photos search/lightbox, Ask validation/disabled delivery, and EV preset selection worked in the source-local browser run.
- The strongest confirmed defect is a **broken Postcard Atlas fallback-image URL**, which produces a 404 and undermines reduced-motion/failure fallback behavior.

## Findings

### High - Postcard Atlas fallback image resolves to the wrong path

**Evidence**

The browser requested:

`/projects/multi-platform-publishing-system/demo/assets/css/assets/background_image_clean.jpg`

and received 404. The expected file is:

`/projects/multi-platform-publishing-system/demo/assets/background_image_clean.jpg`

The configured value is relative (`./assets/background_image_clean.jpg`) and is inserted into a CSS custom property. When consumed by the stylesheet, the URL resolves relative to `assets/css/styles.css`, producing the duplicated `assets/css/assets/` path.

**Source locations**

- `projects/multi-platform-publishing-system/demo/assets/js/config.js:39`
- `projects/multi-platform-publishing-system/demo/assets/js/background-video.js:44-48`
- `projects/multi-platform-publishing-system/demo/assets/css/styles.css:70-75`

**Recommended correction**

Normalize the fallback URL before setting the custom property, for example with `new URL(config.fallbackImageUrl, document.baseURI).href`, then set the absolute URL. Retest normal loading, video failure, empty manifest, page visibility changes, and `prefers-reduced-motion: reduce`.

**Acceptance checks**

- No 404 for the fallback image on every demo page.
- Reduced-motion mode displays the approved fallback image.
- A forced video failure displays the same fallback image.
- Direct loads of nested pages resolve the same asset URL.

---

### Medium - Postcard Atlas mobile navigation is dense and below the touch-target goal

At 360-430px, the primary navigation wraps across two rows, with the portfolio-return link on another row. It is visually usable and does not overflow, but it consumes substantial vertical space and measured link heights are approximately **36.6px**; the return link is about **38.6px**. The brand link is approximately **42px** high.

**Source locations**

- `projects/multi-platform-publishing-system/demo/assets/css/styles.css:262-287`
- Mobile override: `projects/multi-platform-publishing-system/demo/assets/css/styles.css:1411-1427`
- Shared header markup in all demo HTML pages

**Recommended correction**

Keep the visual identity while making each link at least 44px high. Prefer either:

1. a compact mobile disclosure/menu with the portfolio-return action separated as a utility action, or
2. a single-row horizontally scrollable primary nav with a clearly separate return link.

Avoid simply adding more padding without reconsidering the three-row header height at 360px.

---

### Medium - Shared portfolio text links have undersized touch areas

The full-width `Read case study` links measure about **25.6px** high, and footer links measure about **23.5px** high. They are readable, but their hit areas are smaller than the repository's approximate 44px touch-target goal.

**Source locations**

- Project card link: `styles.css:956-960`
- Project-card markup: `script.js:108-115`
- Footer links: `styles.css:1089-1098`

**Recommended correction**

Give project CTAs an inline-flex/button-like hit area with `min-height: 44px`, or make the full card an accessible link while preserving an explicit CTA. Increase footer link padding without making the footer visually heavy.

---

### Medium - Gravity Fleet heatmap toggles are only 32px high

The real Movement/Combat heatmap controls measure about **32px** high on mobile.

**Source location**

- `games/gravity-fleet-lab.css:120-122`

**Recommended correction**

Use `min-height: 44px` on coarse-pointer/mobile layouts and preserve the compact desktop version. Confirm the controls remain on one row at 320-390px or wrap cleanly.

---

### Medium - Debug/dev lab can become a persistent production obstruction

The local browser intentionally exposed the Showcase and Gravity Fleet dev toggles because localhost enables debug mode. On mobile they visibly overlap page content, footer controls, and the Gravity Fleet back-to-game area.

A fresh Cloudflare visitor should not see them, but both implementations also treat a previously saved `localStorage` flag as enough to make debug controls available on any host. A visitor who opens a debug query once can retain the fixed control on later production visits.

**Source locations**

- Showcase availability: `script.js:310-323`
- Gravity Fleet availability: `games/gravity-fleet-lab.js:623-629`
- Fixed mobile panel: `styles.css:1745+` and the coarse-pointer override around `styles.css:2364`

**Recommended correction**

On non-local hosts, require the explicit query parameter for each session instead of allowing `localStorage` alone to make the lab available. Alternatively, scope persisted debug state to local hosts. Also add safe-area-aware collision handling if production debug access is intentionally retained.

**Deployment verification**

Open the production URL in a clean profile with no query parameters and confirm neither dev toggle exists in the DOM.

---

### Low - Several controls narrowly miss 44px

- EV section-navigation links measured about **43.2px** high.
- EV and Shrinkflation back-to-top buttons measured about **43.8px**.
- The shared brand link measured about **43.2px**.

These are close enough to remain usable, but the final accessibility pass should round them up to 44px.

**Likely sources**

- `projects/ev-true-cost.css` section navigation and `.back-to-top-arrow`
- `projects/shrinkflation-tracker.css` back-to-top control
- `styles.css` shared brand/header rules

---

### Cosmetic - Large mobile hero titles dominate the first viewport

The EV and publishing-system headings wrap to four lines at 360px. They do not clip or overflow, but they leave less project context above the fold than the other pages.

**Recommended correction**

Treat this as optional polish: slightly reduce the smallest-screen heading clamp or tighten line height below 375px. Preserve the strong visual hierarchy.

## Interaction results at 390×844

| Interaction | Result |
| --- | --- |
| Journal search | `2 journal entries shown` → `1 matching journal entry shown` |
| Journal expansion | First entry changed to `Collapse`; expanded copy remained readable |
| Photos search | `3 photos across 2 locations` → `2 matching photos shown` |
| Photos lightbox | Opened with `aria-hidden="false"`; close restored `aria-hidden="true"` |
| Ask empty submit | Name, email, and message errors displayed |
| Ask completed submit | Correctly reported: `Submissions are paused in this portfolio demo. No message was submitted or collected.` |
| EV preset | Three presets found; `Next: mostly home` set `aria-pressed="true"` |

## Deployment-only checks still required

1. Load all routes directly on `portfolio-deo.pages.dev`, refresh, and use Back/Forward.
2. Confirm no uncaught console errors or failed local requests after the fallback URL fix.
3. Verify real background videos, video transitions, visibility pause/resume, failure recovery, and reduced-motion fallback.
4. Verify Leaflet/OpenStreetMap map loading, attribution, marker selection, panel updates, and deep links.
5. Verify the real photo assets and lightbox at 360, 390, and landscape widths.
6. Confirm `_headers`, `_redirects`, noindex behavior for the demo, metadata, favicon, and 404 responses.
7. Repeat the final gate at 320, 768, and 1024 CSS pixels, relevant landscape layouts, and 200% browser zoom.

## Suggested action order

1. **Fix the Postcard Atlas fallback-image URL and add focused regression checks.**
2. **Improve Postcard Atlas mobile navigation and touch targets.**
3. **Raise shared portfolio/project/footer and Gravity Fleet touch targets.**
4. **Harden production debug-lab availability.**
5. **Run a Cloudflare deployment QA pass and close the remaining Pass 08 validation items.**

## Governance note

The roadmap text still says the publishing-system registry should remain hidden/in-progress until validation, while current `main` marks it `public` and `ready`. Reconcile that wording/status before checking off Pass 08 so the roadmap and shipped registry agree.
