import { SITE_CONFIG } from "./config.js";
import { loadCsvObjects } from "./csv.js";
import { escapeHtml, normalizeJournalPost, paragraphsFromText } from "./content.js";
import { STATIC_SAMPLE_POST, isStaticSampleJournalPost } from "./static-content.js";
import { setPageLoading, waitForInitialImages } from "./page-loading.js";

const list = document.getElementById("journalList");
const status = document.getElementById("journalStatus");
const searchInput = document.getElementById("journalSearch");
const tagFilter = document.getElementById("journalTagFilter");

let posts = [STATIC_SAMPLE_POST];
let hasLoadedInitialContent = false;

function renderTagOptions(items) {
  if (!tagFilter) return;
  const tags = Array.from(new Set(items.flatMap((item) => item.tags))).sort();
  tagFilter.innerHTML = '<option value="">All tags</option>';
  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
}

function renderMediaStrip(post) {
  if (!post.media?.length) return "";
  const items = post.media
    .map((item, index) => {
      const label = item.alt || `${post.title} media ${index + 1}`;
      const href = item.originalUrl || item.url || item.imageUrl || item.thumbnailUrl || "#";
      const thumb = item.imageUrl || item.thumbnailUrl;
      if (thumb) {
        const loading = hasLoadedInitialContent ? "lazy" : "eager";
        return `<a class="journal-media-item" href="${escapeHtml(href)}" target="_blank" rel="noopener"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(label)}" loading="${loading}" /></a>`;
      }
      return `<a class="journal-media-item journal-media-link" href="${escapeHtml(href)}" target="_blank" rel="noopener"><span>${escapeHtml(item.type === "video" ? "Open video" : "Open media")}</span></a>`;
    })
    .join("");
  return `<div class="journal-media-grid" aria-label="Media for ${escapeHtml(post.title)}">${items}</div>`;
}

function getPostUrl(slug) {
  const url = new URL("journal.html", window.location.href);
  url.search = "";
  url.hash = `post-${slug}`;
  return url.href;
}

function setCopyFeedback(link, message) {
  const defaultLabel = link.dataset.copyLabel || "Copy link";
  window.clearTimeout(Number(link.dataset.copyResetTimer || 0));
  link.textContent = message;
  link.setAttribute("aria-label", message === defaultLabel ? defaultLabel : `${message}: ${defaultLabel}`);
  link.dataset.copyResetTimer = String(window.setTimeout(() => {
    link.textContent = defaultLabel;
    link.setAttribute("aria-label", defaultLabel);
    delete link.dataset.copyResetTimer;
  }, 1800));
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

async function copyPostLink(event, slug) {
  event.preventDefault();
  const link = event.currentTarget;
  const postUrl = getPostUrl(slug);

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(postUrl);
    } else if (!fallbackCopyText(postUrl)) {
      throw new Error("Clipboard fallback was not available");
    }

    setCopyFeedback(link, "Copied!");
  } catch (error) {
    console.warn("Could not copy journal link:", error);
    setCopyFeedback(link, "Copy failed");
    link.closest(".journal-card")?.classList.add("is-open");
    window.location.hash = `post-${slug}`;
  }
}

function renderJournalPost(post, index) {
  const article = document.createElement("article");
  article.className = "journal-card";
  article.id = `post-${post.slug}`;
  const bodyHtml = paragraphsFromText(post.body || post.excerpt);
  const tagHtml = post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const mediaHtml = renderMediaStrip(post);
  article.innerHTML = `
    <div class="journal-card-image">
      ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.imageAlt)}" loading="${hasLoadedInitialContent ? "lazy" : "eager"}" />` : ""}
    </div>
    <div class="journal-card-body">
      <p class="journal-meta">${escapeHtml(post.displayDate || post.date || "Date TBD")}${post.location ? ` • ${escapeHtml(post.location)}` : ""}</p>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(post.excerpt || "")}</p>
      ${tagHtml ? `<div class="tag-row">${tagHtml}</div>` : ""}
      <div class="journal-body">${bodyHtml}${mediaHtml}</div>
      <div class="card-actions">
        <button class="button" type="button" data-toggle-post>${index === 0 ? "Read entry" : "Read more"}</button>
        <a class="button-secondary" href="#post-${escapeHtml(post.slug)}" data-copy-post-link data-copy-label="Copy link">Copy link</a>
      </div>
    </div>
  `;

  article.querySelector("[data-toggle-post]").addEventListener("click", (event) => {
    article.classList.toggle("is-open");
    event.currentTarget.textContent = article.classList.contains("is-open") ? "Collapse" : "Read more";
  });

  article.querySelector("[data-copy-post-link]").addEventListener("click", (event) => {
    copyPostLink(event, post.slug);
  });

  return article;
}

function render() {
  if (!list || !status) return;
  const query = searchInput?.value.trim().toLowerCase() || "";
  const selectedTag = tagFilter?.value || "";
  const filtered = posts.filter((post) => {
    const matchesSearch = !query || post.searchable.includes(query);
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });


  if (!filtered.length) {
    list.innerHTML = "";
    status.textContent = "No journal entries matched that search.";
    return;
  }

  const isFiltered = Boolean(query || selectedTag);
  if (isFiltered) {
    status.textContent = `${filtered.length} matching journal entr${filtered.length === 1 ? "y" : "ies"} shown.`;
  } else {
    status.textContent = `${filtered.length} journal entr${filtered.length === 1 ? "y" : "ies"} shown.`;
  }

  list.innerHTML = "";
  filtered.forEach((post, index) => {
    list.appendChild(renderJournalPost(post, index));
  });

  const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
  if (hashTarget) {
    hashTarget.classList.add("is-open");
    setTimeout(() => hashTarget.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }
}

async function revealJournal() {
  await waitForInitialImages(list);
  hasLoadedInitialContent = true;
  setPageLoading(list, false);
}

async function initJournal() {
  if (!list || !status) return;
  setPageLoading(list, true);
  status.textContent = "Gathering journal entries…";
  try {
    const rows = await loadCsvObjects(SITE_CONFIG.content.journalCsvUrl, { cacheBust: SITE_CONFIG.content.cacheBust });
    const livePosts = rows
      .map(normalizeJournalPost)
      .filter((post) => post.published && !isStaticSampleJournalPost(post));
    posts = [...livePosts, STATIC_SAMPLE_POST].sort(
      (a, b) => new Date(b.sortDate || b.date || 0) - new Date(a.sortDate || a.date || 0)
    );

    renderTagOptions(posts);
    render();
    await revealJournal();
  } catch (error) {
    console.error(error);
    posts = [STATIC_SAMPLE_POST];
    renderTagOptions(posts);
    render();
    await revealJournal();
  }
}

searchInput?.addEventListener("input", render);
tagFilter?.addEventListener("change", render);
initJournal();
