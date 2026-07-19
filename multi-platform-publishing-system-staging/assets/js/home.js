import { SITE_CONFIG } from "./config.js";
import { loadCsvObjects } from "./csv.js";
import { escapeHtml, normalizeJournalPost, normalizePhoto } from "./content.js";

const latestJournal = document.getElementById("latestJournal");
const featuredPhotos = document.getElementById("featuredPhotos");
const homeStats = document.getElementById("homeStats");

async function renderLatestJournal() {
  if (!latestJournal) return;
  try {
    const rows = await loadCsvObjects(SITE_CONFIG.content.journalCsvUrl, { cacheBust: SITE_CONFIG.content.cacheBust });
    const posts = rows
      .map(normalizeJournalPost)
      .filter((post) => post.published)
      .sort((a, b) => new Date(b.sortDate || b.date || 0) - new Date(a.sortDate || a.date || 0))
      .slice(0, 2);

    if (!posts.length) {
      latestJournal.innerHTML = '<p class="empty-state">New journal entries will appear here soon.</p>';
      return;
    }

    latestJournal.innerHTML = posts
      .map(
        (post) => `
          <article class="content-card">
            ${post.imageUrl ? `<div class="photo-thumb"><img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy" /></div>` : ""}
            <p class="journal-meta">${escapeHtml(post.displayDate || post.date || "Date TBD")}</p>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || "")}</p>
            <a class="button-secondary" href="./journal.html#post-${escapeHtml(post.slug)}">Read entry</a>
          </article>
        `
      )
      .join("");
  } catch (error) {
    console.error(error);
    latestJournal.innerHTML = '<p class="empty-state">Journal preview is taking a quick travel break. Please check back soon.</p>';
  }
}

async function renderFeaturedPhotos() {
  if (!featuredPhotos) return;
  try {
    const rows = await loadCsvObjects(SITE_CONFIG.content.mapPhotosCsvUrl, { cacheBust: SITE_CONFIG.content.cacheBust });
    const photos = rows
      .map(normalizePhoto)
      .filter((photo) => photo.visible && photo.imageUrl)
      .sort((a, b) => new Date(b.dateTaken || 0) - new Date(a.dateTaken || 0));

    if (homeStats) {
      const locations = new Set(photos.map((photo) => photo.mapGroupKey || photo.location));
      homeStats.innerHTML = `
        <span>${photos.length} photo${photos.length === 1 ? "" : "s"}</span>
        <span>${locations.size} mapped stop${locations.size === 1 ? "" : "s"}</span>
      `;
    }

    featuredPhotos.innerHTML = photos
      .slice(0, 3)
      .map(
        (photo) => `
          <a class="photo-link-card" href="./photos.html#${escapeHtml(photo.photoAnchor)}">
            <div class="photo-thumb"><img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title)}" loading="lazy" /></div>
            <div class="photo-card-body">
              <h3>${escapeHtml(photo.title)}</h3>
              <p class="photo-meta">${escapeHtml(photo.location)}</p>
            </div>
          </a>
        `
      )
      .join("");
  } catch (error) {
    console.error(error);
    featuredPhotos.innerHTML = '<p class="empty-state">Featured photos will appear here soon.</p>';
  }
}

renderLatestJournal();
renderFeaturedPhotos();
