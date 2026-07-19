import { getCell, isVisibleValue } from "./csv.js";

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function slugify(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function extractUrl(value) {
  if (!value) return "";
  const text = String(value);
  const imageFormulaMatch = text.match(/IMAGE\(["']([^"']+)["']/i);
  if (imageFormulaMatch) return imageFormulaMatch[1];
  const urlMatch = text.match(/https?:\/\/[^\s"')<>]+/i);
  return urlMatch ? urlMatch[0] : text.trim();
}

function extractDriveId(value) {
  if (!value) return "";
  const text = String(value);
  const patterns = [/\/file\/d\/([^/]+)/i, /\/d\/([^/]+)/i, /[?&]id=([^&]+)/i, /open\?id=([^&]+)/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return decodeURIComponent(match[1]);
  }
  return "";
}

function driveThumbUrl(fileId, width = 1600) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

function driveOpenUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function guessMediaType(value) {
  const text = String(value || "").toLowerCase();
  if (/\.(jpe?g|png|gif|webp|avif|heic)(\?|#|$)/.test(text)) return "image";
  if (/\.(mp4|mov|m4v|webm)(\?|#|$)/.test(text)) return "video";
  return "unknown";
}

function splitMediaCell(value) {
  return String(value || "")
    .split(/,\s*(?=https?:\/\/|drive\.google\.com|$)/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseMediaItems(value) {
  return splitMediaCell(value).map((item) => {
    const url = extractUrl(item);
    const fileId = extractDriveId(url || item);
    const isDrive = Boolean(fileId);
    const type = guessMediaType(url || item);
    const thumbnailUrl = isDrive ? driveThumbUrl(fileId, 1600) : "";
    const originalUrl = isDrive ? driveOpenUrl(fileId) : url;

    return {
      url: thumbnailUrl || url,
      imageUrl: type === "image" || isDrive ? thumbnailUrl || url : "",
      thumbnailUrl,
      originalUrl,
      fileId,
      type: isDrive && type === "unknown" ? "unknown" : type,
    };
  });
}

export function normalizePhoto(row, index = 0) {
  const visible = isVisibleValue(getCell(row, ["visible", "show", "include"], "true"));
  const title = getCell(row, ["title", "caption", "name", "fileName"], "Untitled photo");
  const location = getCell(row, ["locationName", "location", "place"], "Uncategorized");
  const dateTaken = getCell(row, ["dateTaken", "date", "createdDate", "timestamp", "sortDate"]);
  const note = getCell(row, ["note", "notes", "description", "caption", "journalNote"]);
  const fileId = getCell(row, ["fileId"]) || extractDriveId(Object.values(row).join(" "));
  const mapGroupKey = getCell(row, ["mapGroupKey"]) || slugify(location);

  const rawImage = extractUrl(getCell(row, ["imageUrl", "photoUrl", "thumbnailUrl", "thumbnail", "image", "preview"]));
  const imageDriveId = extractDriveId(rawImage) || fileId;
  const imageUrl = imageDriveId ? driveThumbUrl(imageDriveId, 1600) : rawImage;
  const originalUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/view`
    : extractUrl(getCell(row, ["photoUrl", "driveLink", "fileUrl", "fileLink", "url", "imageUrl"]));

  const latitude = Number(getCell(row, ["latitude", "lat"]));
  const longitude = Number(getCell(row, ["longitude", "lng", "lon"]));
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const photoAnchor = fileId ? `photo-${slugify(fileId)}` : `photo-${slugify(title)}-${index + 1}`;
  const clusterAnchor = `cluster-${slugify(mapGroupKey || location)}`;

  return {
    visible,
    title,
    location,
    dateTaken,
    displayDate: formatDisplayDate(dateTaken),
    note,
    imageUrl,
    originalUrl,
    fileId,
    mapGroupKey,
    latitude,
    longitude,
    hasCoordinates,
    photoAnchor,
    clusterAnchor,
    searchable: [title, location, dateTaken, note, mapGroupKey].join(" ").toLowerCase(),
  };
}

export function normalizeJournalPost(row, index = 0) {
  const visibilityValue = getCell(row, ["published", "visible", "show", "include", "status"], "true");
  const published = isVisibleValue(visibilityValue);
  const title = getCell(row, ["Post Title", "postTitle", "title", "headline"]);
  const timestamp = getCell(row, ["Timestamp", "timestamp"]);
  const date = getCell(row, ["Date", "date", "publishedAt", "postDate", "sortDate"]) || timestamp;
  const location = getCell(row, ["Location Name", "locationName", "location", "place"], "");
  const mapLink = getCell(row, ["Map Link", "mapLink"]);
  const excerpt = getCell(row, ["Excerpt", "excerpt", "summary", "dek"]);
  const body = getCell(row, ["Body", "body", "content", "post", "journal", "notes"]);
  const media = parseMediaItems(getCell(row, ["Media", "media"]));
  const explicitImageUrl = extractUrl(getCell(row, ["imageUrl", "heroImage", "photoUrl", "thumbnail"]));
  const heroMedia = media.find((item) => item.imageUrl || item.thumbnailUrl || item.url);
  const imageUrl = explicitImageUrl || heroMedia?.imageUrl || heroMedia?.thumbnailUrl || heroMedia?.url || "";
  const imageAlt = getCell(row, ["imageAlt", "alt"], title || `Journal entry ${index + 1}`);
  const tags = getCell(row, ["Tags", "tags", "tag"])
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const fallbackTitle = title || (body || excerpt || media.length ? `Journal entry ${index + 1}` : "");
  const slug = slugify(getCell(row, ["Slug", "slug"], fallbackTitle), `journal-entry-${index + 1}`);
  const emailAddress = getCell(row, ["Email Address", "emailAddress"]);
  const hasContent = Boolean(title || body || excerpt || media.length);

  return {
    published: published && hasContent,
    title: fallbackTitle,
    date,
    sortDate: date || timestamp,
    displayDate: formatDisplayDate(date),
    location,
    mapLink,
    excerpt: excerpt || body.slice(0, 160),
    body,
    media,
    imageUrl,
    imageAlt,
    tags,
    slug,
    emailAddress,
    searchable: [fallbackTitle, date, location, excerpt, body, tags.join(" ")].join(" ").toLowerCase(),
  };
}

export function paragraphsFromText(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
