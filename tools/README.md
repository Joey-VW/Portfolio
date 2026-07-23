# Shrinkflation data tools

## Gravity Fleet deterministic validator

Run the dependency-free Gravity Fleet regression harness directly with Node:

```bash
node tools/validate_gravity_fleet.js
```

It initializes every level, replays the seeded Level 1 command fixture, checks
controlled win and loss paths, validates telemetry and saved-run compatibility,
rejects DOM, viewport, canvas, storage, or device dependencies in the shared
engine modules, enforces fixed-step catch-up limits, and compares deterministic
checkpoints under 30Hz, 60Hz, and 144Hz render schedules. It also verifies the
identity desktop camera, portrait and landscape framing, world-corner fitting,
inverse pointer transforms, and camera resize isolation from gameplay state.
The mobile-shell checks cover engine pause/resume without advancement or
catch-up, gesture cancellation, Clear Wormhole command behavior, and the
configured preparation, activation, countdown, and absolute-expiry lifecycle.

`fetch_kroger_products.py` is the backend-oriented data pull for the static Shrinkflation Tracker. It uses Kroger's official developer API only; it does **not** scrape grocery pages, automate a browser, or expose credentials to frontend JavaScript.

## Safety model

- Credentials stay local/server-side in environment variables or a local `.env` file.
- The static frontend never calls Kroger directly.
- The current `quarterlyHistory` values are curated mock/demo history for the portfolio prototype and are preserved by default.
- Official API pulls are stored separately under product-level `apiMatches` and `observations` fields.
- Existing product fields such as `productName`, `brand`, `category`, `department`, `notes`, `sourceType`, `confidence`, and unknown fields are preserved by observation merges.
- Same-day observations are deduped by source, retailer, banner, location, product/UPC, and observed date.

## Kroger API assumptions

The script uses the public Kroger Developer API base URL `https://api.kroger.com/v1`, OAuth client credentials with the `product.compact` scope, `/products` with `filter.term`, `filter.locationId`, and `filter.limit`, and `/locations` with `filter.zipCode.near`, `filter.limit`, and optional `filter.chain=FRYS`. Kroger documentation says product prices require `filter.locationId`, and location searches require a starting point such as `filter.zipCode.near`.

If Fry's locations are not returned for your ZIP code with `filter.chain=FRYS`, set `KROGER_LOCATION_ID` directly after finding the store in the developer tools or adjust the chain value locally.

## Setup

1. Create Kroger developer credentials with product API access.
2. Copy `.env.example` to `.env` and fill in local values:
   - `KROGER_CLIENT_ID`
   - `KROGER_CLIENT_SECRET`
   - `KROGER_LOCATION_ID` or `KROGER_ZIP_CODE`
3. Keep `.env` out of git.

## Commands

Fetch live data and summarize without writing files:

```bash
python tools/fetch_kroger_products.py --dry-run --limit 3
```

Fetch live data and write staging JSON only:

```bash
python tools/fetch_kroger_products.py --write-staging --limit 3
```

Fetch live data and merge source-aware observation fields into `data/shrinkflation-products.json`:

```bash
python tools/fetch_kroger_products.py --apply-observations
```

Validate merge behavior without Kroger credentials by reading a staging file and dry-running the merge:

```bash
python tools/fetch_kroger_products.py --from-staging data/shrinkflation-products.kroger-staging.json --apply-observations --dry-run
```

Run the built-in offline fixture checks:

```bash
python tools/fetch_kroger_products.py --test-merge-fixture
```

Explicitly promote parsed API observations into demo history only when you intend to change the frontend history curve:

```bash
python tools/fetch_kroger_products.py --from-staging data/shrinkflation-products.kroger-staging.json --promote-observations-to-history --period "Kroger 2026-07-11"
```

## Output fields

`apiMatches` retains candidate-match details, including parsed size, regular/promo/effective price, unit price when safe to calculate, fulfillment, IDs, timestamps, normalized `imageCandidates`, and raw API data for debugging.

`imageCandidates` is a frontend-safe ordered list derived from Kroger image metadata. Each candidate contains a URL, optional perspective, optional size, optional featured state, and safe alt text. Raw API responses are still preserved for diagnostics.

Product images are not downloaded or committed. Kroger's developer terms note that API content can include third-party content and the official material reviewed did not clearly authorize local caching and redistribution of product images, so the tracker keeps live Kroger image URLs plus local category fallback art: https://developer.kroger.com/terms

`observations` stores the normalized daily observation used for future trend logic. Unit price is calculated only when both an effective price and parsed numeric size are available; unparsed sizes are retained with `confidence: "unparsed"` and no fake unit price.

## Showcase Dev Lab save server

`serve_showcase_dev.py` serves the repository root and exposes one local-only write endpoint for saving Showcase Dev Lab configuration changes to `data/showcase-config.json`:

