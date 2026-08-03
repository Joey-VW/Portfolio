import { SITE_CONFIG } from "./config.js";
import { loadCsvObjects } from "./csv.js";
import { escapeHtml, normalizePhoto } from "./content.js";
import { STATIC_SAMPLE_PHOTOS, isStaticSamplePhoto } from "./static-content.js";
import { setPageLoading, waitForInitialImages } from "./page-loading.js";

const grid = document.getElementById("atlasPhotoGrid");
const status = document.getElementById("atlasPhotoStatus");
const searchInput = document.getElementById("atlasPhotoSearch");
const locationFilter = document.getElementById("atlasLocationFilter");
const lightbox = document.getElementById("atlasPhotoLightbox");
const lightboxImage = document.getElementById("atlasLightboxImage");
const lightboxTitle = document.getElementById("atlasLightboxTitle");
const lightboxMeta = document.getElementById("atlasLightboxMeta");
const lightboxOriginal = document.getElementById("atlasLightboxOriginal");
const lightboxClose = document.querySelector(".atlas-lightbox-close");

let photos = STATIC_SAMPLE_PHOTOS;
let hasLoadedInitialContent = false;
let lightboxReturnFocus = null;

function groupByCluster(items) {
  return items.reduce((groups, item) => {
    const key = item.clusterAnchor;
    if (!groups[key]) {
      groups[key] = {
        id: key,
        location: item.location,
        mapGroupKey: item.mapGroupKey,
        photos: [],
        sortDate: item.dateTaken || "",
      };
    }
    groups[key].photos.push(item);
    if (new Date(item.dateTaken || 0) > new Date(groups[key].sortDate || 0)) {
      groups[key].sortDate = item.dateTaken;
    }
    return groups;
  }, {});
}

function renderLocationOptions(items) {
  if (!locationFilter) return;
  locationFilter.innerHTML = '<option value="">All locations</option>';
  const locations = Array.from(new Set(items.map((item) => item.location))).sort();
  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });
}

function openLightbox(photo) {
  if (!photo.imageUrl || !lightbox) return;
  lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  lightboxImage.src = photo.imageUrl;
  lightboxImage.alt = photo.title;
  lightboxTitle.textContent = photo.title;
  lightboxMeta.textContent = photo.location + (photo.displayDate ? ` • ${photo.displayDate}` : "");
  lightboxOriginal.href = photo.originalUrl || photo.imageUrl;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("atlas-lightbox-active");
  lightboxClose?.focus();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("atlas-lightbox-active");
  lightboxImage.src = "";
  lightboxReturnFocus?.focus();
  lightboxReturnFocus = null;
}

function highlightHashTarget() {
  const hash = window.location.hash;
  if (!hash) return;
  const normalizedHash = hash === "#puget-sound-overlook" ? "#cluster-puget-sound-overlook" : hash;
  const target = document.querySelector(normalizedHash);
  if (!target) return;

  document.querySelectorAll(".atlas-photo-card.is-target, .atlas-photo-cluster.is-target").forEach((element) => {
    element.classList.remove("is-target");
  });

  target.classList.add("is-target");
  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 150);
}

function render() {
  if (!grid || !status) return;
  const query = searchInput?.value.trim().toLowerCase() || "";
  const selectedLocation = locationFilter?.value || "";

  const filtered = photos.filter((photo) => {
    const matchesSearch = !query || photo.searchable.includes(query);
    const matchesLocation = !selectedLocation || photo.location === selectedLocation;
    return matchesSearch && matchesLocation;
  });


  if (!filtered.length) {
    grid.innerHTML = "";
    status.textContent = "No photos matched that search.";
    highlightHashTarget();
    return;
  }

  const isFiltered = Boolean(query || selectedLocation);
  const locationCount = new Set(filtered.map((photo) => photo.location)).size;
  if (isFiltered) {
    status.textContent = `${filtered.length} matching photo${filtered.length === 1 ? "" : "s"} shown.`;
  } else {
    status.textContent = `${filtered.length} photo${filtered.length === 1 ? "" : "s"} ${locationCount === 1 ? "shown" : `across ${locationCount} locations`}.`;
  }

  grid.innerHTML = "";

  const groups = groupByCluster(filtered);
  Object.values(groups)
    .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
    .forEach((group) => {
      const section = document.createElement("section");
      section.className = "atlas-photo-cluster";
      section.id = group.id;

      const heading = document.createElement("div");
      heading.className = "atlas-photo-cluster-heading";
      heading.innerHTML = `
        <div>
          <p class="kicker">${group.photos.length} photo${group.photos.length === 1 ? "" : "s"}</p>
          <h2>${escapeHtml(group.location)}</h2>
        </div>
        <a class="button-secondary" href="./map.html#${escapeHtml(group.id)}">View on map</a>
      `;

      const cards = document.createElement("div");
      cards.className = "atlas-photo-grid";

      group.photos.forEach((photo) => {
        const card = document.createElement("article");
        card.className = "atlas-photo-card";
        card.id = photo.photoAnchor;

        const loading = hasLoadedInitialContent ? "lazy" : "eager";
        const imgHtml = photo.imageUrl
          ? `<img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title)}" loading="${loading}" />`
          : '<div class="atlas-photo-missing">No image available</div>';

        card.innerHTML = `
          <button class="atlas-photo-open" type="button">
            <div class="atlas-photo-image-wrap">${imgHtml}</div>
            <div class="atlas-photo-card-body">
              <h3>${escapeHtml(photo.title)}</h3>
              <p class="photo-meta">${escapeHtml(photo.displayDate || photo.dateTaken || "Date unknown")}</p>
              ${photo.note ? `<p class="atlas-photo-notes">${escapeHtml(photo.note)}</p>` : ""}
            </div>
          </button>
        `;

        card.querySelector(".atlas-photo-open").addEventListener("click", () => openLightbox(photo));
        cards.appendChild(card);
      });

      section.appendChild(heading);
      section.appendChild(cards);
      grid.appendChild(section);
    });

  highlightHashTarget();
}

async function revealPhotos() {
  await waitForInitialImages(grid);
  hasLoadedInitialContent = true;
  setPageLoading(grid, false);
}

async function initPhotos() {
  if (!grid || !status) return;
  setPageLoading(grid, true);
  status.textContent = "Gathering photos…";
  try {
    const rows = await loadCsvObjects(SITE_CONFIG.content.mapPhotosCsvUrl, { cacheBust: SITE_CONFIG.content.cacheBust });
    const livePhotos = rows
      .map(normalizePhoto)
      .filter((photo) => photo.visible && !isStaticSamplePhoto(photo));
    photos = [...livePhotos, ...STATIC_SAMPLE_PHOTOS].sort(
      (a, b) => new Date(b.dateTaken || 0) - new Date(a.dateTaken || 0)
    );

    renderLocationOptions(photos);
    render();
    await revealPhotos();
  } catch (error) {
    console.error(error);
    photos = STATIC_SAMPLE_PHOTOS;
    renderLocationOptions(photos);
    render();
    await revealPhotos();
  }
}

searchInput?.addEventListener("input", render);
locationFilter?.addEventListener("change", render);
lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeLightbox();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = [lightboxClose, lightboxOriginal].filter((element) => element && !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
window.addEventListener("hashchange", highlightHashTarget);

initPhotos();
