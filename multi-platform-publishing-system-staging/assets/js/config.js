/**
 * Shared site configuration for static pages, public content sources, and form wiring.
 */
export const SITE_CONFIG = {
  site: {
    title: "Postcard Atlas",
    shortTitle: "Postcard Atlas",
    tagline: "Fictional field notes, photo stories, and mapped discoveries from the road.",
    ownerName: "Postcard Atlas",
    defaultLocation: "Seattle, Washington",
    basePath: "./",
    canonicalBaseUrl: "https://joewisto.com/projects/multi-platform-publishing-system/",
    sharedImageUrl: "https://joewisto.com/projects/multi-platform-publishing-system/assets/background_image_clean.jpg",
  },

  content: {
    /** Local fixture matching the future published Map Photos sheet. */
    mapPhotosCsvUrl: "./data/map-photos.csv",

    /** Local fixture matching the future published Blog Posts sheet. */
    journalCsvUrl: "./data/blog-posts.csv",

    cacheBust: true,
  },

  backgroundVideos: {
    enabled: true,
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
    fallbackImageUrl: "./assets/background_image_clean.jpg",
    fallbackImageOpacity: 1,
    respectReducedMotion: true,
    coldStartMinImageMs: 3000,
  },

  ask: {
    enabled: false,
    /**
     * The custom Ask page posts to this Google Forms endpoint in the background.
     * The formResponse URL is the normal viewform URL with /viewform replaced by /formResponse.
     */
    googleFormSubmitUrl: "",
    googleFormViewUrl: "",
    googleFormPrefillUrl: "",
    googleFormEmbedUrl: "",
    entries: {
      name: "",
      email: "",
      message: "",
    },

    /** Optional fallback email for browsers without form support. */
    contactEmail: "",
    emailSubject: "Postcard Atlas demo question",
  },

  map: {
    startCenter: [47.6062, -122.3321],
    startZoom: 10,
    markerPhotoLimit: 3,
    panelPhotoLimit: 6,
  },
};
