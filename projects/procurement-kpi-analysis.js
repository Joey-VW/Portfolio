(() => {
  "use strict";

  const state = { data: null, preset: "balanced" };
  const labels = {
    balanced: "Balanced",
    cost: "Cost first",
    reliability: "Reliability first",
    quality: "Quality + compliance"
  };
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("en-US");
  const percent = value => value == null ? "Not available" : `${(value * 100).toFixed(1)}%`;
  const displayName = value => value.replaceAll("_", " ");

  function renderOverview(data) {
    const values = [
      ["Purchase orders", number.format(data.overview.orders)],
      ["Negotiated spend", money.format(data.overview.spend)],
      ["Negotiation savings", percent(data.overview.savingsRate)],
      ["On-time delivery", percent(data.overview.onTimeRate)]
    ];
    document.querySelector("[data-overview]").innerHTML = values
      .map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`)
      .join("");
    const quality = data.quality;
    document.querySelector("[data-quality]").innerHTML = [
      `${number.format(quality.missingDeliveries)} missing deliveries measured`,
      `${number.format(quality.missingDefectCounts)} missing defect counts measured`,
      `${number.format(quality.impossibleDeliverySequences)} impossible delivery quarantined`,
      `${number.format(quality.cancelledOrders + quality.pendingOrders)} pending or cancelled`
    ].map(value => `<span>${value}</span>`).join("");
  }

  function renderSuppliers() {
    const ranked = [...state.data.suppliers].sort((a, b) =>
      b.scores[state.preset] - a.scores[state.preset] || a.name.localeCompare(b.name)
    );
    const winner = ranked[0];
    const strongestReliability = [...state.data.suppliers].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    const strongestQuality = [...state.data.suppliers].sort((a, b) => a.defectRate - b.defectRate)[0];
    document.querySelector("[data-supplier-summary]").innerHTML =
      `<strong>${displayName(winner.name)}</strong> ranks first under <strong>${labels[state.preset]}</strong> at ${winner.scores[state.preset].toFixed(1)} points. ` +
      `${displayName(strongestReliability.name)} leads on delivery reliability, while ${displayName(strongestQuality.name)} posts the lowest reported defect rate.`;
    document.querySelector("[data-suppliers]").innerHTML = ranked.map((supplier, index) => `
      <tr>
        <td><span class="rank-badge">${index + 1}</span></td>
        <td><strong>${displayName(supplier.name)}</strong></td>
        <td class="score-cell"><strong>${supplier.scores[state.preset].toFixed(1)}</strong><span class="score-bar" aria-hidden="true"><i style="width:${supplier.scores[state.preset]}%"></i></span></td>
        <td>${percent(supplier.savingsRate)}</td>
        <td>${percent(supplier.onTimeRate)}</td>
        <td>${percent(supplier.defectRate)}</td>
        <td>${percent(supplier.complianceRate)}</td>
      </tr>`).join("");
  }

  function renderCategory(name) {
    const category = state.data.categories.find(item => item.name === name);
    if (!category) return;
    const top = [...category.suppliers].sort((a, b) => b.savingsRate - a.savingsRate)[0];
    const reliable = [...category.suppliers].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    const quality = [...category.suppliers].sort((a, b) => a.defectRate - b.defectRate)[0];
    document.querySelector("[data-category-results]").innerHTML = `
      <article class="category-card"><span>Strongest negotiated savings</span><strong>${displayName(top.name)}</strong><small>${percent(top.savingsRate)}</small></article>
      <article class="category-card"><span>Highest on-time rate</span><strong>${displayName(reliable.name)}</strong><small>${percent(reliable.onTimeRate)}</small></article>
      <article class="category-card"><span>Lowest reported defect rate</span><strong>${displayName(quality.name)}</strong><small>${percent(quality.defectRate)}</small></article>`;
  }

  function renderTrend(data) {
    const values = data.monthly.map(item => item.onTimeRate || 0);
    const width = 800, height = 240, pad = 38;
    const points = values.map((value, index) => {
      const x = pad + index * ((width - pad * 2) / Math.max(values.length - 1, 1));
      const y = height - pad - value * (height - pad * 2);
      return { x, y, value, month: data.monthly[index].month };
    });
    const labelsToShow = new Set([0, Math.floor(points.length / 2), points.length - 1]);
    document.querySelector("[data-trend]").innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="proc-trend-title proc-trend-desc">
        <title id="proc-trend-title">Monthly on-time delivery rate</title>
        <desc id="proc-trend-desc">Rates range from ${percent(Math.min(...values))} to ${percent(Math.max(...values))} across ${points.length} months.</desc>
        <path class="axis" d="M${pad} ${height - pad}H${width - pad}M${pad} ${pad}V${height - pad}"/>
        <polyline class="line" points="${points.map(point => `${point.x},${point.y}`).join(" ")}"/>
        ${points.map(point => `<circle class="dot" cx="${point.x}" cy="${point.y}" r="3"><title>${point.month}: ${percent(point.value)}</title></circle>`).join("")}
        ${points.filter((_, index) => labelsToShow.has(index)).map(point => `<text x="${point.x}" y="${height - 12}" text-anchor="middle">${point.month}</text>`).join("")}
      </svg>`;
  }

  function bindControls() {
    document.querySelectorAll("[data-preset]").forEach(button => {
      button.addEventListener("click", () => {
        state.preset = button.dataset.preset;
        document.querySelectorAll("[data-preset]").forEach(item =>
          item.setAttribute("aria-pressed", String(item === button))
        );
        renderSuppliers();
      });
    });
    const select = document.querySelector("[data-category]");
    select.innerHTML = state.data.categories.map(item => `<option value="${item.name}">${item.name}</option>`).join("");
    select.addEventListener("change", () => renderCategory(select.value));
    renderCategory(select.value);
  }

  async function init() {
    try {
      const response = await fetch("/data/procurement-kpi-analysis.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
      state.data = await response.json();
      renderOverview(state.data);
      renderSuppliers();
      renderTrend(state.data);
      bindControls();
      const source = state.data.meta.source;
      document.querySelector("[data-provenance]").textContent =
        `${number.format(source.rows)} rows retrieved ${source.retrieved} from ${source.publisher}; ${source.coverage}; ${source.licenseClaim}. SHA-256 ${source.sha256}.`;
    } catch (error) {
      const alert = document.querySelector("[data-error]");
      alert.hidden = false;
      alert.textContent = "The procurement artifact could not be loaded. The methodology and limitations remain available below.";
      console.error(error);
    }
  }

  init();
})();
