# Postcard Atlas

Postcard Atlas is the anonymized, fictional demonstration site for the Multi-Platform Publishing System portfolio project. It preserves the original journal, photo gallery, map, form, and ambient-video experience while keeping client material and private service identifiers out of the public repository.

## Current Pass 08 state

- The site is designed to live at `/projects/multi-platform-publishing-system/` inside the portfolio.
- All internal routes, local CSV sources, background-video manifests, and fallback media are project-relative.
- Every page includes a route back to the portfolio home.
- Journal and map/photo data currently load from the fictional fixtures in `data/`.
- The Ask interface can be exercised, but delivery is intentionally disabled until a portfolio-owned form is connected.
- Background videos remain checked-in project assets and use `assets/video-bg/manifest.json`.

## Architecture

The project is plain static HTML, CSS, and ES-module JavaScript. There is no build step, package manager, application server, database, or framework. A static host serves the files directly.

Key files:

- `assets/js/config.js`: project identity, content sources, form settings, map defaults, and background-video options.
- `data/blog-posts.csv`: fictional journal fixture matching the expected published-sheet columns.
- `data/map-photos.csv`: fictional map/photo fixture matching the expected published-sheet columns.
- `assets/js/static-content.js`: safe fallback content used if CSV loading fails.
- `assets/video-bg/manifest.json`: ordered inventory for ambient background media.
- `tools/build-video-manifest.cjs`: local manifest generator for checked-in videos.
- `tools/drive_video_manifest.gs`: optional Drive manifest helper; its folder ID is deliberately left as a placeholder.

## Local testing

Serve the directory over HTTP so ES modules and CSV requests behave as they will in production. From the project folder:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`. Test the home, about, journal, photos, map, Ask, and 404 pages; journal deep links; photo-map jumps; reduced-motion behavior; and the portfolio-return link.

## Connecting portfolio-owned Google resources later

When the duplicated resources have public-safe content and permissions:

1. Publish only the required Sheet tabs as CSV.
2. Replace the two local CSV paths in `assets/js/config.js` with their published CSV URLs.
3. Make only media referenced by those public rows viewable by site visitors.
4. Add the portfolio-owned Form URLs and entry IDs, then set `ask.enabled` to `true`.
5. Replace the placeholder folder ID in `tools/drive_video_manifest.gs` only if Drive-hosted background playback is still needed.
6. Re-run the full route, media, privacy, and submission tests before release.

Do not publish email addresses, private logistics, personal identifiers, secrets, or client-owned Drive/Form/Sheet IDs. Treat every value in a published CSV as public.

## Deployment notes

The final deployment should use the portfolio repository’s existing hosting configuration. Project-specific routes and cache headers belong at the portfolio root rather than in this nested folder. Keep URLs scoped to the project path so this demo cannot intercept portfolio-wide routes such as `/404.html`, `/robots.txt`, or `/sitemap.xml`.
