import { SITE_CONFIG } from "./config.js";
import { loadCsvObjects } from "./csv.js";
import { escapeHtml, normalizePhoto, slugify } from "./content.js";
import { STATIC_SAMPLE_PHOTOS, isStaticSamplePhoto } from "./static-content.js";

const mapElement = document.getElementById("atlasMap");
const panel = document.getElementById("atlasMapPanel");
const status = document.getElementById("atlasMapStatus");

let groups = [];
let map;

function groupPhotos(photos) {
  const grouped = new Map();
  photos.forEach((photo) => {
    if (!photo.hasCoordinates) return;
    const key = photo.mapGroupKey || `${photo.latitude},${photo.longitude}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        id: `cluster-${slugify(key)}`,
        location: photo.location,
        latitude: photo.latitude,
        longitude: photo.longitude,
        photos: [],
      });
    }
    grouped.get(key).photos.push(photo);
  });
  return Array.from(grouped.values());
}

function buildThumbFan(photos, limit) {
  return photos
    .slice(0, limit)
    .map((photo, index) => `<img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title)}" style="--i:${index};" />`)
    .join("");
}

function buildMarkerHtml(group) {
  return `
    <button class="atlas-map-marker" type="button" aria-label="${escapeHtml(group.location)}">
      <span class="atlas-marker-thumbs">${buildThumbFan(group.photos, SITE_CONFIG.map.markerPhotoLimit)}</span>
      <span class="atlas-marker-count">${group.photos.length}</span>
    </button>
  `;
}

function buildPanel(group) {
  if (!panel) return;
  const count = group.photos.length;
  const featured = group.photos[0];
  panel.innerHTML = `
    <p class="panel-kicker">${count} ${count === 1 ? "photo" : "photos"}</p>
    <h2>${escapeHtml(group.location)}</h2>
    <p class="map-meta">${escapeHtml(featured.displayDate || featured.dateTaken || "Latest stop")}</p>
    <div class="atlas-photo-fan">${buildThumbFan(group.photos, SITE_CONFIG.map.panelPhotoLimit)}</div>
    ${featured.note ? `<p>${escapeHtml(featured.note)}</p>` : ""}
    <div class="card-actions">
      <a class="button" href="./photos.html#${escapeHtml(featured.clusterAnchor)}">Open this photo group</a>
      ${featured.originalUrl ? `<a class="button-secondary" href="${escapeHtml(featured.originalUrl)}" target="_blank" rel="noopener">Open original</a>` : ""}
    </div>
    <div class="atlas-stop-list">
      ${group.photos
        .slice(0, SITE_CONFIG.map.panelPhotoLimit)
        .map(
          (photo) => `
            <a class="atlas-stop-card" href="./photos.html#${escapeHtml(photo.photoAnchor)}">
              <img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title)}" loading="lazy" />
              <div>
                <h3>${escapeHtml(photo.title)}</h3>
                <p>${escapeHtml(photo.displayDate || photo.dateTaken || "Date unknown")}</p>
              </div>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function selectGroup(group, options = {}) {
  buildPanel(group);
  if (map && options.pan !== false) {
    const targetZoom = Math.max(map.getZoom(), 11);
    map.setView([group.latitude, group.longitude], targetZoom, { animate: true });
  }
}

function selectGroupFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || !groups.length) return false;
  const match = groups.find((group) => group.id === hash);
  if (match) {
    selectGroup(match, { pan: true });
    return true;
  }
  return false;
}

async function initMap() {
  if (!mapElement || !panel) return;
  if (!window.L) {
    panel.innerHTML = "<p>Could not load the map library.</p>";
    return;
  }

  try {
    let livePhotos = [];
    try {
      const rows = await loadCsvObjects(SITE_CONFIG.content.mapPhotosCsvUrl, { cacheBust: SITE_CONFIG.content.cacheBust });
      livePhotos = rows
        .map(normalizePhoto)
        .filter((photo) => photo.visible && photo.imageUrl && !isStaticSamplePhoto(photo));
    } catch (error) {
      console.error(error);
    }

    const photos = [...livePhotos, ...STATIC_SAMPLE_PHOTOS].sort(
      (a, b) => new Date(b.dateTaken || 0) - new Date(a.dateTaken || 0)
    );

    groups = groupPhotos(photos);
    status.textContent = groups.length
      ? `${groups.length} mapped stop${groups.length === 1 ? "" : "s"} ready to explore.`
      : "No visible photos with coordinates were found yet.";

    map = L.map("atlasMap", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    if (!groups.length) {
      map.setView(SITE_CONFIG.map.startCenter, SITE_CONFIG.map.startZoom);
      panel.innerHTML = `
        <p class="panel-kicker">Map is ready</p>
        <h2>No mapped photos yet</h2>
        <p>Mapped photo stops will appear here when the configured content source contains valid locations.</p>
      `;
      return;
    }

    const bounds = [];
    groups.forEach((group) => {
      const icon = L.divIcon({
        className: "atlas-leaflet-icon",
        html: buildMarkerHtml(group),
        iconSize: [74, 74],
        iconAnchor: [37, 37],
      });
      const marker = L.marker([group.latitude, group.longitude], { icon }).addTo(map);
      marker.on("click", () => {
        history.replaceState(null, "", `#${group.id}`);
        selectGroup(group);
      });
      bounds.push([group.latitude, group.longitude]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [42, 42] });
    } else {
      map.setView(bounds[0], 11);
    }

    if (!selectGroupFromHash()) selectGroup(groups[0], { pan: false });
    setTimeout(() => map.invalidateSize(), 300);
  } catch (error) {
    console.error(error);
    panel.innerHTML = `
      <p class="panel-kicker">Map detour</p>
      <h2>Could not load the map stops</h2>
      <p>The map stops are taking a quick travel break. Please try again soon.</p>
    `;
  }
}

window.addEventListener("hashchange", selectGroupFromHash);
initMap();
