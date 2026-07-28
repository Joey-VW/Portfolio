(() => {
  "use strict";

  const state = { data: null };
  const number = new Intl.NumberFormat("en-US");
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const stageLabels = { close: "Opportunity to close", activation: "Close to activation", recognition: "Activation to recognition" };

  function renderFunnel(data) {
    const first = data.funnel[0].count;
    document.querySelector("[data-funnel]").innerHTML = data.funnel.map((item, index) => `
      <article class="funnel-stage" style="--fill:${item.count / first * 100}%">
        <span>${item.stage}</span>
        <strong>${number.format(item.count)}</strong>
        <small>${index === 0 ? "Starting cohort" : `${percent(item.rate)} of prior stage`}</small>
      </article>`).join("");
    document.querySelector("[data-segments]").innerHTML = data.segments.map(item => `
      <tr><th scope="row">${item.segment}</th><td>${number.format(item.opportunities)}</td><td>${number.format(item.won)}</td><td>${number.format(item.activated)}</td><td>${number.format(item.recognized)}</td></tr>
    `).join("");
  }

  function renderStageTimes(data) {
    const maxP90 = Math.max(...Object.values(data.stageTimes).map(item => item.p90));
    document.querySelector("[data-stage-times]").innerHTML = Object.entries(data.stageTimes).map(([key, item]) => `
      <article class="stage-card">
        <span>${stageLabels[key]}</span>
        <strong>${item.median} days</strong>
        <small>${number.format(item.count)} eligible records · ${item.average} day average</small>
        <div class="percentile-track" aria-hidden="true"><i style="width:${item.p90 / maxP90 * 100}%"></i></div>
        <div class="percentile-labels"><span>p75 ${item.p75}d</span><span>p90 ${item.p90}d</span></div>
      </article>`).join("");
    const bottleneck = data.bottleneck;
    document.querySelector("[data-bottleneck]").innerHTML =
      `<strong>${stageLabels[bottleneck.stage]}</strong> is the largest median interval at <strong>${bottleneck.medianDays} days</strong>. ` +
      `The three stage medians total ${bottleneck.totalMedianDays} days for records that reach each eligible cohort.`;
  }

  function renderExceptions(data) {
    const max = Math.max(...data.exceptions.map(item => item.count));
    document.querySelector("[data-exceptions]").innerHTML = data.exceptions.map(item =>
      `<tr><th scope="row">${item.type}</th><td>${number.format(item.count)}</td></tr>`
    ).join("");
    document.querySelector("[data-exception-chart]").innerHTML = data.exceptions.slice(0, 7).map(item => `
      <div class="exception-bar"><span>${item.type}</span><span class="exception-bar-track" aria-hidden="true"><i style="width:${item.count / max * 100}%"></i></span><strong>${item.count}</strong></div>
    `).join("");
  }

  function renderScenario() {
    const input = document.querySelector("[data-reduction]");
    const reduction = Number(input.value);
    const current = state.data.bottleneck.totalMedianDays;
    const activation = state.data.stageTimes.activation.median;
    const applied = Math.min(reduction, activation);
    const scenario = current - applied;
    document.querySelector("[data-reduction-label]").textContent = `${reduction} ${reduction === 1 ? "day" : "days"}`;
    document.querySelector("[data-current-total]").textContent = `${current} days`;
    document.querySelector("[data-scenario-total]").textContent = `${scenario} days`;
    document.querySelector("[data-scenario-copy]").textContent = reduction === 0
      ? "No operational change is applied."
      : `Reducing the median activation interval by ${applied} days lowers the modeled median lifecycle by ${((applied / current) * 100).toFixed(1)}%. Close and recognition remain unchanged.`;
  }

  async function init() {
    try {
      const response = await fetch("/data/quote-to-cash-workflow-audit.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
      state.data = await response.json();
      renderFunnel(state.data);
      renderStageTimes(state.data);
      renderExceptions(state.data);
      renderScenario();
      document.querySelector("[data-reduction]").addEventListener("input", renderScenario);
      document.querySelector("[data-generation-notes]").textContent =
        `Generated with fixed seed ${state.data.meta.seed} across ${number.format(state.data.meta.rules.records)} opportunities. ` +
        `Slow-stage thresholds are ${state.data.meta.rules.slowThresholdDays.close}, ${state.data.meta.rules.slowThresholdDays.activation}, and ${state.data.meta.rules.slowThresholdDays.recognition} days for close, activation, and recognition.`;
    } catch (error) {
      const alert = document.querySelector("[data-error]");
      alert.hidden = false;
      alert.textContent = "The generated audit artifact could not be loaded. The methodology and fictional-data disclosure remain available below.";
      console.error(error);
    }
  }

  init();
})();
