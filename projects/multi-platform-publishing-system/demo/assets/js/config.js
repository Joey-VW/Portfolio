/**
 * Shared site configuration for static pages, public content sources, and form wiring.
 */
export const SITE_CONFIG = {
  site: {
    title: "Postcard Atlas",
    shortTitle: "Postcard Atlas",
    tagline: "Fictional field notes, photo stories, and mapped discoveries from the road.",
    ownerName: "Postcard Atlas",
    defaultLocation: "Cedar Vale",
    basePath: "./",
    canonicalBaseUrl: "https://joewisto.com/projects/multi-platform-publishing-system/demo/",
    sharedImageUrl: "https://joewisto.com/projects/multi-platform-publishing-system/demo/assets/postcard-atlas-fallback.svg",
  },

  content: {
    /** Local fixture matching the future published Map Photos sheet. */
    mapPhotosCsvUrl: "./data/map-photos.csv",

    /** Local fixture matching the future published Blog Posts sheet. */
    journalCsvUrl: "./data/blog-posts.csv",

    cacheBust: true,
  },

  backgroundVideos: {
    enabled: false,
    manifestUrl: "./assets/video-bg/manifest.json",
    items: [],
    shuffle: true,
    transitionMs: 3200,
    minPlayMs: 10000,
    minDwellMs: 1200,
    maxPlayMs: 18000,
    opacity: 0.68,
    overlayOpacity: 0.28,
    mediaBrightness: 1.04,
    mediaSaturation: 1,
    fallbackImageUrl: "./assets/postcard-atlas-fallback.svg",
    fallbackImageOpacity: 1,
    respectReducedMotion: true,
    coldStartMinImageMs: 3000,
  },

  ask: {
    enabled: false,
    disabledMessage: "This portfolio demo keeps message delivery disabled. No submitted data is collected or sent.",
  },

  map: {
    startCenter: [38.7200, -107.2800],
    startZoom: 10,
    markerPhotoLimit: 3,
    panelPhotoLimit: 6,
  },
};
