# Postcard Atlas demo

Postcard Atlas is the approved fictional demonstration site for the Multi-Platform Publishing System portfolio project. It preserves the approved journal, photo gallery, map, Ask interface, and ambient background-video experience.

## Routes and relationship

- Public demo route: `/projects/multi-platform-publishing-system/demo/`
- Portfolio case study: `/projects/multi-platform-publishing-system.html`

The case study explains the portfolio project. This directory contains the separate, self-contained interactive demo. Every demo page retains its own Home navigation and includes a clearly labeled **Return to Joe Wisto portfolio** link.

## Current operating mode

The demo uses the committed fictional CSV fixtures in `data/` for Journal, Photos, Map, and homepage content. Google Sheets CSV, Google Forms, and Google Drive integrations remain optional deferred capabilities; their compatible configuration and helper code are retained without requiring live services.

Ask remains interactive for its approved validation and interface behavior, but `ask.enabled` is `false`. It submits and collects nothing. The page states this truthfully rather than implying delivery.

The retained fallback image at `assets/background_image_clean.jpg` and all local background-video assets in `assets/video-bg/` are owned by Joe Wisto and approved for public portfolio display and redistribution in this repository. The ordered video manifest remains at `assets/video-bg/manifest.json`.

The map uses Leaflet and OpenStreetMap tiles. Their visible attribution remains in the map experience.

## Architecture

This is a plain static HTML, CSS, and ES-module JavaScript site. There is no build step, package manager, application server, database, or framework.

Key files:

- `assets/js/config.js` - identity, content sources, Ask settings, map defaults, and background-video options.
- `data/blog-posts.csv` - fictional journal fixture matching the future published-sheet columns.
- `data/map-photos.csv` - fictional map/photo fixture matching the future published-sheet columns.
- `assets/js/static-content.js` - safe fallback content used if CSV loading fails.
- `assets/video-bg/manifest.json` - ordered inventory for ambient background media.
- `tools/build-video-manifest.cjs` - local manifest generator for checked-in videos.
- `tools/drive_video_manifest.gs` - optional Drive manifest helper; its folder ID remains a placeholder.

## Local review and validation

Serve the **repository root**, not this directory, so nested project paths and fixture fetches match deployment behavior:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/multi-platform-publishing-system/demo/`. Review Home, About, Journal, Photos, Map, Ask, and `404.html`; journal deep links; photo-map jumps; filters; lightbox controls; reduced-motion behavior; and the portfolio-return link.

Relevant checks:

```bash
node --check projects/multi-platform-publishing-system/demo/assets/js/background-video.js
node --check projects/multi-platform-publishing-system/demo/tools/build-video-manifest.cjs
python -c "import json; json.load(open('projects/multi-platform-publishing-system/demo/assets/video-bg/manifest.json', encoding='utf-8')); print('JSON valid')"
python tools/validate_project_registry.py
node tools/validate_project_registry_runtime.js
```

## Deferred portfolio-owned integrations

When public-safe portfolio-owned resources and permissions are ready:

1. Publish only required Sheets tabs as CSV and replace the local CSV paths in `assets/js/config.js`.
2. Make only media referenced by those public rows available to site visitors.
3. Add portfolio-owned Form URLs and entry IDs, then set `ask.enabled` to `true` only after end-to-end delivery testing.
4. Replace the placeholder folder ID in `tools/drive_video_manifest.gs` only if Drive-hosted background playback is needed.
5. Re-run route, media, privacy, and submission validation before release.

Do not publish private identifiers, secrets, or client-owned Google resource IDs. Treat every value in a published CSV as public.
