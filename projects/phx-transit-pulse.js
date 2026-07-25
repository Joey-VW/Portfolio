(() => {
  'use strict';

  const REPLAY_URL = '/data/phx-transit/synthetic/operations-replay.json';
  const SCENARIOS_URL = '/data/phx-transit/synthetic/state-scenarios.json';
  const app = document.querySelector('.phx-dashboard');
  if (!app) return;

  const $ = (selector) => app.querySelector(selector);
  const svgNS = 'http://www.w3.org/2000/svg';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { data: null, scenarios: [], frame: 0, playing: false, timer: null, mode: 'all', route: 'all', scenario: 'current', selected: null };
  const feedLabels = { vehicle_positions: 'Vehicle Positions', trip_updates: 'Trip Updates', service_alerts: 'Service Alerts' };
  const freshnessLabels = { fresh: 'Fresh', stale: 'Stale', very_stale: 'Very stale' };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function svgEl(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function currentFrame() { return state.data.frames[state.frame]; }
  function currentScenario() { return state.scenarios.find((item) => item.id === state.scenario) || state.scenarios[0]; }
  function unknown(value) { return value === null || value === undefined || value === '' ? 'Unknown' : value; }
  function routeById(id) { return state.data.routes.find((route) => route.id === id); }
  function setSelection(type, id) { state.selected = { type, id }; render(); announce(`Selected ${type} ${id}.`); }
  function announce(message) { $('[data-announcer]').textContent = message; }
  function scenarioCountsUnavailable() { return Boolean(currentScenario().hideCounts); }
  function filteredVehicles(frame = currentFrame()) {
    if (currentScenario().emptyMap) return [];
    return frame.vehicles.filter((vehicle) => (state.mode === 'all' || vehicle.mode === state.mode) && (state.route === 'all' || vehicle.routeId === state.route));
  }

  function derive(frame) {
    const vehicles = filteredVehicles(frame);
    const active = currentScenario().state === 'very_stale' ? 0 : vehicles.filter((vehicle) => vehicle.ageSeconds <= 90 && vehicle.freshness !== 'very_stale').length;
    return {
      vehicles, active,
      bus: vehicles.filter((vehicle) => vehicle.mode === 'bus').length,
      rail: vehicles.filter((vehicle) => vehicle.mode === 'rail').length,
      fresh: vehicles.filter((vehicle) => vehicle.freshness === 'fresh').length,
      stale: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
      veryStale: vehicles.filter((vehicle) => vehicle.freshness === 'very_stale').length,
      missing: vehicles.filter((vehicle) => !vehicle.routeId || !vehicle.tripId).length,
      alerts: frame.alerts.filter((alert) => state.route === 'all' || alert.routes.includes(state.route)).length
    };
  }

  function renderStatus(frame) {
    const scenario = currentScenario();
    app.dataset.appState = scenario.state;
    $('[data-replay-time]').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' }).format(new Date(frame.timestamp));
    $('[data-frame-label]').textContent = `Synthetic replay • frame ${state.frame + 1} of ${state.data.frames.length}`;
    $('[data-primary-state]').innerHTML = `<span aria-hidden="true">●</span> ${scenario.label}`;
    $('[data-state-title]').textContent = scenario.label;
    $('[data-state-message]').textContent = scenario.message;
    $('[data-timeline]').value = state.frame;
    $('[data-play-label]').textContent = state.playing ? 'Pause' : 'Play';
    $('[data-action="play"]').setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} synthetic replay`);
  }

  function renderKpis(frame) {
    const counts = derive(frame);
    const unavailable = scenarioCountsUnavailable();
    const values = [
      ['Active vehicles', unavailable ? 'Unavailable' : counts.active, 'Vehicle age ≤ 90 seconds'],
      ['Fleet mix', unavailable ? 'Unavailable' : `${counts.bus} / ${counts.rail}`, 'Bus / light rail'],
      ['Fresh / stale', unavailable ? 'Unavailable' : `${counts.fresh} / ${counts.stale + counts.veryStale}`, 'Vehicle timestamps'],
      ['Active alerts', unavailable ? 'Unavailable' : counts.alerts, 'Fictional notices'],
      ['Missing enrichment', unavailable ? 'Unavailable' : counts.missing, 'Route or trip unknown']
    ];
    const root = $('[data-kpis]'); root.replaceChildren();
    values.forEach(([label, value, note]) => { const card = el('article', 'phx-kpi'); card.append(el('span', '', label), el('strong', '', String(value)), el('small', '', note)); root.append(card); });
  }

  function renderMap(frame) {
    const routesRoot = $('[data-map-routes]'), stopsRoot = $('[data-map-stops]'), vehiclesRoot = $('[data-map-vehicles]');
    routesRoot.replaceChildren(); stopsRoot.replaceChildren(); vehiclesRoot.replaceChildren();
    const visible = filteredVehicles(frame);
    const affectedRoutes = new Set(frame.alerts.flatMap((alert) => alert.routes));
    const affectedStops = new Set(frame.alerts.flatMap((alert) => alert.stops));
    state.data.routes.forEach((route) => {
      const hidden = (state.mode !== 'all' && route.mode !== state.mode) || (state.route !== 'all' && route.id !== state.route);
      const line = svgEl('path', { d: route.path, class: `map-route ${route.color}${state.selected?.type === 'route' && state.selected.id === route.id ? ' is-selected' : ''}`, opacity: hidden ? '.08' : affectedRoutes.has(route.id) ? '1' : '.62' });
      const hit = svgEl('path', { d: route.path, class: 'route-hit', tabindex: '0', role: 'button', 'aria-label': `Select fictional route ${route.label}` });
      const select = () => setSelection('route', route.id); hit.addEventListener('click', select); hit.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
      routesRoot.append(line, hit);
    });
    state.data.stops.forEach((stop) => { const circle = svgEl('circle', { cx: stop.x, cy: stop.y, r: 7, class: `map-stop${affectedStops.has(stop.id) ? ' is-alert' : ''}` }); const label = svgEl('text', { x: stop.x + 11, y: stop.y - 11, class: 'map-stop-label' }); label.textContent = stop.label; stopsRoot.append(circle, label); });
    visible.forEach((vehicle) => {
      const group = svgEl('g', { class: `map-vehicle ${vehicle.mode} ${vehicle.freshness}${state.selected?.type === 'vehicle' && state.selected.id === vehicle.id ? ' is-selected' : ''}`, transform: `translate(${vehicle.x} ${vehicle.y})`, tabindex: '0', role: 'button', 'aria-label': `Select ${vehicle.id}, ${unknown(routeById(vehicle.routeId)?.label)}, ${freshnessLabels[vehicle.freshness]}` });
      group.append(svgEl('circle', { r: vehicle.mode === 'rail' ? 13 : 11 }), svgEl('text', { 'text-anchor': 'middle', y: '4' }));
      group.lastChild.textContent = vehicle.mode === 'rail' ? 'R' : vehicle.mode === 'bus' ? 'B' : '?';
      const select = () => setSelection('vehicle', vehicle.id); group.addEventListener('click', select); group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } }); vehiclesRoot.append(group);
    });
    const unavailable = currentScenario().emptyMap || ['feed_error', 'offline'].includes(currentScenario().state);
    $('[data-map-empty]').hidden = !unavailable;
    $('[data-map]').setAttribute('aria-hidden', unavailable ? 'true' : 'false');
  }

  function renderFeeds(frame) {
    const root = $('[data-feed-health]'); root.replaceChildren(); const scenario = currentScenario();
    Object.entries(frame.feeds).forEach(([key, feed]) => {
      const status = scenario.feedStatus || (scenario.hideCounts ? scenario.state : feed.status);
      const row = el('div', 'phx-feed-row'); row.append(el('strong', '', feedLabels[key]), el('span', '', scenario.hideCounts ? 'Age unavailable' : `Feed age ${feed.ageSeconds}s`), el('b', `status-${status}`, status.replace('_', ' '))); root.append(row);
    });
  }

  function renderAlerts(frame) {
    const root = $('[data-alerts]'); root.replaceChildren();
    const alerts = frame.alerts.filter((alert) => state.route === 'all' || alert.routes.includes(state.route));
    $('[data-alert-count]').textContent = scenarioCountsUnavailable() ? 'Unavailable' : String(alerts.length);
    if (scenarioCountsUnavailable()) { root.append(el('p', '', 'Alert records are unavailable in this demonstration state.')); return; }
    if (!alerts.length) { root.append(el('p', '', 'No active fictional alerts in this filtered frame.')); return; }
    alerts.forEach((alert) => { const button = el('button', `phx-alert${state.selected?.type === 'alert' && state.selected.id === alert.id ? ' is-selected' : ''}`); button.type = 'button'; button.append(el('strong', '', alert.title), el('small', '', `${alert.effect} • ${alert.period}`), el('small', '', `Routes: ${alert.routes.join(', ')} • Stops: ${alert.stops.join(', ')}`)); button.addEventListener('click', () => setSelection('alert', alert.id)); root.append(button); });
  }

  function renderInspector(frame) {
    const root = $('[data-inspector]'); root.replaceChildren();
    if (!state.selected) { root.append(el('p', '', 'Select a route, alert, or vehicle to inspect its fictional record.')); return; }
    let pairs = [];
    if (state.selected.type === 'vehicle') { const v = frame.vehicles.find((item) => item.id === state.selected.id); if (!v) { state.selected = null; renderInspector(frame); return; } pairs = [['Vehicle ID', v.id], ['Route', unknown(routeById(v.routeId)?.label)], ['Mode', unknown(v.mode)], ['Vehicle age', `${v.ageSeconds} seconds`], ['Freshness', freshnessLabels[v.freshness]], ['Trip', unknown(v.tripId)], ['Status', v.status], ['Stop / direction', `${unknown(v.stop)} / ${unknown(v.direction)}`]]; }
    if (state.selected.type === 'route') { const route = routeById(state.selected.id); pairs = [['Route ID', route.id], ['Label', route.label], ['Mode', route.mode], ['Direction', route.direction], ['Visible vehicles', derive(frame).vehicles.filter((v) => v.routeId === route.id).length], ['Alert affected', frame.alerts.some((a) => a.routes.includes(route.id)) ? 'Yes' : 'No']]; }
    if (state.selected.type === 'alert') { const alert = frame.alerts.find((item) => item.id === state.selected.id); if (!alert) { state.selected = null; renderInspector(frame); return; } pairs = [['Alert ID', alert.id], ['Effect', alert.effect], ['Period', alert.period], ['Routes', alert.routes.join(', ')], ['Stops', alert.stops.join(', ')]]; }
    const dl = el('dl'); pairs.forEach(([term, value]) => { dl.append(el('div', '', ''), el('div', '', '')); const box = dl.children[dl.children.length - 2]; box.append(el('dt', '', term), el('dd', '', String(value))); dl.lastChild.remove(); }); root.append(dl);
  }

  function renderComposition(frame) {
    const root = $('[data-composition]'); root.replaceChildren(); const counts = derive(frame); const total = counts.vehicles.length || 1;
    [['Bus', counts.bus, 'bus'], ['Light rail', counts.rail, 'rail'], ['Unknown mode', counts.vehicles.length - counts.bus - counts.rail, 'unknown']].forEach(([label, count, cls]) => { const bar = el('div', `phx-bar ${cls}`); bar.style.setProperty('--value', `${count / total * 100}%`); const line = el('span'); line.append(el('span', '', label), el('b', '', scenarioCountsUnavailable() ? 'Unavailable' : String(count))); bar.append(line, el('i')); root.append(bar); });
  }

  function renderRecords(frame) {
    const tbody = $('[data-records]'); tbody.replaceChildren(); const vehicles = filteredVehicles(frame);
    $('[data-record-count]').textContent = scenarioCountsUnavailable() ? 'Records unavailable' : `${vehicles.length} vehicles`;
    if (scenarioCountsUnavailable()) { const row = el('tr'); const cell = el('td', '', currentScenario().message); cell.colSpan = 5; row.append(cell); tbody.append(row); return; }
    vehicles.forEach((vehicle) => { const route = routeById(vehicle.routeId); const row = el('tr'); const button = el('button', '', vehicle.id); button.type = 'button'; button.addEventListener('click', () => setSelection('vehicle', vehicle.id)); const cells = [[button, 'Record'], [`${unknown(route?.label)} / ${vehicle.mode}`, 'Route / mode'], [`${freshnessLabels[vehicle.freshness]} (${vehicle.ageSeconds}s vehicle age)`, 'Freshness'], [vehicle.status, 'Status'], [`${unknown(vehicle.stop)} / ${unknown(vehicle.direction)}`, 'Stop / direction']]; cells.forEach(([content, label]) => { const cell = el('td'); cell.dataset.label = label; typeof content === 'string' ? cell.textContent = content : cell.append(content); row.append(cell); }); tbody.append(row); });
    frame.tripStates.forEach((trip) => { if (state.route !== 'all' && trip.routeId !== state.route) return; const row = el('tr'); [['Trip state', trip.tripId], ['Route', unknown(routeById(trip.routeId)?.label)], ['Explicit state', trip.state.replace('_', ' ')], ['Status', trip.label], ['Stop / direction', trip.state === 'skipped_stop' ? 'Fictional stop event' : 'Not applicable']].forEach(([label, value]) => { const cell = el('td', '', value); cell.dataset.label = label; row.append(cell); }); tbody.append(row); });
  }

  function render({ announceChange = false } = {}) {
    const frame = currentFrame(); renderStatus(frame); renderKpis(frame); renderMap(frame); renderFeeds(frame); renderAlerts(frame); renderInspector(frame); renderComposition(frame); renderRecords(frame);
    if (announceChange) announce(`${currentScenario().label}. Synthetic frame ${state.frame + 1} of ${state.data.frames.length}. ${currentScenario().message}`);
  }
  function stopReplay() { clearInterval(state.timer); state.timer = null; state.playing = false; }
  function startReplay() {
    if (reducedMotion.matches) { stopReplay(); announce('Autoplay is disabled because reduced motion is enabled. Use previous or next frame.'); render(); return; }
    if (state.frame === state.data.frames.length - 1) state.frame = 0;
    state.playing = true; clearInterval(state.timer); state.timer = setInterval(() => { if (state.frame >= state.data.frames.length - 1) { stopReplay(); render({ announceChange: true }); return; } state.frame += 1; render({ announceChange: true }); }, state.data.meta.frameIntervalMs); render();
  }
  function moveFrame(delta) { stopReplay(); state.frame = Math.max(0, Math.min(state.data.frames.length - 1, state.frame + delta)); render({ announceChange: true }); }

  function bindControls() {
    app.querySelectorAll('[data-action="restart"]').forEach((button) => button.addEventListener('click', () => { stopReplay(); state.frame = 0; render({ announceChange: true }); }));
    $('[data-action="previous"]').addEventListener('click', () => moveFrame(-1)); $('[data-action="next"]').addEventListener('click', () => moveFrame(1)); $('[data-action="play"]').addEventListener('click', () => state.playing ? (stopReplay(), render({ announceChange: true })) : startReplay());
    app.querySelectorAll('[data-action="reset"]').forEach((button) => button.addEventListener('click', () => { state.mode = 'all'; state.route = 'all'; state.selected = null; $('[data-mode-filter]').value = 'all'; $('[data-route-filter]').value = 'all'; render({ announceChange: true }); }));
    $('[data-timeline]').addEventListener('input', (event) => { stopReplay(); state.frame = Number(event.target.value); render({ announceChange: true }); });
    $('[data-mode-filter]').addEventListener('change', (event) => { state.mode = event.target.value; state.selected = null; render({ announceChange: true }); });
    $('[data-route-filter]').addEventListener('change', (event) => { state.route = event.target.value; state.selected = state.route === 'all' ? null : { type: 'route', id: state.route }; render({ announceChange: true }); });
    $('[data-scenario]').addEventListener('change', (event) => { stopReplay(); state.scenario = event.target.value; const url = new URL(location.href); state.scenario === 'current' ? url.searchParams.delete('state') : url.searchParams.set('state', state.scenario); history.replaceState(null, '', url); render({ announceChange: true }); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) { stopReplay(); render(); announce('Synthetic replay paused because the document is hidden.'); } });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopReplay(); render({ announceChange: true }); });
  }

  async function init() {
    try {
      const [replayResponse, scenarioResponse] = await Promise.all([fetch(REPLAY_URL), fetch(SCENARIOS_URL)]);
      if (!replayResponse.ok || !scenarioResponse.ok) throw new Error('Synthetic fixture request failed.');
      const [data, scenarios] = await Promise.all([replayResponse.json(), scenarioResponse.json()]);
      if (data.meta?.providerData !== false || data.meta?.fixtureKind !== 'synthetic-operations-demo' || !Array.isArray(data.frames) || !data.frames.length) throw new Error('Synthetic replay fixture is invalid.');
      state.data = data; state.scenarios = scenarios.scenarios;
      $('[data-timeline]').max = String(data.frames.length - 1);
      data.routes.forEach((route) => { const option = el('option', '', `${route.label} • ${route.mode}`); option.value = route.id; $('[data-route-filter]').append(option); });
      $('[data-scenario]').replaceChildren(); state.scenarios.forEach((scenario) => { const option = el('option', '', scenario.label); option.value = scenario.id; $('[data-scenario]').append(option); });
      const requested = new URLSearchParams(location.search).get('state'); if (state.scenarios.some((scenario) => scenario.id === requested)) state.scenario = requested; $('[data-scenario]').value = state.scenario;
      bindControls(); render({ announceChange: true });
    } catch (error) {
      app.dataset.appState = 'feed_error'; $('[data-primary-state]').innerHTML = '<span aria-hidden="true">●</span> Synthetic fixture error'; $('[data-state-title]').textContent = 'Feed error'; $('[data-state-message]').textContent = 'The local synthetic fixture could not be loaded. No live or provider data was requested.'; $('[data-map-empty]').hidden = false; announce('Feed error. The local synthetic fixture could not be loaded.');
    }
  }
  init();
})();
