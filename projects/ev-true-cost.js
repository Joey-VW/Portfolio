(() => {
  const DATA_URL = '/data/ev-true-cost.json';
  const BENCHMARK_POSITION = 70;
  const GUIDED_AUTOPLAY_MS = 7000;
  const GUIDED_MANUAL_HOLD_MS = 60000;
  const GUIDED_TWEEN_MS = 650;
  const CUSTOM_TWEEN_MS = 320;
  const TEXT_FADE_MS = 170;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const wholeMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const cpm = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const rate4 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const groupedInteger = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const decimal = (digits) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const flexibleOne = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const state = {
    data: null,
    guided: { activePreset: 'public-now', values: {}, visible: false, nearViewport: false, timer: null, holdTimer: null, holdUntil: 0, previousResults: null, textTimers: [], tweens: [], presetButtons: [], progressFrame: null },
    custom: { values: {}, lastValid: {}, previousResults: null, tweens: [] }
  };
  const controls = [
    ['annualMiles', 'Annual miles', 3000, 30000, 500, { suffix: 'mi/year', inputmode: 'numeric', format: (v) => groupedInteger.format(v), edit: (v) => String(Math.round(v)) }],
    ['iceMpg', 'Gasoline MPG', 10, 50, 0.1, { suffix: 'MPG', inputmode: 'decimal', format: (v) => flexibleOne.format(v), edit: String }],
    ['gasPricePerGallonUsd', 'Gas price per gallon', 1, 8, 0.01, { prefix: '$', suffix: '/gal', inputmode: 'decimal', format: (v) => decimal(2).format(v), edit: (v) => Number(v).toFixed(2) }],
    ['evKwhPer100Miles', 'EV kWh per 100 miles', 20, 60, 0.1, { suffix: 'kWh/100 mi', inputmode: 'decimal', format: (v) => flexibleOne.format(v), edit: String }],
    ['homeRatePerKwhUsd', 'Home electricity rate', 0.05, 0.6, 0.001, { prefix: '$', suffix: '/kWh', inputmode: 'decimal', format: (v) => decimal(3).format(v), edit: (v) => Number(v).toFixed(3) }],
    ['publicRatePerKwhUsd', 'Public electricity rate', 0.05, 1.5, 0.001, { prefix: '$', suffix: '/kWh', inputmode: 'decimal', format: (v) => decimal(4).format(v), edit: (v) => String(v) }],
    ['homeChargingSharePct', 'Home-charging share', 0, 100, 1, { suffix: '%', inputmode: 'numeric', format: (v) => groupedInteger.format(v), edit: (v) => String(Math.round(v)) }],
    ['homeChargerInstalledCostUsd', 'Installed home-charger cost', 0, 6000, 50, { prefix: '$', inputmode: 'numeric', format: (v) => groupedInteger.format(v), edit: (v) => String(Math.round(v)) }]
  ];
  const controlMap = Object.fromEntries(controls.map((c) => [c[0], c]));

  function publicRate() { const s = state.data.charging.confirmedSessions[0]; return s.totalPaidUsd / s.energyDeliveredKwh; }
  function preset(id = state.guided.activePreset) { return state.data.presets.find((p) => p.id === id) || state.data.presets[0]; }
  function inputMeta(key) {
    const { inputs, vehicles, charging } = state.data;
    if (key === 'iceMpg') return { value: vehicles.iceBaseline.combinedMpg, unit: 'MPG', provenance: vehicles.iceBaseline.provenance };
    if (key === 'publicRatePerKwhUsd') return { value: publicRate(), unit: 'USD/kWh', provenance: charging.confirmedSessions[0].provenance };
    if (key === 'homeChargingSharePct') return { value: state.data.presets[0].homeChargingSharePct, unit: 'percent', provenance: 'mock' };
    return inputs[key];
  }
  function baseValues(homeChargingSharePct = state.data.presets[0].homeChargingSharePct) {
    const values = {};
    controls.forEach(([key]) => { values[key] = key === 'homeChargingSharePct' ? homeChargingSharePct : inputMeta(key).value; });
    return values;
  }
  function resetGuidedValues() { state.guided.values = baseValues(preset().homeChargingSharePct); }
  function resetCustomValues() { state.custom.values = baseValues(state.data.presets[0].homeChargingSharePct); state.custom.lastValid = { ...state.custom.values }; }
  function calculate(values) {
    const annualMiles = values.annualMiles;
    const iceAnnualEnergyCost = annualMiles / values.iceMpg * values.gasPricePerGallonUsd;
    const iceCostPerMile = iceAnnualEnergyCost / annualMiles;
    const evAnnualKwh = annualMiles * values.evKwhPer100Miles / 100;
    const homeShare = values.homeChargingSharePct / 100;
    const blendedElectricRate = homeShare * values.homeRatePerKwhUsd + (1 - homeShare) * values.publicRatePerKwhUsd;
    const evAnnualEnergyCost = evAnnualKwh * blendedElectricRate;
    const evCostPerMile = evAnnualEnergyCost / annualMiles;
    const annualSavings = iceAnnualEnergyCost - evAnnualEnergyCost;
    const publicOnlyAnnualCost = evAnnualKwh * values.publicRatePerKwhUsd;
    const annualChargingSavings = publicOnlyAnnualCost - evAnnualEnergyCost;
    const paybackMonths = values.homeChargerInstalledCostUsd > 0 && homeShare > 0 && annualChargingSavings > 0 ? values.homeChargerInstalledCostUsd / annualChargingSavings * 12 : null;
    return { iceAnnualEnergyCost, iceCostPerMile, evAnnualEnergyCost, evCostPerMile, annualSavings, blendedElectricRate, paybackMonths };
  }
  function verdictFor(results, values) {
    const monthly = Math.abs(results.annualSavings) / 12;
    if (!Number.isFinite(results.annualSavings) || monthly < 0.5) return { headline: 'The two are roughly even on energy cost.', body: 'With the current inputs, the EV9 and Pilot benchmark land close together.', payback: '' };
    if (results.annualSavings < 0) return { headline: `Public charging is about ${wholeMoney.format(monthly)} more per month.`, body: 'At the confirmed public rate, this model puts the EV9 above the Pilot\'s fuel cost. Fast charging is convenient, but it is not the money-saving setup.', payback: '' };
    if (values.homeChargingSharePct >= 99.5) return { headline: `Home charging saves about ${wholeMoney.format(monthly)} per month.`, body: `At the temporary home rate, the model estimates ${wholeMoney.format(results.annualSavings)} saved per year.`, payback: results.paybackMonths && Number.isFinite(results.paybackMonths) && results.paybackMonths > 0 ? `A ${wholeMoney.format(values.homeChargerInstalledCostUsd)} installation could pay back in about ${results.paybackMonths.toFixed(1)} months compared with staying public-only.` : '' };
    return { headline: `Mostly-home charging saves about ${wholeMoney.format(monthly)} per month.`, body: `Moving most charging home flips the result. The model estimates ${wholeMoney.format(results.annualSavings)} saved per year versus the Pilot benchmark.`, payback: '' };
  }
  const provenanceLabels = { confirmed: 'C', userReported: 'R', benchmark: 'B', mock: 'E', planned: 'P' };
  const provenanceNames = { confirmed: 'Confirmed', userReported: 'Reported', benchmark: 'Benchmark', mock: 'Estimate', planned: 'Planned' };
  const controlLabels = {
    annualMiles: 'Annual miles',
    iceMpg: 'Gas mileage',
    gasPricePerGallonUsd: 'Gas price',
    evKwhPer100Miles: 'EV efficiency',
    homeRatePerKwhUsd: 'Home rate',
    publicRatePerKwhUsd: 'Public rate',
    homeChargingSharePct: 'Home charging',
    homeChargerInstalledCostUsd: 'Charger installation'
  };
  function labelProvenance(key) { return state.data.provenanceLevels[key] ? key : 'mock'; }
  function provenanceText(key) { return provenanceLabels[key] || '?'; }
  function provenanceName(key) { return provenanceNames[key] || key; }
  function hideCustomSourceChip(key) { const chip = document.querySelector(`[data-source-chip="${key}"]`); if (chip) chip.hidden = true; }
  function showCustomSourceChips() { document.querySelectorAll('[data-source-chip]').forEach((chip) => { chip.hidden = false; }); }
  function parseInput(value) { if (typeof value !== 'string') return NaN; const normalized = value.replace(/,/g, '').trim(); return normalized ? Number(normalized) : NaN; }
  function decimalsForStep(step) { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; }
  function clampAndStep(value, min, max, step) { const clamped = Math.min(max, Math.max(min, value)); const stepped = min + Math.round((clamped - min) / step) * step; return Number(Math.min(max, Math.max(min, stepped)).toFixed(decimalsForStep(step))); }
  function formatControlValue(key, editing = false) { const [, , , , , cfg] = controlMap[key]; return (editing ? cfg.edit : cfg.format)(state.custom.values[key]); }
  function safeWidth(value) { return `${Math.min(100, Math.max(3, Number.isFinite(value) ? value : 0)).toFixed(3)}%`; }
  function evWidth(results) { return Number.isFinite(results.iceCostPerMile) && results.iceCostPerMile > 0 ? BENCHMARK_POSITION * (results.evCostPerMile / results.iceCostPerMile) : 0; }
  function shouldReduceMotion() { return prefersReducedMotion.matches; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function cancelTweens(bucket) { bucket.forEach((id) => cancelAnimationFrame(id)); bucket.length = 0; }
  function setText(el, value) { if (el) el.textContent = value; }
  function fadeText(el, value, bucket) {
    if (!el || el.textContent === value) return;
    if (shouldReduceMotion()) { el.textContent = value; return; }
    el.classList.add('is-fading');
    const out = window.setTimeout(() => { el.textContent = value; el.classList.remove('is-fading'); }, TEXT_FADE_MS);
    bucket.push(out);
  }
  function tweenNumber(el, from, to, format, duration, bucket) {
    if (!el) return;
    if (!Number.isFinite(to) || !Number.isFinite(from) || Math.abs(from - to) < 0.00001 || shouldReduceMotion()) { el.textContent = format(to); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const value = from + (to - from) * easeOutCubic(progress);
      el.textContent = format(value);
      if (progress < 1) bucket.push(requestAnimationFrame(step)); else el.textContent = format(to);
    };
    bucket.push(requestAnimationFrame(step));
  }
  function moneyYear(v) { return `${money.format(v)}/year`; }
  function costMile(v) { return `${cpm.format(v)}/mile`; }
  function diffText(v) { return v >= 0 ? `${money.format(v)} saved` : `${money.format(Math.abs(v))} more`; }
  function paybackText(v) { return v && Number.isFinite(v) && v > 0 ? `${v.toFixed(1)} months` : 'Not applicable yet'; }
  function rateText(v) { return `${money.format(v)}/kWh`; }

  function renderPresets() {
    const row = $('[data-presets]');
    row.innerHTML = state.data.presets.map((p) => `<button type="button" data-preset="${p.id}" aria-pressed="false"><span class="preset-progress" aria-hidden="true"></span><span class="preset-copy"><strong>${p.label}</strong><small>${p.description}</small></span></button>`).join('');
    state.guided.presetButtons = Array.from(row.querySelectorAll('[data-preset]'));
    state.guided.presetButtons.forEach((button) => button.addEventListener('click', () => selectGuidedPreset(button.dataset.preset, { manual: true })));
    updatePresetButtons();
  }
  function activePresetButton() { return state.guided.presetButtons.find((button) => button.dataset.preset === state.guided.activePreset); }
  function updatePresetButtons({ progress = false, duration = GUIDED_AUTOPLAY_MS } = {}) {
    state.guided.presetButtons.forEach((button) => {
      const active = button.dataset.preset === state.guided.activePreset;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('is-active', active);
      button.classList.toggle('is-progressing', active && progress);
      button.style.setProperty('--preset-progress-duration', `${duration}ms`);
      const fill = button.querySelector('.preset-progress');
      if (fill && (!active || !progress)) resetPresetFill(fill);
    });
  }
  function resetPresetFill(fill) {
    fill.style.transition = 'none';
    fill.style.transform = 'scaleX(0)';
    fill.offsetHeight;
    fill.style.transition = '';
  }
  function stopPresetProgress() {
    if (state.guided.progressFrame) { cancelAnimationFrame(state.guided.progressFrame); state.guided.progressFrame = null; }
    updatePresetButtons({ progress: false });
  }
  function startPresetProgress(duration = GUIDED_AUTOPLAY_MS) {
    stopPresetProgress();
    if (shouldReduceMotion()) return;
    const button = activePresetButton(); if (!button) return;
    const fill = button.querySelector('.preset-progress'); if (!fill) return;
    resetPresetFill(fill);
    updatePresetButtons({ progress: true, duration });
    state.guided.progressFrame = requestAnimationFrame(() => {
      state.guided.progressFrame = null;
      fill.style.transform = 'scaleX(1)';
    });
  }
  function renderForm() {
    const groups = [['Driving & gasoline', ['annualMiles', 'iceMpg', 'gasPricePerGallonUsd']], ['EV charging', ['evKwhPer100Miles', 'homeRatePerKwhUsd', 'publicRatePerKwhUsd', 'homeChargingSharePct', 'homeChargerInstalledCostUsd']]];
    const renderControl = (key) => {
      const [, fullLabel, min, max, step, cfg] = controlMap[key];
      const meta = inputMeta(key);
      const prov = labelProvenance(meta.provenance);
      const help = `${key}-help`;
      const label = controlLabels[key] || fullLabel;
      const range = !cfg.suffix ? `<span class="input-note" id="${help}">${cfg.prefix || ''}${groupedInteger.format(min)}–${cfg.prefix || ''}${groupedInteger.format(max)}</span>` : '';
      const sourceDescription = `${provenanceName(prov)}: ${state.data.provenanceLevels[prov]}`;
      return `<div class="control-row"><div class="control-meta"><label class="control-label" for="${key}">${label}</label><span class="source-chip ${prov}" data-source-chip="${key}" title="${sourceDescription}" aria-label="${sourceDescription}">${provenanceText(prov)}</span>${range}</div><span class="input-wrap">${cfg.prefix ? `<span class="input-prefix" aria-hidden="true">${cfg.prefix}</span>` : ''}<input id="${key}" name="${key}" type="text" inputmode="${cfg.inputmode}" autocomplete="off" aria-label="${fullLabel}" aria-describedby="${help}" data-min="${min}" data-max="${max}" data-step="${step}" value="${formatControlValue(key)}" />${cfg.suffix ? `<span class="input-suffix" id="${help}">${cfg.suffix}</span>` : ''}</span></div>`;
    };
    $('[data-form]').innerHTML = groups.map(([legend, keys]) => `<fieldset><legend>${legend}</legend><div class="input-group">${keys.map(renderControl).join('')}</div></fieldset>`).join('');
  }
  function syncControls(skip) { controls.forEach(([key]) => { if (key !== skip) { const el = document.getElementById(key); if (el) el.value = formatControlValue(key); } }); }

  function renderGuidedResults(animate = true) {
    const next = calculate(state.guided.values); const prev = state.guided.previousResults || next; const bucket = state.guided.tweens; cancelTweens(bucket); state.guided.textTimers.forEach(clearTimeout); state.guided.textTimers.length = 0;
    $('[data-guided-ice-cpm]').textContent = costMile(next.iceCostPerMile); $('[data-guided-ice-annual]').textContent = moneyYear(next.iceAnnualEnergyCost); $('[data-guided-ice-bar]').style.width = `${BENCHMARK_POSITION}%`;
    const duration = animate ? GUIDED_TWEEN_MS : 0;
    tweenNumber($('[data-guided-ev-cpm]'), prev.evCostPerMile, next.evCostPerMile, costMile, duration, bucket);
    tweenNumber($('[data-guided-ev-annual]'), prev.evAnnualEnergyCost, next.evAnnualEnergyCost, moneyYear, duration, bucket);
    tweenNumber($('[data-guided-difference]'), prev.annualSavings, next.annualSavings, diffText, duration, bucket);
    if (prev.paybackMonths && next.paybackMonths) tweenNumber($('[data-guided-payback]'), prev.paybackMonths, next.paybackMonths, paybackText, duration, bucket); else fadeText($('[data-guided-payback]'), paybackText(next.paybackMonths), state.guided.textTimers);
    tweenNumber($('[data-guided-rate]'), prev.blendedElectricRate, next.blendedElectricRate, rateText, duration, bucket);
    fadeText($('[data-guided-ev-label]'), preset().label, state.guided.textTimers);
    $('[data-guided-ev-bar]').style.width = safeWidth(evWidth(next));
    const v = verdictFor(next, state.guided.values); fadeText($('[data-guided-verdict-headline]'), v.headline, state.guided.textTimers); fadeText($('[data-guided-verdict-body]'), v.body, state.guided.textTimers);
    const payback = $('[data-guided-verdict-payback]'); if (v.payback) { payback.hidden = false; fadeText(payback, v.payback, state.guided.textTimers); } else { fadeText(payback, '', state.guided.textTimers); payback.hidden = true; }
    state.guided.previousResults = next;
  }
  function renderCustomResults(animate = true) {
    const next = calculate(state.custom.values); const prev = state.custom.previousResults || next; const bucket = state.custom.tweens; cancelTweens(bucket);
    $('[data-custom-ice-cpm]').textContent = costMile(next.iceCostPerMile); $('[data-custom-ice-annual]').textContent = moneyYear(next.iceAnnualEnergyCost); $('[data-custom-ice-bar]').style.width = `${BENCHMARK_POSITION}%`;
    const duration = animate ? CUSTOM_TWEEN_MS : 0;
    tweenNumber($('[data-custom-ev-cpm]'), prev.evCostPerMile, next.evCostPerMile, costMile, duration, bucket);
    tweenNumber($('[data-custom-ev-annual]'), prev.evAnnualEnergyCost, next.evAnnualEnergyCost, moneyYear, duration, bucket);
    tweenNumber($('[data-custom-difference]'), prev.annualSavings, next.annualSavings, diffText, duration, bucket);
    tweenNumber($('[data-custom-rate]'), prev.blendedElectricRate, next.blendedElectricRate, rateText, duration, bucket);
    if (prev.paybackMonths && next.paybackMonths) tweenNumber($('[data-custom-payback]'), prev.paybackMonths, next.paybackMonths, paybackText, duration, bucket); else setText($('[data-custom-payback]'), paybackText(next.paybackMonths));
    $('[data-custom-ev-bar]').style.width = safeWidth(evWidth(next));
    const v = verdictFor(next, state.custom.values); setText($('[data-custom-verdict-headline]'), v.headline); setText($('[data-custom-verdict-body]'), v.body); const payback = $('[data-custom-verdict-payback]'); payback.hidden = !v.payback; payback.textContent = v.payback;
    state.custom.previousResults = next;
  }
  function selectGuidedPreset(id, { manual = false } = {}) {
    const changed = id !== state.guided.activePreset;
    state.guided.activePreset = id; state.guided.values = { ...state.guided.values, homeChargingSharePct: preset(id).homeChargingSharePct };
    if (manual) { state.guided.holdUntil = Date.now() + GUIDED_MANUAL_HOLD_MS; stopGuidedTimer(); stopPresetProgress(); }
    updatePresetButtons();
    if (changed) renderGuidedResults(true);
    scheduleGuidedAutoplay({ force: !manual });
  }
  function nextGuidedPreset() { const idx = state.data.presets.findIndex((p) => p.id === state.guided.activePreset); return state.data.presets[(idx + 1) % state.data.presets.length].id; }
  function stopGuidedTimer() { if (state.guided.timer) { clearTimeout(state.guided.timer); state.guided.timer = null; } }
  function clearHoldTimer() { if (state.guided.holdTimer) { clearTimeout(state.guided.holdTimer); state.guided.holdTimer = null; } }
  function releaseGuidedHold() { state.guided.holdUntil = 0; clearHoldTimer(); scheduleGuidedAutoplay(); }
  function scheduleGuidedAutoplay({ force = false } = {}) {
    clearHoldTimer();
    if (shouldReduceMotion() || !state.guided.visible || document.hidden) { stopGuidedTimer(); stopPresetProgress(); return; }
    const remainingHold = state.guided.holdUntil - Date.now();
    if (remainingHold > 0) { stopGuidedTimer(); stopPresetProgress(); state.guided.holdTimer = setTimeout(releaseGuidedHold, remainingHold); return; }
    if (state.guided.timer && !force) return;
    stopGuidedTimer();
    startPresetProgress(GUIDED_AUTOPLAY_MS);
    state.guided.timer = setTimeout(() => selectGuidedPreset(nextGuidedPreset(), { manual: false }), GUIDED_AUTOPLAY_MS);
  }
  function initGuidedVisibility() {
    const section = $('#comparison'); if (!section) return;
    const update = () => { const rect = section.getBoundingClientRect(); const vh = window.innerHeight || document.documentElement.clientHeight; const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0); const ratio = Math.max(0, visible) / Math.max(1, Math.min(rect.height, vh)); state.guided.visible = ratio >= 0.3; state.guided.nearViewport = rect.bottom >= -vh * 0.35 && rect.top <= vh * 1.35; if (!state.guided.nearViewport && Date.now() < state.guided.holdUntil) releaseGuidedHold(); scheduleGuidedAutoplay(); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { state.guided.visible = entry.intersectionRatio >= 0.3; scheduleGuidedAutoplay(); }, { threshold: [0, 0.3, 1] }).observe(section);
      new IntersectionObserver(([entry]) => { state.guided.nearViewport = entry.isIntersecting; if (!entry.isIntersecting && Date.now() < state.guided.holdUntil) releaseGuidedHold(); scheduleGuidedAutoplay(); }, { rootMargin: '35% 0px 35% 0px', threshold: 0 }).observe(section);
    } else { update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); }
    document.addEventListener('visibilitychange', () => scheduleGuidedAutoplay({ force: true })); const motionChange = () => { if (shouldReduceMotion()) { stopGuidedTimer(); stopPresetProgress(); } else scheduleGuidedAutoplay({ force: true }); }; if (prefersReducedMotion.addEventListener) prefersReducedMotion.addEventListener('change', motionChange); else prefersReducedMotion.addListener(motionChange);
  }
  function commitInput(input, fallback = true) { const [key, , min, max, step] = controlMap[input.name]; const parsed = parseInput(input.value); if (Number.isFinite(parsed)) { state.custom.values[key] = clampAndStep(parsed, min, max, step); state.custom.lastValid[key] = state.custom.values[key]; hideCustomSourceChip(key); } else if (fallback) { state.custom.values[key] = state.custom.lastValid[key]; } input.value = formatControlValue(key); renderCustomResults(true); }
  function initFormEvents() {
    $('[data-form]').addEventListener('focusin', (event) => { if (event.target.name) event.target.value = formatControlValue(event.target.name, true); });
    $('[data-form]').addEventListener('input', (event) => { const input = event.target; if (!input.name) return; const [key, , min, max, step] = controlMap[input.name]; const parsed = parseInput(input.value); if (Number.isFinite(parsed)) { state.custom.values[key] = clampAndStep(parsed, min, max, step); state.custom.lastValid[key] = state.custom.values[key]; hideCustomSourceChip(key); renderCustomResults(true); } });
    $('[data-form]').addEventListener('focusout', (event) => { if (event.target.name) commitInput(event.target); });
    $('[data-form]').addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.name) { event.preventDefault(); commitInput(event.target); event.target.blur(); } });
  }
  function vehicleName(vehicle) { return `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}${vehicle.drivetrain ? ` ${vehicle.drivetrain}` : ''}`; }
  function renderStatic() {
    const s = state.data.charging.confirmedSessions[0]; const ev = state.data.vehicles.ev; const ice = state.data.vehicles.iceBaseline;
    $('[data-story-ev]').textContent = `${ev.year} ${ev.make} ${ev.model}`;
    $('[data-story-ice]').textContent = `${ice.year} ${ice.make} ${ice.model}`;
    $('[data-story-receipt]').textContent = money.format(s.totalPaidUsd);
    $('[data-story-energy]').textContent = `${s.energyDeliveredKwh} kWh`;
    $('[data-story-minutes]').textContent = `${s.chargingMinutes} minutes`;
    $('[data-story-mileage]').textContent = `${groupedInteger.format(state.data.inputs.annualMiles.value)} miles/year`;
    $('[data-receipt-energy]').textContent = `${s.energyDeliveredKwh} kWh`; $('[data-receipt-minutes]').textContent = `${s.chargingMinutes} minutes`; $('[data-receipt-total]').textContent = money.format(s.totalPaidUsd);
    $('[data-receipt]').innerHTML = [['Network', s.network], ['Energy delivered', `${s.energyDeliveredKwh} kWh`], ['Paid after tax', money.format(s.totalPaidUsd)], ['Session time', `${s.chargingMinutes} minutes`], ['Effective rate', `${rate4.format(publicRate())}/kWh`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('[data-turning-point]').innerHTML = [`Public rate: about ${rate4.format(publicRate())}/kWh - confirmed from one session.`, `Home rate: ${rate4.format(state.data.inputs.homeRatePerKwhUsd.value)}/kWh - a temporary assumption.`, 'That price gap is why the result flips.'].map((item) => `<li>${item}</li>`).join('');
    $('[data-legend]').innerHTML = Object.entries(state.data.provenanceLevels).map(([k, v]) => `<div><span class="source-chip ${k}" aria-hidden="true">${provenanceText(k)}</span><p><strong>${provenanceName(k)}:</strong> ${v}</p></div>`).join('');
  }
  function initBackToTop() { const nav = $('#ev-cost-nav'); const arrow = $('.back-to-top-arrow'); if (!nav || !arrow) return; const setVisible = (visible) => arrow.classList.toggle('is-visible', visible); const pastNav = () => window.scrollY > nav.offsetTop + nav.offsetHeight; arrow.addEventListener('click', (event) => { event.preventDefault(); const behavior = shouldReduceMotion() ? 'auto' : 'smooth'; nav.scrollIntoView({ behavior, block: 'start' }); history.replaceState(null, '', '#ev-cost-nav'); }); if ('IntersectionObserver' in window) { const marker = document.createElement('span'); marker.className = 'ev-nav-marker'; marker.setAttribute('aria-hidden', 'true'); nav.before(marker); new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && pastNav()), { threshold: 0 }).observe(marker); return; } const update = () => setVisible(pastNav()); update(); window.addEventListener('scroll', update, { passive: true }); }

  function initHeroChargingScene() {
    const scene = $('[data-ev-charging-scene]');
    if (!scene || scene.dataset.evSceneReady === 'true') return;
    scene.dataset.evSceneReady = 'true';
    const vehicle = $('[data-ev-scene-vehicle]', scene);
    const wheels = Array.from(scene.querySelectorAll('[data-ev-wheel]'));
    const cable = $('[data-ev-scene-cable]', scene);
    const charger = $('[data-ev-scene-charger]', scene);
    const chargerBolt = $('[data-ev-charger-bolt]', scene);
    const vehicleBolt = $('[data-ev-vehicle-bolt]', scene);
    if (!vehicle || !wheels.length || !cable || !charger || !chargerBolt || !vehicleBolt) return;

    const loopMs = 9000;
    const entryMs = 2000;
    const chargeEndMs = 5000;
    const exitEndMs = 7000;
    const cableMs = 320;
    const entryX = -86;
    const chargeX = 0;
    const exitX = 80;
    const wheelCenters = { rear: [27, 42], front: [52, 42] };
    let frame = null;
    let cycleStartedAt = performance.now();
    let previousElapsed = 0;
    let previousX = entryX;
    let wheelAngle = 0;

    const easeOutCubicLocal = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOutLocal = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const setWheelRotation = () => {
      wheels.forEach((wheel) => {
        const [cx, cy] = wheelCenters[wheel.dataset.evWheel] || wheelCenters.rear;
        wheel.setAttribute('transform', `rotate(${wheelAngle.toFixed(2)} ${cx} ${cy})`);
      });
    };
    const setBoltOpacity = (opacity) => {
      chargerBolt.style.opacity = opacity;
      vehicleBolt.style.opacity = opacity;
    };
    const setCable = (progress) => {
      const visibleProgress = clamp01(progress);
      cable.style.strokeDashoffset = (28 * (1 - visibleProgress)).toFixed(2);
      cable.style.opacity = visibleProgress > 0.01 ? visibleProgress.toFixed(2) : '0';
    };
    const setInactive = () => {
      charger.classList.remove('is-active');
      vehicle.classList.remove('is-active');
      setBoltOpacity('.3');
      setCable(0);
    };

    const setStatic = () => {
      wheelAngle = 0;
      previousX = chargeX;
      previousElapsed = 0;
      vehicle.setAttribute('transform', `translate(${chargeX} 0)`);
      vehicle.classList.add('is-active');
      charger.classList.add('is-active');
      setWheelRotation();
      setCable(1);
      setBoltOpacity('.86');
    };

    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = null; };

    const render = (now) => {
      const elapsed = (now - cycleStartedAt) % loopMs;
      if (elapsed < previousElapsed) previousX = entryX;
      let x = exitX;
      let y = 0;
      let active = false;
      let boltOpacity = .3;
      let cableProgress = 0;

      if (elapsed < entryMs) {
        const t = easeOutCubicLocal(elapsed / entryMs);
        x = entryX + (chargeX - entryX) * t;
        y = -Math.sin(t * Math.PI) * .25;
      } else if (elapsed < chargeEndMs) {
        const chargingElapsed = elapsed - entryMs;
        x = chargeX;
        active = chargingElapsed < (chargeEndMs - entryMs - cableMs);
        if (chargingElapsed < cableMs) cableProgress = easeInOutLocal(chargingElapsed / cableMs);
        else if (chargingElapsed > (chargeEndMs - entryMs - cableMs)) cableProgress = 1 - easeInOutLocal((chargingElapsed - (chargeEndMs - entryMs - cableMs)) / cableMs);
        else cableProgress = 1;
        if (active || cableProgress > 0.2) {
          const pulse = (Math.sin(chargingElapsed / 1000 * Math.PI * 2.5) + 1) / 2;
          boltOpacity = (.55 + pulse * .45).toFixed(3);
        }
      } else if (elapsed < exitEndMs) {
        const t = easeInOutLocal((elapsed - chargeEndMs) / (exitEndMs - chargeEndMs));
        x = chargeX + (exitX - chargeX) * t;
        y = -Math.sin(t * Math.PI) * .22;
      }

      const dx = x - previousX;
      if (elapsed < exitEndMs && Math.abs(dx) > 0.002 && dx > 0) wheelAngle += dx * 25.7;
      vehicle.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      vehicle.classList.toggle('is-active', active);
      charger.classList.toggle('is-active', active);
      setWheelRotation();
      setCable(cableProgress);
      setBoltOpacity(String(boltOpacity));
      if (elapsed >= exitEndMs) setInactive();
      previousX = x;
      previousElapsed = elapsed;
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      stop();
      if (shouldReduceMotion() || document.hidden) { setStatic(); return; }
      cycleStartedAt = performance.now();
      previousElapsed = 0;
      previousX = entryX;
      vehicle.setAttribute('transform', `translate(${entryX} 0)`);
      setInactive();
      frame = requestAnimationFrame(render);
    };

    document.addEventListener('visibilitychange', start);
    const motionChange = start;
    if (prefersReducedMotion.addEventListener) prefersReducedMotion.addEventListener('change', motionChange); else prefersReducedMotion.addListener(motionChange);
    start();
  }

  function renderInitial() { renderPresets(); renderForm(); renderGuidedResults(false); renderCustomResults(false); }
  initHeroChargingScene();
  fetch(DATA_URL).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then((data) => { state.data = data; resetGuidedValues(); resetCustomValues(); renderStatic(); renderInitial(); initFormEvents(); initBackToTop(); initGuidedVisibility(); $('[data-reset]').addEventListener('click', () => { resetCustomValues(); syncControls(); showCustomSourceChips(); renderCustomResults(true); }); }).catch((error) => { const box = $('[data-error]'); box.hidden = false; box.textContent = `Could not load ${DATA_URL}. Serve the repository from its root with python -m http.server 8000 and try again. (${error.message})`; });
})();
