# Postcard Atlas demo

This self-contained portfolio demo lives at `/projects/multi-platform-publishing-system/demo/`. It uses fictional editorial content, local CSV fixtures, and a disabled message form. It makes no requests to Google Sheets, Forms, Drive, Apps Script, analytics, or client systems.

## Media inventory and public-use basis

| File | Format | Size | Source and redistribution status | Purpose |
| --- | --- | ---: | --- | --- |
| `assets/postcard-atlas-fallback.svg` | SVG | Original vector | Authored for this portfolio; cleared for public redistribution | Background, card, gallery, and fallback illustration |

No video files are retained. The quarantined video set had no documented redistribution basis, so this release intentionally uses the accessible static fallback. The ambient-media component remains configured for an empty local manifest and preserves its failure and reduced-motion fallback state.

Leaflet 1.9.4 is loaded from unpkg under its BSD-2-Clause license, and its standard map-control attribution remains enabled. Map tiles are requested from OpenStreetMap with visible contributor attribution; the demo uses a small number of static fixture markers.

## Local review

Serve the repository root with `python -m http.server 8000`, then open `/projects/multi-platform-publishing-system/demo/`. Test direct loads for every page, `not-found.html`, Journal/Photos/Map hashes, form validation, reduced motion, and the portfolio-return link. Cloudflare Pages uses the portfolio root 404 for unknown routes; this scoped page preserves the demo-specific fallback content for an intentional fallback link or future route rule.
