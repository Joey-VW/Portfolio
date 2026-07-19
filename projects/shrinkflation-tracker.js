const DATA_URL = new URL(
  "../data/shrinkflation-products.json",
  document.currentScript.src
);
const THRESHOLDS = { meaningful: 2, modest: 5 };
const state = { products: [], lastFocusedImage: null, modalToken: 0 };

const calculateUnitPrice = (price, size) => (size ? price / size : 0);
const percentChange = (previous, current) => (previous ? ((current - previous) / previous) * 100 : 0);
const isShrinkflation = (product) => product.currentSize < product.previousSize && product.unitPriceChangePct > THRESHOLDS.meaningful;
const formatCurrency = (value) => `$${Number(value).toFixed(value < 1 ? 3 : 2)}`;
const formatPercentage = (value) => `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
const formatUnitLabel = (product) => `/${product.unitLabel}`;
const escapeTrackerHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const uniqueDates = (observations) => [...new Set((observations || []).map((o) => o.observedAt).filter(Boolean))].sort();
const average = (items, key) => items.length ? items.reduce((sum, item) => sum + item[key], 0) / items.length : 0;

function classifyStatus(product) {
  const sizeDown = product.sizeChangePct < -THRESHOLDS.meaningful;
  const sizeChanged = Math.abs(product.sizeChangePct) >= THRESHOLDS.meaningful;
  const priceUp = product.shelfPriceChangePct > THRESHOLDS.meaningful;
  const unitUp = product.unitPriceChangePct > THRESHOLDS.meaningful;
  if (sizeDown && unitUp) return "Shrinkflation";
  if (priceUp && !sizeDown) return "Price Increase Only";
  if (sizeChanged && Math.abs(product.unitPriceChangePct) < THRESHOLDS.modest) return "Size Change Only";
  if (unitUp) return "Unit Price Increase";
  return "No Major Change";
}

function enrichProduct(product) {
  const history = product.quarterlyHistory.map((point) => ({ ...point, unitPrice: calculateUnitPrice(point.price, point.size) }));
  const previous = history[0];
  const current = history[history.length - 1];
  const enriched = { ...product, quarterlyHistory: history, previousSize: previous.size, currentSize: current.size, previousPrice: previous.price, currentPrice: current.price, previousUnitPrice: previous.unitPrice, currentUnitPrice: current.unitPrice };
  enriched.sizeChangePct = percentChange(enriched.previousSize, enriched.currentSize);
  enriched.shelfPriceChangePct = percentChange(enriched.previousPrice, enriched.currentPrice);
  enriched.unitPriceChangePct = percentChange(enriched.previousUnitPrice, enriched.currentUnitPrice);
  enriched.shrinkflationFlag = isShrinkflation(enriched);
  enriched.status = classifyStatus(enriched);
  return enriched;
}

function aggregateSummary(products) {
  return { avgSize: average(products, "sizeChangePct"), avgPrice: average(products, "shelfPriceChangePct"), avgUnit: average(products, "unitPriceChangePct"), flagged: products.filter((p) => p.shrinkflationFlag).length };
}

function aggregateCategories(products) {
  const groups = Map.groupBy ? Map.groupBy(products, (p) => p.category) : products.reduce((map, p) => map.set(p.category, [...(map.get(p.category) || []), p]), new Map());
  return [...groups.entries()].map(([category, items]) => ({ category, products: items.length, flagged: items.filter((p) => p.shrinkflationFlag).length, avgUnit: average(items, "unitPriceChangePct"), avgSize: average(items, "sizeChangePct") })).sort((a, b) => b.avgUnit - a.avgUnit);
}

function sparkline(values, color = "var(--cyan)") {
  const width = 140, height = 34, pad = 4;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / (values.length - 1 || 1);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return [x, y];
  });
  const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = points.at(-1);
  return `<span class="chart-well"><svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><line class="spark-baseline" x1="4" y1="${height - pad}" x2="${width - 4}" y2="${height - pad}"></line><path d="${d}" stroke="${color}"></path><circle cx="${last[0]}" cy="${last[1]}" fill="${color}"></circle></svg></span>`;
}

function statusClass(status) {
  return `status-${status.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "")}`;
}

function productArt(product) {
  const colors = { Frozen: ["#9efcff", "#d7b6ff"], Snacks: ["#ffd166", "#ff9f5c"], Breakfast: ["#ffe29a", "#c77dff"], Dairy: ["#f6f7ff", "#77a7ff"], Beverages: ["#99ffcc", "#77a7ff"], Household: ["#e3ecff", "#6ff8ff"], Pantry: ["#ffcf99", "#99ffcc"], "Meat / Protein": ["#ff9aa2", "#ffd166"] };
  const [a, b] = colors[product.category] || ["#6ff8ff", "#c77dff"];
  const candidates = getProductImageCandidates(product);
  const fallback = `<span>${escapeTrackerHtml(product.category.split(" ")[0])}<br>${escapeTrackerHtml(product.unitLabel)}</span>`;
  const image = candidates[0];
  const imageMarkup = image ? `<button class="package-art-button" type="button" data-product-image aria-label="Open larger image of ${escapeTrackerHtml(product.productName)}"><img src="${escapeTrackerHtml(image.url)}" alt="${escapeTrackerHtml(image.alt)}" loading="lazy" onerror="handleProductImageError(this)" />${fallback}</button>` : fallback;
  return `<div class="package-art ${image ? "has-product-image" : ""}" style="background:linear-gradient(145deg,${a},${b})" data-image-fallback="${escapeTrackerHtml(product.category)} ${escapeTrackerHtml(product.unitLabel)}">${imageMarkup}</div>`;
}

function imagePerspectiveRank(candidate) {
  const perspective = String(candidate?.perspective || "").toLowerCase();
  if (perspective === "front") return 0;
  if (candidate?.featured) return 1;
  if (perspective === "right") return 2;
  return 3;
}

function imageSizeRank(candidate, preferred = ["large", "medium", "xlarge", "small", "thumbnail"]) {
  const size = String(candidate?.size || "").toLowerCase();
  const index = preferred.indexOf(size);
  return index === -1 ? preferred.length : index;
}

function legacyImageCandidates(match, product) {
  const images = Array.isArray(match?.raw?.images) ? match.raw.images : [];
  const source = match?.description || product.brand || "Product image";
  return images.flatMap((image) => {
    if (!image || typeof image !== "object" || !Array.isArray(image.sizes)) return [];
    return image.sizes.map((size) => ({
      url: typeof size?.url === "string" ? size.url.trim() : "",
      perspective: image.perspective,
      size: size?.size,
      featured: Boolean(image.featured),
      alt: image.altText || match?.description || product.productName,
      source
    }));
  });
}

function getProductImageCandidates(product) {
  const seen = new Set();
  return (product.apiMatches || []).flatMap((match, matchIndex) => {
    const source = match?.description || product.brand || "Product image";
    const normalized = Array.isArray(match?.imageCandidates) ? match.imageCandidates : null;
    const candidates = normalized || legacyImageCandidates(match, product);
    return candidates.map((candidate, candidateIndex) => ({
      url: typeof candidate?.url === "string" ? candidate.url.trim() : "",
      perspective: candidate?.perspective,
      size: candidate?.size,
      featured: Boolean(candidate?.featured),
      alt: candidate?.alt || match?.description || product.productName,
      source,
      matchIndex,
      candidateIndex
    }));
  }).filter((candidate) => {
    if (!candidate.url || seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  }).sort((a, b) => imagePerspectiveRank(a) - imagePerspectiveRank(b) || imageSizeRank(a) - imageSizeRank(b) || a.matchIndex - b.matchIndex || a.candidateIndex - b.candidateIndex);
}

function storeImageCandidates(button, candidates, activeIndex = 0) {
  button._imageCandidates = candidates;
  button._activeImageIndex = activeIndex;
  updateActiveImageMetadata(button, candidates[activeIndex]);
}

function updateActiveImageMetadata(button, candidate) {
  if (!button || !candidate) return;
  button._activeImage = candidate;
  button.dataset.imageAlt = candidate.alt || "Product image";
  button.dataset.imageSource = candidate.source || "Product image";
}

function activateNextImageCandidate(image) {
  const button = image.closest(".package-art-button");
  const candidates = button?._imageCandidates || [];
  let index = (button?._activeImageIndex ?? 0) + 1;
  while (index < candidates.length) {
    const candidate = candidates[index];
    if (candidate?.url && candidate.url !== image.currentSrc && candidate.url !== image.src) {
      button._activeImageIndex = index;
      updateActiveImageMetadata(button, candidate);
      image.src = candidate.url;
      image.alt = candidate.alt || image.alt || "Product image";
      return true;
    }
    index += 1;
  }
  return false;
}

function handleProductImageError(image) {
  if (activateNextImageCandidate(image)) return;
  const art = image.closest(".package-art");
  const button = image.closest(".package-art-button");
  image.remove();
  art?.classList.remove("has-product-image");
  if (button) button.replaceWith(...button.childNodes);
}

function openImageModal(trigger) {
  const candidates = trigger._imageCandidates || [];
  if (!candidates.length) return;
  state.lastFocusedImage = trigger;
  state.modalToken += 1;
  const modal = document.querySelector("[data-image-modal]");
  modal._modalCandidates = [...candidates].sort((a, b) => imagePerspectiveRank(a) - imagePerspectiveRank(b) || imageSizeRank(a, ["xlarge", "large", "medium", "small", "thumbnail"]) - imageSizeRank(b, ["xlarge", "large", "medium", "small", "thumbnail"]));
  modal._modalIndex = -1;
  modal._modalToken = state.modalToken;
  modal.querySelector("[data-modal-title]").textContent = trigger.dataset.imageTitle || "Product image";
  modal.querySelector("[data-modal-source]").textContent = trigger.dataset.imageSource || "";
  modal.querySelector("[data-modal-fallback]").hidden = true;
  modal.querySelector("[data-modal-image]").hidden = false;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  showNextModalImage(modal, state.modalToken);
  modal.querySelector("[data-modal-close]").focus();
}

function showNextModalImage(modal, token) {
  const image = modal.querySelector("[data-modal-image]");
  const candidates = modal._modalCandidates || [];
  modal._modalIndex = (modal._modalIndex ?? -1) + 1;
  const candidate = candidates[modal._modalIndex];
  if (!candidate) {
    image.hidden = true;
    image.removeAttribute("src");
    modal.querySelector("[data-modal-fallback]").hidden = false;
    return;
  }
  modal.querySelector("[data-modal-source]").textContent = candidate.source || "";
  image.hidden = false;
  image.alt = candidate.alt || modal.querySelector("[data-modal-title]").textContent || "Product image";
  image.onerror = () => {
    if (!modal.hidden && modal._modalToken === token) showNextModalImage(modal, token);
  };
  image.src = candidate.url;
}

function closeImageModal() {
  const modal = document.querySelector("[data-image-modal]");
  if (!modal || modal.hidden) return;
  state.modalToken += 1;
  modal.hidden = true;
  const image = modal.querySelector("[data-modal-image]");
  image.onerror = null;
  image.removeAttribute("src");
  modal.querySelector("[data-modal-fallback]").hidden = true;
  document.body.classList.remove("modal-open");
  if (state.lastFocusedImage?.isConnected) state.lastFocusedImage.focus();
}

function initImageModal() {
  document.body.insertAdjacentHTML("beforeend", `<div class="image-modal" data-image-modal hidden role="dialog" aria-modal="true" aria-labelledby="image-modal-title"><div class="image-modal-backdrop" data-modal-backdrop></div><div class="image-modal-panel"><button class="image-modal-close" type="button" data-modal-close aria-label="Close image preview">×</button><img data-modal-image alt="" /><div class="image-modal-fallback" data-modal-fallback hidden><strong>Product image unavailable</strong><span>A larger remote image could not be loaded, so this preview is using the product details below.</span></div><div class="image-modal-copy"><h2 id="image-modal-title" data-modal-title></h2><p data-modal-source></p></div></div></div>`);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-product-image]");
    if (trigger) openImageModal(trigger);
    if (event.target.closest("[data-modal-close]") || event.target.matches("[data-modal-backdrop]")) closeImageModal();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeImageModal(); });
}

function renderCard(product) {
  return `<article class="product-card"><div class="product-card-badge"><span class="status-pill ${statusClass(product.status)}">${product.status}</span></div><div class="product-top">${productArt(product)}<div class="product-heading"><h3>${product.productName}</h3><p class="product-meta">${product.brand} • ${product.category}</p></div></div><div class="unit-emphasis"><span class="muted">Current unit price</span><strong>${formatCurrency(product.currentUnitPrice)}${formatUnitLabel(product)}</strong><small>${formatCurrency(product.previousUnitPrice)} → ${formatCurrency(product.currentUnitPrice)}${formatUnitLabel(product)}</small></div><div class="change-grid"><span>Size <b>${formatPercentage(product.sizeChangePct)}</b>${product.previousSize} → ${product.currentSize} ${product.unitLabel}</span><span>Shelf <b>${formatPercentage(product.shelfPriceChangePct)}</b>${formatCurrency(product.previousPrice)} → ${formatCurrency(product.currentPrice)}</span><span>Unit <b>${formatPercentage(product.unitPriceChangePct)}</b>price/unit</span></div><div class="spark-stack">${["size","price","unitPrice"].map((key, i) => `<div class="spark-row"><span>${key === "unitPrice" ? "Unit price" : key === "price" ? "Shelf price" : "Package size"}</span>${sparkline(product.quarterlyHistory.map((p) => p[key]), i === 0 ? "var(--cyan)" : i === 1 ? "var(--green)" : "var(--orange)")}</div>`).join("")}</div><p class="muted">${product.notes}</p></article>`;
}

function sortProducts(products, sort) {
  return [...products].sort((a, b) => sort === "name-asc" ? a.productName.localeCompare(b.productName) : sort === "size-asc" ? a.sizeChangePct - b.sizeChangePct : sort === "price-desc" ? b.shelfPriceChangePct - a.shelfPriceChangePct : b.unitPriceChangePct - a.unitPriceChangePct);
}

function populateSelect(select, values) { values.forEach((value) => select.insertAdjacentHTML("beforeend", `<option value="${value}">${value}</option>`)); }
function initControls() { const categories = [...new Set(state.products.map((p) => p.category))].sort(); const departments = [...new Set(state.products.map((p) => p.department))].sort(); document.querySelectorAll("[data-overview-category], [data-product-category]").forEach((s) => populateSelect(s, categories)); populateSelect(document.querySelector("[data-overview-department]"), departments); populateSelect(document.querySelector("[data-product-status]"), ["Shrinkflation", "Price Increase Only", "Size Change Only", "Unit Price Increase", "No Major Change"]); document.querySelectorAll(".filter-bar input, .filter-bar select").forEach((el) => el.addEventListener("input", renderInteractive)); }

function renderSummary() { const s = aggregateSummary(state.products); document.querySelector("[data-summary-metrics]").innerHTML = [{label:"Avg. Unit Size Change",value:formatPercentage(s.avgSize),tone:"cool",copy:"Average package-size movement"},{label:"Avg. Shelf Price Change",value:formatPercentage(s.avgPrice),tone:"good",copy:"Shelf-price movement"},{label:"Avg. Price per Unit Change",value:formatPercentage(s.avgUnit),tone:"warn",copy:"Normalized cost movement"},{label:"Products Flagged",value:`${s.flagged}/${state.products.length}`,tone:"warn",copy:"Size down + unit price up"}].map((m)=>`<article class="shrink-metric"><small>${m.label}</small><span class="metric-value ${m.tone}">${m.value}</span><p class="muted">${m.copy}</p></article>`).join(""); }


function renderLiveStatus() {
  const observations = state.products.flatMap((p) => (p.observations || []).map((obs) => ({ ...obs, productId: p.id })));
  const productsWithLive = new Set(observations.map((obs) => obs.productId)).size;
  const dates = uniqueDates(observations);
  const parsed = observations.filter((obs) => (obs.parsedSize || {}).confidence === "parsed").length;
  const unparsed = observations.length - parsed;
  const candidateProducts = state.products.filter((p) => [...(p.observations || []), ...(p.apiMatches || [])].some((obs) => (obs.matchStatus || obs.matchConfidence || "").includes("candidate"))).length;
  const trendReady = state.products.filter((p) => uniqueDates(p.observations || []).length >= 2).length;
  const twoYearCurves = state.products.filter((p) => (p.quarterlyHistory || []).length >= 8).length;
  document.querySelector("[data-live-status]").innerHTML = `<div class="live-status-copy"><p>Live Fry’s/Kroger observations anchor the latest available quarter when present. The two-year curves use mock/interpolated quarterly points where live history is not yet long enough.</p></div><div class="live-status-grid">${[
    ["Products observed", productsWithLive], ["Live records", observations.length], ["Latest observation", dates.at(-1) || "None"], ["Parsed sizes", parsed], ["Needs parsing", unparsed], ["Candidate matches", candidateProducts], ["Trend-ready", trendReady], ["Two-year curves", twoYearCurves]
  ].map(([label, value]) => `<article class="live-stat"><small>${label}</small><strong>${value}</strong></article>`).join("")}</div>`;
}

function initBackToTop() {
  const nav = document.querySelector("#tracker-nav");
  const arrow = document.querySelector(".back-to-top-arrow");
  if (!nav || !arrow) return;
  const setVisible = (visible) => arrow.classList.toggle("is-visible", visible);
  const pastNav = () => window.scrollY > nav.offsetTop + nav.offsetHeight;
  arrow.addEventListener("click", (event) => {
    event.preventDefault();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    nav.scrollIntoView({ behavior, block: "start" });
    history.replaceState(null, "", "#tracker-nav");
  });
  if ("IntersectionObserver" in window) {
    const marker = document.createElement("span");
    marker.className = "tracker-nav-marker";
    marker.setAttribute("aria-hidden", "true");
    nav.before(marker);
    new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && pastNav()), { threshold: 0 }).observe(marker);
    return;
  }
  const update = () => setVisible(pastNav());
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function hydrateProductImages(products) {
  const byName = new Map(products.map((product) => [product.productName, product]));
  document.querySelectorAll("[data-product-image]").forEach((button) => {
    const title = button.closest(".product-card")?.querySelector(".product-heading h3")?.textContent || "Product image";
    const product = byName.get(title);
    const candidates = product ? getProductImageCandidates(product) : [];
    button.dataset.imageTitle = title;
    if (candidates.length) storeImageCandidates(button, candidates);
  });
}

function renderInteractive() { renderOverview(); renderProductTable(); }
function renderOverview() { const category = document.querySelector("[data-overview-category]").value; const department = document.querySelector("[data-overview-department]").value; const flagged = document.querySelector("[data-overview-flagged]").checked; const sort = document.querySelector("[data-overview-sort]").value; const products = sortProducts(state.products.filter((p) => (category === "all" || p.category === category) && (department === "all" || p.department === department) && (!flagged || p.shrinkflationFlag)), sort); document.querySelector("[data-overview-grid]").innerHTML = products.map(renderCard).join(""); hydrateProductImages(products); document.querySelector("[data-overview-empty]").hidden = products.length > 0; }
function renderProductTable() { const search = document.querySelector("[data-product-search]").value.trim().toLowerCase(); const category = document.querySelector("[data-product-category]").value; const status = document.querySelector("[data-product-status]").value; const sort = document.querySelector("[data-product-sort]").value; const products = sortProducts(state.products.filter((p) => (!search || `${p.productName} ${p.brand} ${p.category}`.toLowerCase().includes(search)) && (category === "all" || p.category === category) && (status === "all" || p.status === status)), sort); document.querySelector("[data-product-table]").innerHTML = products.map((p) => `<tr><td><span class="mobile-row-label">Product</span><strong>${p.productName}</strong><br><span class="muted">${p.brand} • ${p.category}</span></td><td><span class="mobile-row-label">Status</span><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td><td><span class="mobile-row-label">Size</span>${p.previousSize} → ${p.currentSize} ${p.unitLabel}<br><span class="muted">${formatPercentage(p.sizeChangePct)}</span></td><td><span class="mobile-row-label">Shelf price</span>${formatCurrency(p.previousPrice)} → ${formatCurrency(p.currentPrice)}<br><span class="muted">${formatPercentage(p.shelfPriceChangePct)}</span></td><td><span class="mobile-row-label">Unit price</span><strong>${formatCurrency(p.currentUnitPrice)}${formatUnitLabel(p)}</strong><br><span class="muted">${formatPercentage(p.unitPriceChangePct)}</span></td><td><span class="mobile-row-label">Trend</span>${sparkline(p.quarterlyHistory.map((q) => q.unitPrice), "var(--orange)")}</td></tr>`).join(""); document.querySelector("[data-product-empty]").hidden = products.length > 0; }

function renderCategories() { const categories = aggregateCategories(state.products); const max = Math.max(...categories.map((c) => c.avgUnit)); document.querySelector("[data-category-grid]").innerHTML = categories.map((c) => { const ratio = c.avgUnit / max; const severity = ratio >= 0.72 ? "high" : ratio >= 0.45 ? "medium" : "low"; return `<article class="category-card severity-${severity}"><h3>${c.category}</h3><p class="muted">${c.flagged} of ${c.products} products flagged</p><div class="signal-track" aria-hidden="true"><div class="signal-window" style="--signal-width:${Math.max(8, ratio * 100)}%; --signal-ratio:${Math.max(0.08, ratio).toFixed(4)}"><div class="signal-gradient"></div></div></div><p><strong>${formatPercentage(c.avgUnit)}</strong> avg unit price change</p><p class="muted">${formatPercentage(c.avgSize)} avg size change • ${severity} relative signal</p></article>`; }).join(""); }
function renderInsights() {
  const grid = document.querySelector("[data-insight-grid]");
  const products = state.products.filter((p) => Number.isFinite(p.unitPriceChangePct));
  if (!products.length) {
    grid.innerHTML = `<article class="insight-card"><p class="eyebrow">Waiting on data</p><h3>Product signals will appear once the tracker data loads.</h3></article>`;
    return;
  }
  const categories = aggregateCategories(products);
  const strongestProduct = [...products].sort((a, b) => b.unitPriceChangePct - a.unitPriceChangePct)[0];
  const strongestCategory = categories[0];
  const shrinkSignals = products.filter((p) => p.currentSize < p.previousSize && p.unitPriceChangePct > THRESHOLDS.meaningful).length;
  const hiddenMovement = products.filter((p) => Math.abs(p.shelfPriceChangePct) < THRESHOLDS.modest && p.unitPriceChangePct > THRESHOLDS.modest).length;
  const liveProducts = products.filter((p) => (p.observations || []).length).length;
  const cards = [
    ["Biggest unit-cost jump", `${strongestProduct.productName} has the strongest unit-price move at ${formatPercentage(strongestProduct.unitPriceChangePct)}.`],
    ["Category pressure", `${strongestCategory.category} leads the category view at ${formatPercentage(strongestCategory.avgUnit)} average unit-price movement.`],
    ["Shrink signals", `${shrinkSignals} of ${products.length} products pair a smaller package with a higher unit price.`],
    ["Hidden movement", `${hiddenMovement} products keep shelf-price movement under ${formatPercentage(THRESHOLDS.modest)} while unit price rises meaningfully.`],
    ["Live coverage", `${liveProducts} of ${products.length} products include Fry’s/Kroger observations anchoring the latest curve.`]
  ];
  grid.innerHTML = cards.map(([label, text]) => `<article class="insight-card"><p class="eyebrow">${label}</p><h3>${text}</h3></article>`).join("");
}

async function loadData() { try { const response = await fetch(DATA_URL); if (!response.ok) throw new Error(`Data request failed: ${response.status}`); const data = await response.json(); state.products = data.products.map(enrichProduct); initImageModal(); initBackToTop(); initControls(); renderSummary(); renderLiveStatus(); renderInteractive(); renderCategories(); renderInsights(); } catch (error) { document.querySelector(".shrink-shell").insertAdjacentHTML("afterbegin", `<p class="data-error">Shrinkflation demo data could not load. If you opened this file directly, run a local static server from the repo root and visit /projects/shrinkflation-tracker.html.</p>`); console.error(error); } }


function initShelfSignal() {
  const signal = document.querySelector("[data-shelf-signal]");
  const trendPath = signal?.querySelector("[data-shelf-trend]");
  const trendArrow = signal?.querySelector("[data-shelf-arrow]");
  if (!signal || !trendPath || !trendArrow) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maxSamples = 72;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const samples = Array.from({ length: maxSamples }, (_, index) =>
    clamp(0.38 + index * 0.0022 + Math.sin(index * 0.38) * 0.035, 0.14, 0.88)
  );
  let lastSampleAt = 0;
  let visible = true;

  const draw = (color) => {
    const step = 350 / (maxSamples - 1);
    const points = samples.map((value, index) => [32 + index * step, 177 - value * 128]);
    trendPath.setAttribute("d", points.map(([x, y], index) =>
      `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
    ).join(" "));
    trendPath.style.stroke = color;
    trendPath.style.color = color;

    const end = points.at(-1);
    const prior = points.at(-4);
    const angle = Math.atan2(end[1] - prior[1], end[0] - prior[0]);
    const size = 9;
    const baseX = end[0] - Math.cos(angle) * size;
    const baseY = end[1] - Math.sin(angle) * size;
    const pointA = [baseX + Math.cos(angle + Math.PI / 2) * size * 0.58, baseY + Math.sin(angle + Math.PI / 2) * size * 0.58];
    const pointB = [baseX + Math.cos(angle - Math.PI / 2) * size * 0.58, baseY + Math.sin(angle - Math.PI / 2) * size * 0.58];
    trendArrow.setAttribute("d", `M${end[0]} ${end[1]}L${pointA[0]} ${pointA[1]}L${pointB[0]} ${pointB[1]}Z`);
    trendArrow.style.fill = color;
  };

  if (reducedMotion) {
    draw("var(--orange)");
    return;
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: "120px 0px" }).observe(signal);
  }

  const frame = (now) => {
    if (visible && !document.hidden && now - lastSampleAt >= 85) {
      const direction = Math.cos((now / 7000) * Math.PI) >= 0 ? 1 : -1;
      const previous = samples.at(-1);
      const wave = Math.sin(now / 480) * 0.0035 + Math.sin(now / 1170) * 0.002;
      samples.push(clamp(previous + direction * 0.0065 + wave, 0.14, 0.88));
      samples.shift();
      draw(direction > 0 ? "var(--orange)" : "var(--green)");
      lastSampleAt = now;
    }
    requestAnimationFrame(frame);
  };

  draw("var(--orange)");
  requestAnimationFrame(frame);
}

initShelfSignal();
loadData();
