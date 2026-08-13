(() => {
  "use strict";

  const ACTIVE_HELPERS = {
    order: { month: "Order_Month", week: "Order_Week_Start" },
    delivery: { month: "Delivery_Month", week: "Delivery_Week_Start" },
  };
  const state = {
    data: null,
    preset: "balanced",
    dateBasis: "order",
    granularity: "month",
    supplier: "all",
    category: "all",
    rangeStart: null,
    rangeEnd: null,
    chartRange: null,
  };
  const labels = {
    balanced: "Balanced",
    cost: "Cost first",
    reliability: "Reliability first",
    quality: "Quality + compliance",
  };
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("en-US");
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const weekFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const percent = value => value == null ? "Not available" : `${(value * 100).toFixed(1)}%`;
  const displayName = value => value.replaceAll("_", " ");
  const comparable = (items, metric) => items.filter(item => item[metric] != null);
  const bestBy = (items, metric, direction) =>
    comparable(items, metric).sort((a, b) => direction * (a[metric] - b[metric]) || a.name.localeCompare(b.name))[0];
  const activeHelper = () => ACTIVE_HELPERS[state.dateBasis][state.granularity];
  const periodDate = value => new Date(`${value}T00:00:00Z`);
  const periodLabel = value => state.granularity === "month"
    ? monthFormatter.format(periodDate(value))
    : `Week of ${weekFormatter.format(periodDate(value))}`;

  function renderOverview(data) {
    const values = [
      ["Purchase orders", number.format(data.overview.orders)],
      ["Negotiated spend", money.format(data.overview.spend)],
      ["Negotiation savings", percent(data.overview.savingsRate)],
      ["On-time delivery", percent(data.overview.onTimeRate)],
    ];
    document.querySelector("[data-overview]").innerHTML = values
      .map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`)
      .join("");
    const quality = data.quality;
    document.querySelector("[data-quality]").innerHTML = [
      `${number.format(quality.missingDeliveries)} missing deliveries measured`,
      `${number.format(quality.missingDefectCounts)} missing defect counts measured`,
      `${number.format(quality.impossibleDeliverySequences)} impossible delivery quarantined`,
      `${number.format(quality.cancelledOrders + quality.pendingOrders)} pending or cancelled`,
    ].map(value => `<span>${value}</span>`).join("");
  }

  function renderSuppliers() {
    const ranked = [...state.data.suppliers].sort((a, b) =>
      (a.scores[state.preset] == null) - (b.scores[state.preset] == null) ||
      (b.scores[state.preset] ?? 0) - (a.scores[state.preset] ?? 0) ||
      a.name.localeCompare(b.name)
    );
    const winner = ranked.find(supplier => supplier.scores[state.preset] != null);
    const strongestReliability = bestBy(state.data.suppliers, "onTimeRate", -1);
    const strongestQuality = bestBy(state.data.suppliers, "defectRate", 1);
    document.querySelector("[data-supplier-summary]").innerHTML =
      winner && strongestReliability && strongestQuality
        ? `<strong>${displayName(winner.name)}</strong> ranks first under <strong>${labels[state.preset]}</strong> at ${winner.scores[state.preset].toFixed(1)} points. ` +
          `${displayName(strongestReliability.name)} leads on delivery reliability, while ${displayName(strongestQuality.name)} posts the lowest reported defect rate.`
        : "Comparable supplier scoring is unavailable because one or more required KPIs are missing.";
    document.querySelector("[data-suppliers]").innerHTML = ranked.map((supplier, index) => `
      <tr>
        <td><span class="rank-badge">${supplier.scores[state.preset] == null ? "-" : index + 1}</span></td>
        <td><strong>${displayName(supplier.name)}</strong></td>
        <td class="score-cell">${supplier.scores[state.preset] == null
          ? "<strong>Insufficient data</strong>"
          : `<strong>${supplier.scores[state.preset].toFixed(1)}</strong><span class="score-bar" aria-hidden="true"><i style="width:${supplier.scores[state.preset]}%"></i></span>`}</td>
        <td>${percent(supplier.savingsRate)}</td>
        <td>${percent(supplier.onTimeRate)}</td>
        <td>${percent(supplier.defectRate)}</td>
        <td>${percent(supplier.complianceRate)}</td>
      </tr>`).join("");
  }

  function renderCategory(name) {
    const category = state.data.categories.find(item => item.name === name);
    if (!category) return;
    const top = bestBy(category.suppliers, "savingsRate", -1);
    const reliable = bestBy(category.suppliers, "onTimeRate", -1);
    const quality = bestBy(category.suppliers, "defectRate", 1);
    const metricCard = (label, supplier, metric) => supplier
      ? `<article class="category-card"><span>${label}</span><strong>${displayName(supplier.name)}</strong><small>${percent(supplier[metric])}</small></article>`
      : `<article class="category-card"><span>${label}</span><strong>Insufficient data</strong><small>Not available</small></article>`;
    document.querySelector("[data-category-results]").innerHTML = `
      ${metricCard("Strongest negotiated savings", top, "savingsRate")}
      ${metricCard("Highest on-time rate", reliable, "onTimeRate")}
      ${metricCard("Lowest reported defect rate", quality, "defectRate")}`;
    renderTrend(category);
  }

  function renderTrend(category) {
    const series = category.monthly.filter(item => item.onTimeRate != null);
    const values = series.map(item => item.onTimeRate);
    const scope = `${displayName(category.name)} - monthly on-time delivery`;
    document.querySelector("[data-trend-scope]").textContent = scope;
    if (!values.length) {
      document.querySelector("[data-trend]").innerHTML = "<p>No valid delivered orders are available for a monthly reliability trend.</p>";
      return;
    }
    const width = 800, height = 240, pad = 38;
    const points = values.map((value, index) => ({
      x: pad + index * ((width - pad * 2) / Math.max(values.length - 1, 1)),
      y: height - pad - value * (height - pad * 2),
      value,
      month: series[index].month,
    }));
    const labelsToShow = new Set([0, Math.floor(points.length / 2), points.length - 1]);
    document.querySelector("[data-trend]").innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="proc-trend-title proc-trend-desc">
        <title id="proc-trend-title">${scope}</title>
        <desc id="proc-trend-desc">${displayName(category.name)} rates range from ${percent(Math.min(...values))} to ${percent(Math.max(...values))} across ${points.length} months with valid delivered orders.</desc>
        <path class="axis" d="M${pad} ${height - pad}H${width - pad}M${pad} ${pad}V${height - pad}"/>
        <polyline class="line" points="${points.map(point => `${point.x},${point.y}`).join(" ")}"/>
        ${points.map(point => `<circle class="dot" cx="${point.x}" cy="${point.y}" r="3"><title>${point.month}: ${percent(point.value)}</title></circle>`).join("")}
        ${points.filter((_, index) => labelsToShow.has(index)).map(point => `<text x="${point.x}" y="${height - 12}" text-anchor="middle">${point.month}</text>`).join("")}
      </svg>`;
  }

  function filteredTemporalRows(includeRange = true) {
    const helper = activeHelper();
    return state.data.temporalRows.filter(row => {
      const period = row[helper];
      return period
        && (state.supplier === "all" || row.supplier === state.supplier)
        && (state.category === "all" || row.category === state.category)
        && (!includeRange || (period >= state.rangeStart && period <= state.rangeEnd));
    });
  }

  function updateRangeOptions() {
    // Range controls follow the active DATE helper, not the current supplier/category slice.
    // That keeps a selected time window stable when a chart cross-filter is applied or cleared.
    const periods = [...new Set(state.data.temporalRows.map(row => row[activeHelper()]).filter(Boolean))].sort();
    const start = document.querySelector("[data-range-start]");
    const end = document.querySelector("[data-range-end]");
    if (!periods.length) {
      state.rangeStart = null;
      state.rangeEnd = null;
      start.innerHTML = "";
      end.innerHTML = "";
      return;
    }
    state.rangeStart = periods.includes(state.rangeStart) ? state.rangeStart : periods[0];
    state.rangeEnd = periods.includes(state.rangeEnd) ? state.rangeEnd : periods.at(-1);
    if (state.rangeStart > state.rangeEnd) state.rangeEnd = periods.at(-1);
    const options = periods.map(period => `<option value="${period}">${periodLabel(period)}</option>`).join("");
    start.innerHTML = options;
    end.innerHTML = options;
    start.value = state.rangeStart;
    end.value = state.rangeEnd;
  }

  function aggregateTemporalRows(rows) {
    const groups = new Map();
    rows.forEach(row => {
      const period = row[activeHelper()];
      const group = groups.get(period) || { period, orders: 0, spend: 0, projectedSpend: 0, savings: 0, quantity: 0, defectiveUnits: 0, knownDefectRows: 0, leadDays: 0, leadRows: 0, delivered: 0, onTime: 0, compliant: 0 };
      group.orders += 1;
      group.spend += row.spend;
      group.savings += row.savings;
      group.projectedSpend += row.spend + row.savings;
      group.quantity += row.quantity;
      if (row.defectiveUnits != null) {
        group.defectiveUnits += row.defectiveUnits;
        group.knownDefectRows += 1;
      }
      if (row.leadDays != null) {
        group.leadDays += row.leadDays;
        group.leadRows += 1;
      }
      group.delivered += Number(row.delivered);
      group.onTime += Number(row.onTime);
      group.compliant += Number(row.compliant);
      groups.set(period, group);
    });
    return [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  function renderEmptyChart(target) {
    target.innerHTML = "<p class=\"dashboard-empty\">No records match this date range and filter combination.</p>";
  }

  function renderSparkline(target, values) {
    if (!values.length || values.every(value => value == null)) {
      target.innerHTML = "";
      return;
    }
    const width = 180, height = 58, padding = 4;
    const safeValues = values.map(value => value ?? 0);
    const min = Math.min(...safeValues);
    const max = Math.max(...safeValues);
    const spread = max - min || 1;
    const points = safeValues.map((value, index) => {
      const x = padding + index * ((width - padding * 2) / Math.max(safeValues.length - 1, 1));
      const y = height - padding - (value - min) / spread * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");
    target.setAttribute("viewBox", `0 0 ${width} ${height}`);
    target.innerHTML = `<polyline points="${points}"/>`;
  }

  function renderStatusDonut(target, rows) {
    if (!rows.length) {
      renderEmptyChart(target);
      return;
    }
    const colors = ["#5eead4", "#7dd3fc", "#c4b5fd", "#fbbf24"];
    const counts = new Map();
    rows.forEach(row => counts.set(row.orderStatus, (counts.get(row.orderStatus) || 0) + 1));
    const values = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
    let offset = 0;
    const segments = values.map(([status, count], index) => {
      const next = offset + count / rows.length * 100;
      const segment = `${colors[index % colors.length]} ${offset}% ${next}%`;
      offset = next;
      return segment;
    }).join(", ");
    target.innerHTML = `<div class="status-donut" style="--status-segments: ${segments}"><div><strong>${number.format(rows.length)}</strong><span>orders</span></div></div>
      <ul class="dashboard-legend">${values.map(([status, count], index) => `<li><i style="--legend-color:${colors[index % colors.length]}"></i>${status}<strong>${number.format(count)}</strong></li>`).join("")}</ul>`;
  }

  function renderSupplierCategoryChart(target, rows) {
    if (!rows.length) {
      renderEmptyChart(target);
      return;
    }
    const colors = ["#5eead4", "#7dd3fc", "#c4b5fd", "#fbbf24", "#fb7185"];
    const categories = [...new Set(rows.map(row => row.category))].sort();
    const suppliers = [...new Set(rows.map(row => row.supplier))].sort();
    const counts = new Map(suppliers.map(supplier => [supplier, new Map(categories.map(category => [category, 0]))]));
    rows.forEach(row => counts.get(row.supplier).set(row.category, counts.get(row.supplier).get(row.category) + 1));
    const max = Math.max(...suppliers.map(supplier => [...counts.get(supplier).values()].reduce((sum, value) => sum + value, 0)), 1);
    const width = 1040, height = Math.max(400, suppliers.length * 64 + 80), left = 164, right = 84, top = 32, rowHeight = 34;
    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Stacked order counts by supplier and category for the selected filters">
      ${suppliers.map((supplier, rowIndex) => {
        let x = left;
        const y = top + rowIndex * 64;
        const segments = categories.map((category, categoryIndex) => {
          const count = counts.get(supplier).get(category);
          const segmentWidth = count / max * (width - left - right);
          const label = segmentWidth >= 48
            ? `<text class="dashboard-segment-label" x="${x + segmentWidth / 2}" y="${y + 22}" text-anchor="middle">${number.format(count)}</text>`
            : "";
          const rect = count ? `<rect class="supplier-category-segment" x="${x}" y="${y}" width="${segmentWidth}" height="${rowHeight}" rx="5" fill="${colors[categoryIndex % colors.length]}"><title>${displayName(supplier)} - ${category}: ${number.format(count)} orders</title></rect>${label}` : "";
          x += segmentWidth;
          return rect;
        }).join("");
        const total = [...counts.get(supplier).values()].reduce((sum, value) => sum + value, 0);
        const isActive = state.supplier === supplier;
        return `<g class="dashboard-supplier-bar${isActive ? " is-active" : ""}" data-supplier-filter="${supplier}" role="button" tabindex="0" aria-pressed="${isActive}" aria-label="${displayName(supplier)}: ${number.format(total)} orders. Activate to ${isActive ? "clear" : "filter to"} this supplier.">
          <text class="dashboard-supplier-label" x="${left - 16}" y="${y + 23}" text-anchor="end">${displayName(supplier)}</text>${segments}<text class="dashboard-supplier-total" x="${Math.min(x + 12, width - right + 16)}" y="${y + 23}">${number.format(total)}</text></g>`;
      }).join("")}
    </svg><ul class="dashboard-legend category-legend">${categories.map((category, index) => {
      const isActive = state.category === category;
      return `<li><button type="button" class="dashboard-legend-filter${isActive ? " is-active" : ""}" data-category-filter="${category}" aria-pressed="${isActive}"><i style="--legend-color:${colors[index % colors.length]}"></i>${category}</button></li>`;
    }).join("")}</ul>`;
  }

  function renderPurchaseTrends(target, series) {
    if (!series.length) {
      renderEmptyChart(target);
      return;
    }
    const width = 1100, height = 470, pad = { top: 52, right: 90, bottom: 72, left: 96 };
    const maxSpend = Math.max(...series.map(item => Math.max(item.spend, item.projectedSpend)), 1);
    const maxQuantity = Math.max(...series.map(item => item.quantity), 1);
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const step = chartWidth / Math.max(series.length, 1);
    const barWidth = Math.max(3, Math.min(24, step * .58));
    const points = series.map((item, index) => ({
      ...item,
      x: pad.left + step * index + step / 2,
      negotiatedY: height - pad.bottom - item.spend / maxSpend * chartHeight,
      projectedY: height - pad.bottom - item.projectedSpend / maxSpend * chartHeight,
    }));
    const labels = new Set([0, Math.floor((points.length - 1) * .25), Math.floor((points.length - 1) * .5), Math.floor((points.length - 1) * .75), points.length - 1]);
    const gridLines = [0, .25, .5, .75, 1];
    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Purchase trends showing negotiated spend, projected spend, and purchase quantity by ${state.granularity} for the selected ${state.dateBasis} date range">
      <text class="dashboard-axis-title" x="${pad.left}" y="22">Spend (USD)</text>
      <text class="dashboard-axis-title" x="${width - pad.right}" y="22" text-anchor="end">Purchase quantity</text>
      ${gridLines.map(ratio => {
        const y = height - pad.bottom - ratio * chartHeight;
        return `<path class="dashboard-grid-line" d="M${pad.left} ${y}H${width - pad.right}"/><text class="dashboard-y-label" x="${pad.left - 12}" y="${y + 4}" text-anchor="end">${money.format(maxSpend * ratio)}</text><text class="dashboard-y-label" x="${width - pad.right + 12}" y="${y + 4}">${number.format(maxQuantity * ratio)}</text>`;
      }).join("")}
      ${points.map(point => `<g class="dashboard-trend-point" tabindex="0" role="img" aria-label="${periodLabel(point.period)}: actual negotiated spend ${money.format(point.spend)}, projected original spend ${money.format(point.projectedSpend)}, purchase quantity ${number.format(point.quantity)}"><title>${periodLabel(point.period)}\nActual / negotiated spend: ${money.format(point.spend)}\nProjected / original spend: ${money.format(point.projectedSpend)}\nPurchase quantity: ${number.format(point.quantity)}</title><rect class="dashboard-trend-hit" x="${point.x - Math.max(step, 8) / 2}" y="${pad.top}" width="${Math.max(step, 8)}" height="${chartHeight}"/><rect class="dashboard-quantity-bar" x="${point.x - barWidth / 2}" y="${height - pad.bottom - point.quantity / maxQuantity * chartHeight}" width="${barWidth}" height="${point.quantity / maxQuantity * chartHeight}" rx="4"/><circle class="dashboard-dot dashboard-dot-projected" cx="${point.x}" cy="${point.projectedY}" r="4"/><circle class="dashboard-dot" cx="${point.x}" cy="${point.negotiatedY}" r="5"/></g>`).join("")}
      <polyline class="dashboard-line dashboard-line-projected" points="${points.map(point => `${point.x},${point.projectedY}`).join(" ")}"/>
      <polyline class="dashboard-line" points="${points.map(point => `${point.x},${point.negotiatedY}`).join(" ")}"/>
      ${points.filter((_, index) => labels.has(index)).map(point => `<text class="dashboard-x-label" x="${point.x}" y="${height - 28}" text-anchor="middle">${periodLabel(point.period)}</text>`).join("")}
    </svg><ul class="dashboard-legend combo-legend"><li><i class="line-key"></i>Actual / negotiated spend</li><li><i class="line-key projected-key"></i>Projected / original spend</li><li><i class="bar-key"></i>Purchase quantity</li></ul>`;
  }

  function renderDashboard() {
    updateRangeOptions();
    const helper = activeHelper();
    document.querySelector("[data-active-helper]").textContent =
      `Active field: ${helper}. The selected range, KPI callouts, and every dashboard chart use this same ${state.granularity}-level helper.`;
    document.querySelector("[data-purchase-trends-heading]").textContent = `${state.granularity === "week" ? "Weekly" : "Monthly"} purchase trends`;
    document.querySelector("[data-purchase-trends-title]").textContent = `Actual, projected, and quantity by ${state.granularity}`;
    const rows = filteredTemporalRows();
    const leadRows = rows.filter(row => row.leadDays != null);
    const defectRows = rows.filter(row => row.defectiveUnits != null);
    const defectTotal = defectRows.reduce((sum, row) => sum + row.defectiveUnits, 0);
    const unknownDefectRows = rows.length - defectRows.length;
    document.querySelector("[data-dashboard-savings]").textContent = money.format(rows.reduce((sum, row) => sum + row.savings, 0));
    document.querySelector("[data-dashboard-defects]").textContent = number.format(defectTotal);
    document.querySelector("[data-dashboard-defect-note]").textContent = defectRows.length
      ? `Excludes ${number.format(unknownDefectRows)} ${unknownDefectRows === 1 ? "record" : "records"} with unknown counts.`
      : "All selected records have unknown defect counts.";
    document.querySelector("[data-dashboard-lead-time]").textContent = leadRows.length
      ? `${(leadRows.reduce((sum, row) => sum + row.leadDays, 0) / leadRows.length).toFixed(1)} days`
      : "Not available";
    document.querySelector("[data-dashboard-noncompliance]").textContent = rows.length
      ? percent(rows.filter(row => !row.compliant).length / rows.length)
      : "Not available";
    const series = aggregateTemporalRows(rows);
    renderSparkline(document.querySelector('[data-sparkline="savings"]'), series.map(item => item.savings));
    renderSparkline(document.querySelector('[data-sparkline="defects"]'), series.map(item => item.defectiveUnits));
    renderSparkline(document.querySelector('[data-sparkline="leadTime"]'), series.map(item => item.leadRows ? item.leadDays / item.leadRows : null));
    renderSparkline(document.querySelector('[data-sparkline="noncompliance"]'), series.map(item => item.orders ? 1 - item.compliant / item.orders : null));
    renderStatusDonut(document.querySelector("[data-status-donut]"), rows);
    renderSupplierCategoryChart(document.querySelector("[data-supplier-category-chart]"), rows);
    renderPurchaseTrends(document.querySelector("[data-purchase-trends-chart]"), series);
  }

  function bindControls() {
    document.querySelectorAll("[data-preset]").forEach(button => {
      button.addEventListener("click", () => {
        state.preset = button.dataset.preset;
        document.querySelectorAll("[data-preset]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        renderSuppliers();
      });
    });
    const detailSelect = document.querySelector("[data-category-detail]");
    detailSelect.innerHTML = state.data.categories.map(item => `<option value="${item.name}">${item.name}</option>`).join("");
    detailSelect.addEventListener("change", () => renderCategory(detailSelect.value));
    renderCategory(detailSelect.value);

    const suppliers = [...new Set(state.data.temporalRows.map(row => row.supplier))].sort();
    const categories = [...new Set(state.data.temporalRows.map(row => row.category))].sort();
    const supplierSelect = document.querySelector("[data-dashboard-supplier]");
    const categorySelect = document.querySelector("[data-dashboard-category]");
    supplierSelect.innerHTML = `<option value="all">All suppliers</option>${suppliers.map(value => `<option value="${value}">${displayName(value)}</option>`).join("")}`;
    categorySelect.innerHTML = `<option value="all">All categories</option>${categories.map(value => `<option value="${value}">${value}</option>`).join("")}`;
    const syncDashboardFilterControls = () => {
      supplierSelect.value = state.supplier;
      categorySelect.value = state.category;
    };
    const toggleDashboardFilter = (field, value) => {
      const isClearing = state[field] === value;
      if (!isClearing && state.supplier === "all" && state.category === "all") {
        state.chartRange = { start: state.rangeStart, end: state.rangeEnd };
      }
      state[field] = isClearing ? "all" : value;
      if (isClearing && state.supplier === "all" && state.category === "all" && state.chartRange) {
        state.rangeStart = state.chartRange.start;
        state.rangeEnd = state.chartRange.end;
        state.chartRange = null;
      }
      syncDashboardFilterControls();
      renderDashboard();
    };
    const clearChartFilters = () => {
      state.supplier = "all";
      state.category = "all";
      if (state.chartRange) {
        state.rangeStart = state.chartRange.start;
        state.rangeEnd = state.chartRange.end;
      }
      state.chartRange = null;
      syncDashboardFilterControls();
      renderDashboard();
    };
    const resetDashboardFilters = () => {
      state.dateBasis = "order";
      state.granularity = "month";
      state.supplier = "all";
      state.category = "all";
      state.rangeStart = null;
      state.rangeEnd = null;
      state.chartRange = null;
      syncDashboardFilterControls();
      document.querySelectorAll("[data-date-basis]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.dateBasis === state.dateBasis)));
      document.querySelectorAll("[data-granularity]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.granularity === state.granularity)));
      renderDashboard();
    };
    document.querySelectorAll("[data-date-basis]").forEach(button => button.addEventListener("click", () => {
      state.dateBasis = button.dataset.dateBasis;
      document.querySelectorAll("[data-date-basis]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      renderDashboard();
    }));
    document.querySelectorAll("[data-granularity]").forEach(button => button.addEventListener("click", () => {
      state.granularity = button.dataset.granularity;
      document.querySelectorAll("[data-granularity]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      renderDashboard();
    }));
    supplierSelect.addEventListener("change", () => { state.supplier = supplierSelect.value; renderDashboard(); });
    categorySelect.addEventListener("change", () => { state.category = categorySelect.value; renderDashboard(); });
    document.querySelector("[data-range-start]").addEventListener("change", event => {
      state.rangeStart = event.target.value;
      if (state.rangeStart > state.rangeEnd) state.rangeEnd = state.rangeStart;
      renderDashboard();
    });
    document.querySelector("[data-range-end]").addEventListener("change", event => {
      state.rangeEnd = event.target.value;
      if (state.rangeEnd < state.rangeStart) state.rangeStart = state.rangeEnd;
      renderDashboard();
    });
    document.querySelector("[data-dashboard-reset]").addEventListener("click", resetDashboardFilters);
    const supplierCategoryChart = document.querySelector("[data-supplier-category-chart]");
    supplierCategoryChart.addEventListener("click", event => {
      const supplier = event.target.closest("[data-supplier-filter]")?.dataset.supplierFilter;
      const category = event.target.closest("[data-category-filter]")?.dataset.categoryFilter;
      if (supplier) toggleDashboardFilter("supplier", supplier);
      else if (category) toggleDashboardFilter("category", category);
      else if (event.target.matches("svg") && (state.supplier !== "all" || state.category !== "all")) clearChartFilters();
    });
    supplierCategoryChart.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-supplier-filter]")) {
        event.preventDefault();
        toggleDashboardFilter("supplier", event.target.dataset.supplierFilter);
      }
    });
    resetDashboardFilters();
  }

  async function init() {
    try {
      const response = await fetch("/data/procurement-kpi-analysis.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
      state.data = await response.json();
      renderOverview(state.data);
      renderSuppliers();
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