```bash
python tools/serve_showcase_dev.py
```

Open the printed localhost URL, enable or open Showcase Dev Lab through its approved local debug mechanism, adjust controls, select **Save**, review the Git diff for `data/showcase-config.json`, and commit the JSON change through the normal Git workflow. The standard `python -m http.server` command can preview committed saved configuration but cannot process Dev Lab saves. The dedicated server is required only when writing a new saved configuration; production remains static and only reads the committed JSON.

## GitHub Actions Kroger observation updates

`.github/workflows/update-kroger-observations.yml` updates the committed Kroger observation data. It supports manual `workflow_dispatch` runs and a Wednesday schedule. GitHub cron runs in UTC, and `America/Phoenix` stays UTC-7 year-round, so the workflow uses `15 15 * * 3` for Wednesday 8:15 AM Phoenix time.

Scheduled runs are gated by the repository variable `KROGER_SCHEDULE_ENABLED`. Manual runs bypass that gate so the workflow can be verified before recurring writes are enabled. Set the variable to `true` to allow scheduled updates, or set it to anything else, leave it unset, or disable the workflow to stop scheduled credentialed updates. The flag is operational configuration, not a secret.

Required Actions secrets are `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, and one store context value: either `KROGER_LOCATION_ID` or `KROGER_ZIP_CODE`. Supplying a location ID avoids ZIP-code discovery; supplying only a ZIP code lets the script find a Fry's location. Secrets are passed only through environment variables and must not be printed, committed, written to artifacts, or copied into frontend files.

The workflow runs in this order:

1. Check out the default branch and set up Python.
2. Run `python tools/fetch_kroger_products.py --test-merge-fixture` before any credentialed request.
3. Run `python tools/fetch_kroger_products.py --apply-observations --strict-validation`.
4. Commit only `data/shrinkflation-products.json` when that file changed meaningfully. If no semantic observation data changed, the run exits successfully without a commit. If any other tracked file changes, the workflow fails instead of staging it.

Strict validation rejects empty target lists, empty normalized observations, observations that do not map to tracked products, product removals, protected curated field changes, invalid top-level JSON shape, all-unusable observations that lack both price and parsed size, and any credential value detected in proposed output. The script builds the merged JSON before writing and uses a same-directory atomic replacement only after validation succeeds, so failed API calls or validation failures leave production data untouched. `quarterlyHistory` is not promoted by this workflow. Staging files, raw API responses, and generated artifacts must remain uncommitted.

To review an automated commit, inspect the Actions run summary counts and then review the commit diff for `data/shrinkflation-products.json`, focusing on new or updated `apiMatches`, `observations`, image candidates, prices, sizes, and match status. Safe summary output gives counts only; it does not dump raw responses or secrets. If a run fails, fix the secret, target, or matching issue and rerun it manually from the workflow page.

For local match review, fetch or load staging data and print concise candidates:

```bash
python tools/fetch_kroger_products.py --dry-run --limit 3 --review-matches
python tools/fetch_kroger_products.py --from-staging data/shrinkflation-products.kroger-staging.json --dry-run --review-matches
```

If matching looks suspicious, do not commit the automated data update. Review the candidate product IDs, UPCs, brands, descriptions, prices, and sizes. Refine `excludeTerms`, then lock a stable match by setting `preferredProductId` or `preferredUpc` in `data/shrinkflation-api-targets.json` and setting `matchStatus` to `locked`. After correcting targets, rerun the fixture and then rerun the workflow manually.

## Reviewing and locking product matches

Targets live in `data/shrinkflation-api-targets.json`. Search terms are useful for discovery, but long-term history should eventually lock to a stable Kroger `productId` or UPC:

```json
{
  "id": "ground-coffee",
  "searchTerm": "ground coffee",
  "preferredProductId": null,
  "preferredUpc": null,
  "excludeTerms": [],
  "matchStatus": "candidate"
}
```

Review concise candidate details after a pull or staging load:

```bash
python tools/fetch_kroger_products.py --dry-run --limit 3 --review-matches
python tools/fetch_kroger_products.py --from-staging data/shrinkflation-products.kroger-staging.json --dry-run --review-matches
```

When a candidate is the right real-world product, copy its `productId` into `preferredProductId` or its UPC into `preferredUpc`, and set `matchStatus` to `locked`. Locked targets only accept that exact ID/UPC when Kroger returns it; the script will not silently substitute a different product. Existing observations remain in `data/shrinkflation-products.json` even if targets are refined later.

## Live observations vs. demo history

- `quarterlyHistory` remains curated mock/demo history and powers the current case-study curves.
- `apiMatches` keeps the reviewed/raw API match evidence for debugging.
- `observations` keeps normalized daily live observations for future trend detection.
- Future automation should fetch into staging, review candidate matches, lock stable IDs/UPCs, then apply observations in a commit.
- Kroger credentials must stay in local/server-side environments; the static frontend only reads committed JSON and never calls Kroger directly.

## Developer page capture utility

`capture_page.py` is a backend-only local development helper for capturing a rendered webpage as a crisp screenshot artifact. It uses Playwright with Chromium, so it captures the page as a real browser sees it rather than parsing HTML. The default full-page output uses scroll-and-stitch behavior: it captures deterministic viewport tiles from top to bottom, then stitches them into one tall `full.png`. Generated screenshots default to `../portfolio-captures/` so VS Code Live Server does not refresh the browser when files are written inside the repo. You can still override this with `--output-dir`; the tool warns, but does not block, when the selected output directory is inside the repo.

### Setup

Install the Python dependencies and Chromium browser binary:

```bash
pip install playwright pillow
python -m playwright install chromium
```

### Common examples

Capture the current Live Server homepage in interactive mode. The browser opens, you adjust the page, then press Enter in the terminal to capture both `full.png` and `grid.png` under `../portfolio-captures/`:

```bash
python tools/capture_page.py http://127.0.0.1:5500/ --interactive --mode both --slug home
```

Capture an exact/debug comparison that keeps repeated sticky/fixed elements, keeps tile files, and stores debug diagnostics:

```bash
python tools/capture_page.py http://127.0.0.1:5500/ --interactive --mode both --fixed-elements keep --keep-tiles --debug --slug home-debug
```

Wait until async loading text disappears before capturing:

```bash
python tools/capture_page.py http://127.0.0.1:5500/ --interactive --mode both --wait-for-text-gone "Loading project cards..." --slug home-loaded
```

Capture both the full-page screenshot and a tiled grid/contact sheet for a Live Server project page:

```bash
python tools/capture_page.py http://127.0.0.1:5500/projects/shrinkflation-tracker.html --interactive --mode both --slug shrinkflation-tracker
```

Capture a full-page screenshot of a reachable public URL:

```bash
python tools/capture_page.py https://joewisto.com --mode full
```

Use grid mode when a very tall full-page image is hard to review or share. Grid output defaults to a two-column, top-to-bottom contact sheet. Override it with `--grid-columns 1`, `--grid-columns 2`, or `--grid-columns 3` when needed:

```bash
python tools/capture_page.py http://127.0.0.1:5500/games/gravity-fleet-lab.html --mode grid --device-scale-factor 2
```

### Sticky and fixed elements

Viewport tile capture can otherwise repeat sticky headers or fixed nav bars in every tile. By default, `--fixed-elements hide-after-first` captures the first tile normally, then temporarily hides visible meaningful `position: fixed` or `position: sticky` elements for later tiles. This keeps stitched full-page screenshots and grid contact sheets readable while preserving the page header once at the top.

- `--fixed-elements hide-after-first` is the default and is best for review screenshots.
- `--fixed-elements keep` preserves exact browser rendering in every tile for debugging.
- `--fixed-elements hide-all` hides fixed/sticky elements in every tile when the header/nav is not desired.

### Async waits

Interactive mode waits `1500` ms after you press Enter before capture starts. Adjust this with `--post-enter-wait-ms` when project cards, fonts, or other async UI need more or less time.

Optional wait helpers can make captures more consistent without failing the whole run when a local page is slow:

- `--wait-for-selector ".some-selector"` waits up to 10 seconds for a visible selector before capture.
- `--wait-for-text-gone "Loading project cards..."` waits up to 10 seconds until the text is no longer present before capture.

Timeouts are reported as warnings and recorded in `meta.json`.


### Output

Each run creates a timestamped folder such as `../portfolio-captures/shrinkflation-tracker-20260711-143012/` containing:

- `full.png` for `--mode full` or `--mode both`; this is stitched from viewport captures instead of using the browser native full-page screenshot path.
- `grid.png`, a readable two-column contact sheet made from the same top-to-bottom tile captures, for `--mode grid` or `--mode both`. Use `--grid-columns 1`, `--grid-columns 2`, or `--grid-columns 3` to override the layout.
- `tile-001.png`, `tile-002.png`, and so on only when `--keep-tiles` is passed. Tile files are deleted by default after the requested final image outputs are created.
- `meta.json` with the URL, capture time, viewport, device scale factor, page dimensions, capture strategy, tile count, requested/actual tile offsets, tile cleanup status, image paths, browser info, grid column count, output-directory risk flags, fixed-element behavior, async wait settings, and safe scroll/capture diagnostics. Passing `--debug` also prints those diagnostics during capture.

Useful optional flags include `--width`, `--height`, `--device-scale-factor`, `--wait-ms`, `--post-enter-wait-ms`, `--wait-for-selector`, `--wait-for-text-gone`, `--output-dir`, `--slug`, `--scroll-warmup`, `--fixed-elements`, `--keep-tiles`, `--debug`, `--grid-columns`, and `--privacy-reminder`.
