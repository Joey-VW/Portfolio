(() => {
  "use strict";

  const mobileQuery = window.matchMedia("(max-width: 680px)");
  const supplierTarget = document.querySelector("[data-supplier-category-chart]");
  const trendsTarget = document.querySelector("[data-purchase-trends-chart]");

  if (!supplierTarget || !trendsTarget) return;

  const parseOrders = title => {
    const match = title.match(/:\s*([\d,]+)\s+orders$/i);
    return match ? Number(match[1].replaceAll(",", "")) : 0;
  };

  function enhanceSupplierChart() {
    if (!mobileQuery.matches) return;
    const svg = supplierTarget.querySelector(":scope > svg");
    if (!svg) return;

    const groups = [...svg.querySelectorAll(".dashboard-supplier-bar")];
    if (!groups.length) return;

    const legend = supplierTarget.querySelector(":scope > .dashboard-legend");
    const rows = groups.map(group => {
      const segments = [...group.querySelectorAll(".supplier-category-segment")].map(rect => ({
        count: parseOrders(rect.querySelector("title")?.textContent || ""),
        color: rect.getAttribute("fill") || "#5eead4",
      })).filter(segment => segment.count > 0);
      const total = segments.reduce((sum, segment) => sum + segment.count, 0);
      return {
        supplier: group.dataset.supplierFilter,
        label: group.querySelector(".dashboard-supplier-label")?.textContent?.trim() || group.dataset.supplierFilter,
        total,
        segments,
        active: group.classList.contains("is-active"),
      };
    });

    const maxTotal = Math.max(...rows.map(row => row.total), 1);
    const mobile = `<div class="mobile-supplier-chart" aria-label="Orders by supplier and category">
      ${rows.map(row => `<button type="button" class="mobile-supplier-row${row.active ? " is-active" : ""}" data-supplier-filter="${row.supplier}" aria-pressed="${row.active}">
        <span class="mobile-supplier-label"><span>${row.label}</span><strong>${row.total}</strong></span>
        <span class="mobile-supplier-track-shell" aria-hidden="true"><span class="mobile-supplier-track" style="width:${row.total / maxTotal * 100}%">${row.segments.map(segment => `<i class="mobile-supplier-segment" style="flex:${segment.count};background:${segment.color}"></i>`).join("")}</span></span>
      </button>`).join("")}
    </div>`;

    supplierTarget.innerHTML = `${mobile}${legend ? legend.outerHTML : ""}`;
  }

  function enhanceTrendsChart() {
    if (!mobileQuery.matches) return;
    const svg = trendsTarget.querySelector(":scope > svg");
    if (!svg || svg.classList.contains("mobile-trend-spark")) return;

    const points = [...svg.querySelectorAll(".dashboard-trend-point")].map(group => {
      const label = group.getAttribute("aria-label") || "";
      const match = label.match(/^(.*?): actual negotiated spend (.*?), projected original spend (.*?), purchase quantity (.*)$/);
      return match ? { period: match[1], actual: match[2], projected: match[3], quantity: match[4] } : null;
    }).filter(Boolean);
    if (!points.length) return;

    const actualLine = svg.querySelector(".dashboard-line:not(.dashboard-line-projected)");
    const projectedLine = svg.querySelector(".dashboard-line-projected");
    const bars = [...svg.querySelectorAll(".dashboard-quantity-bar")];
    const legend = trendsTarget.querySelector(":scope > .dashboard-legend");

    trendsTarget.innerHTML = `<div class="mobile-trend-summary">
      <svg class="mobile-trend-spark" viewBox="96 52 914 346" preserveAspectRatio="none" role="img" aria-label="Compact purchase trend overview">
        ${bars.map(bar => bar.outerHTML).join("")}
        ${projectedLine ? projectedLine.outerHTML : ""}
        ${actualLine ? actualLine.outerHTML : ""}
      </svg>
      <div class="mobile-trend-periods" aria-label="Swipe for period details">
        ${points.map(point => `<article class="mobile-trend-period"><strong>${point.period}</strong><span>Negotiated ${point.actual}</span><span>Original ${point.projected}</span><span>Quantity ${point.quantity}</span></article>`).join("")}
      </div>
    </div>${legend ? legend.outerHTML : ""}`;
  }

  const enhance = () => {
    enhanceSupplierChart();
    enhanceTrendsChart();
  };

  const observer = new MutationObserver(() => {
    if (!mobileQuery.matches) return;
    requestAnimationFrame(enhance);
  });

  observer.observe(supplierTarget, { childList: true });
  observer.observe(trendsTarget, { childList: true });

  mobileQuery.addEventListener("change", event => {
    if (event.matches) requestAnimationFrame(enhance);
    else window.location.reload();
  });

  enhance();
})();
