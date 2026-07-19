const SAMPLE_IMAGE_URL = new URL("../background_image_clean.jpg", import.meta.url).href;

export const FEATURED_SAMPLE = {
  slug: "first-route-preview",
  title: "A first route preview",
  date: "2026-07-17",
  displayDate: "Jul 17, 2026",
  location: "Puget Sound Overlook",
  mapGroupKey: "puget-sound-overlook",
  clusterAnchor: "cluster-puget-sound-overlook",
  latitude: 47.6205,
  longitude: -122.3493,
  mapUrl: "https://www.openstreetmap.org/?mlat=47.6205&mlon=-122.3493#map=13/47.6205/-122.3493",
};

export const STATIC_SAMPLE_MEDIA = [
  {
    url: SAMPLE_IMAGE_URL,
    imageUrl: SAMPLE_IMAGE_URL,
    originalUrl: SAMPLE_IMAGE_URL,
    type: "image",
    alt: "Soft clouds above a distant landscape in the fictional Postcard Atlas demo.",
  },
];

export const STATIC_SAMPLE_POST = {
  published: true,
  slug: FEATURED_SAMPLE.slug,
  title: FEATURED_SAMPLE.title,
  date: FEATURED_SAMPLE.date,
  sortDate: FEATURED_SAMPLE.date,
  displayDate: FEATURED_SAMPLE.displayDate,
  location: FEATURED_SAMPLE.location,
  mapLink: FEATURED_SAMPLE.mapUrl,
  excerpt: "A fictional preview showing how a story can connect writing, media, and a mapped stop.",
  body:
    "Postcard Atlas is a fictional publication created to demonstrate a real multi-platform publishing workflow without exposing client content.\n\nThis sample entry remains available when the live content source cannot be reached, so the journal, media presentation, deep links, and map connections can still be tested.",
  media: STATIC_SAMPLE_MEDIA,
  imageUrl: STATIC_SAMPLE_MEDIA[0].imageUrl,
  imageAlt: STATIC_SAMPLE_MEDIA[0].alt,
  tags: ["Field notes", "Demo", "Pacific Northwest"],
  searchable: "first route preview puget sound overlook field notes demo pacific northwest postcard atlas",
};

export const STATIC_SAMPLE_PHOTOS = [
  {
    visible: true,
    title: "Route preview above the clouds",
    location: FEATURED_SAMPLE.location,
    dateTaken: FEATURED_SAMPLE.date,
    displayDate: FEATURED_SAMPLE.displayDate,
    note: "A local fallback image for the fictional publishing-system demo.",
    caption: STATIC_SAMPLE_MEDIA[0].alt,
    imageUrl: STATIC_SAMPLE_MEDIA[0].imageUrl,
    originalUrl: STATIC_SAMPLE_MEDIA[0].originalUrl,
    fileId: "",
    mapGroupKey: FEATURED_SAMPLE.mapGroupKey,
    latitude: FEATURED_SAMPLE.latitude,
    longitude: FEATURED_SAMPLE.longitude,
    hasCoordinates: true,
    photoAnchor: "photo-route-preview-above-the-clouds",
    clusterAnchor: FEATURED_SAMPLE.clusterAnchor,
  },
].map((photo) => ({
  ...photo,
  searchable: [photo.title, photo.location, photo.dateTaken, photo.note, photo.caption, photo.mapGroupKey].join(" ").toLowerCase(),
}));

export function isStaticSampleJournalPost(post) {
  return post.slug === FEATURED_SAMPLE.slug || post.title.trim().toLowerCase() === FEATURED_SAMPLE.title.toLowerCase();
}

export function slugForStaticComparison(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isStaticSamplePhoto(photo) {
  const photoAnchors = new Set(STATIC_SAMPLE_PHOTOS.map((item) => item.photoAnchor));
  return (
    photo.clusterAnchor === FEATURED_SAMPLE.clusterAnchor ||
    photoAnchors.has(photo.photoAnchor) ||
    slugForStaticComparison(photo.mapGroupKey) === FEATURED_SAMPLE.mapGroupKey ||
    slugForStaticComparison(photo.location) === FEATURED_SAMPLE.mapGroupKey
  );
}
