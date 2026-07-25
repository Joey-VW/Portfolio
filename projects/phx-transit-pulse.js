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
  function unavailableScenario() { return Boolean(currentScenario().hideCounts); }
  function mapUnavailable() { return unavailableScenario() || Boolean(currentScenario().emptyMap); }
  function unknown(value) { return value === null || value === undefined || value === '' ? 'Unknown' : value; }
  function routeById(id) { return state.data.routes.find((route) => route.id === id); }
  function announce(message) { $('[data-announcer]').textContent = message; }
  function updateRouteOptions() {
    Array.from($('[data-route-filter]').options).forEach((option) => {
      const route = routeById(option.value);
      option.disabled = Boolean(route && state.mode !== 'all' && route.mode !== state.mode);
    });
  }

  function effectiveVehicle(vehicle) {
    if (currentScenario().state !== 'very_stale') return vehicle;
    return { ...vehicle, ageSeconds: Math.max(301, vehicle.ageSeconds + 300), freshness: 'very_stale' };
  }
  function visibleRoutes() {
    if (mapUnavailable()) return [];
    return state.data.routes.filter((route) => (state.mode === 'all' || route.mode === state.mode) && (state.route === 'all' || route.id === state.route));
  }
  function visibleVehicles(frame = currentFrame()) {
    if (mapUnavailable()) return [];
    const routeIds = new Set(visibleRoutes().map((route) => route.id));
    return frame.vehicles.map(effectiveVehicle).filter((vehicle) => {
      const modeMatches = state.mode === 'all' || vehicle.mode === state.mode;
      const routeMatches = state.route === 'all' || vehicle.routeId === state.route;
      const knownRouteVisible = !vehicle.routeId || routeIds.has(vehicle.routeId);
      return modeMatches && routeMatches && knownRouteVisible;
    });
  }
  function visibleAlerts(frame = currentFrame()) {
    if (unavailableScenario()) return [];
    const routeIds = new Set(visibleRoutes().map((route) => route.id));
    return frame.alerts.filter((alert) => alert.routes.some((routeId) => routeIds.has(routeId)));
  }
  function selectionIsValid(frame = currentFrame()) {
    if (!state.selected || unavailableScenario()) return false;
    if (state.selected.type === 'vehicle') return visibleVehicles(frame).some((vehicle) => vehicle.id === state.selected.id);
    if (state.selected.type === 'route') return visibleRoutes().some((route) => route.id === state.selected.id);
    if (state.selected.type === 'alert') return visibleAlerts(frame).some((alert) => alert.id === state.selected.id);
    return false;
  }
  function normalizeSelection(frame = currentFrame()) {
    if (state.selected && !selectionIsValid(frame)) state.selected = null;
  }
  function setSelection(type, id) {
    if (mapUnavailable()) return;
    state.selected = { type, id };
    render();
    announce(`Selected ${type} ${id}.`);
  }

  function derive(frame) {
    const vehicles = visibleVehicles(frame);
    return {
      vehicles,
      active: vehicles.filter((vehicle) => vehicle.ageSeconds <= 90).length,
      bus: vehicles.filter((vehicle) => vehicle.mode === 'bus').length,
      rail: vehicles.filter((vehicle) => vehicle.mode === 'rail').length,
      fresh: vehicles.filter((vehicle) => vehicle.freshness === 'fresh').length,
      stale: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
      veryStale: vehicles.filter((vehicle) => vehicle.freshness === 'very_stale').length,
      missing: vehicles.filter((vehicle) => !vehicle.routeId || !vehicle.tripId).length,
      alerts: visibleAlerts(frame).length
    };
  }

  function renderStatus(frame) {
    const scenario = currentScenario();
    app.dataset.appState = scenario.state;
    $('[data-replay-time]').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' }).format(new Date(frame.timestamp));
    $('[data-frame-label]').textContent = `Synthetic replay • frame ${state.frame + 1} of ${state.data.frames.length}`;
    const primary = $('[data-primary-state]');
    primary.replaceChildren(el('span', '', '●'), document.createTextNode(` ${scenario.label}`));
    primary.firstChild.setAttribute('aria-hidden', 'true');
    $('[data-state-title]').textContent = scenario.label;
    $('[data-state-message]').textContent = scenario.message;
    $('[data-timeline]').value = state.frame;
    $('[data-play-label]').textContent = state.playing ? 'Pause' : 'Play';
    $('[data-action="play"]').setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} synthetic replay`);
  }

  function renderKpis(frame) {
    const counts = derive(frame);
    const unavailable = unavailableScenario();
    const values = [
      ['Active vehicles', unavailable ? 'Unavailable' : counts.active, 'Vehicle age ≤ 90 seconds'],
      ['Fleet mix', unavailable ? 'Unavailable' : `${counts.bus} / ${counts.rail}`, 'Bus / light rail'],
      ['Fresh / stale', unavailable ? 'Unavailable' : `${counts.fresh} / ${counts.stale + counts.veryStale}`, currentScenario().state === 'very_stale' ? 'All vehicles very stale' : 'Vehicle timestamps'],
      ['Active alerts', unavailable ? 'Unavailable' : counts.alerts, 'Fictional notices'],
      ['Missing enrichment', unavailable ? 'Unavailable' : counts.missing, 'Route or trip unknown']
    ];
    const root = $('[data-kpis]');
    root.replaceChildren();
    values.forEach(([label, value, note]) => {
      const card = el('article', 'phx-kpi');
      card.append(el('span', '', label), el('strong', '', String(value)), el('small', '', note));
      root.append(card);
    });
  }

  function renderMap(frame) {
    const routesRoot = $('[data-map-routes]');
    const stopsRoot = $('[data-map-stops]');
    const vehiclesRoot = $('[data-map-vehicles]');
    routesRoot.replaceChildren(); stopsRoot.replaceChildren(); vehiclesRoot.replaceChildren();
    const unavailable = mapUnavailable();
    const selectedAlert = state.selected?.type === 'alert' ? frame.alerts.find((alert) => alert.id === state.selected.id) : null;
    const affectedRoutes = new Set(selectedAlert ? selectedAlert.routes : visibleAlerts(frame).flatMap((alert) => alert.routes));
    const affectedStops = new Set(selectedAlert ? selectedAlert.stops : visibleAlerts(frame).flatMap((alert) => alert.stops));

    if (!unavailable) {
      visibleRoutes().forEach((route) => {
        const selected = state.selected?.type === 'route' && state.selected.id === route.id;
        const alertFocused = affectedRoutes.has(route.id);
        const line = svgEl('path', { d: route.path, class: `map-route ${route.color}${selected ? ' is-selected' : ''}${alertFocused ? ' is-alert-focused' : ''}` });
        const hit = svgEl('path', { d: route.path, class: 'route-hit', tabindex: '0', role: 'button', 'aria-label': `Select fictional route ${route.label}, ${route.mode}, ${route.direction}` });
        const select = () => setSelection('route', route.id);
        hit.addEventListener('click', select);
        hit.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
        routesRoot.append(line, hit);
      });
      state.data.stops.forEach((stop) => {
        const alertFocused = affectedStops.has(stop.id);
        const circle = svgEl('circle', { cx: stop.x, cy: stop.y, r: 7, class: `map-stop${alertFocused ? ' is-alert' : ''}${selectedAlert && alertFocused ? ' is-selected-alert' : ''}` });
        const label = svgEl('text', { x: stop.x + 11, y: stop.y - 11, class: 'map-stop-label' });
        label.textContent = stop.label;
        stopsRoot.append(circle, label);
      });
      visibleVehicles(frame).forEach((vehicle) => {
        const selected = state.selected?.type === 'vehicle' && state.selected.id === vehicle.id;
        const group = svgEl('g', { class: `map-vehicle ${vehicle.mode} ${vehicle.freshness}${selected ? ' is-selected' : ''}`, transform: `translate(${vehicle.x} ${vehicle.y})`, tabindex: '0', role: 'button', 'aria-label': `Select ${vehicle.id}, ${unknown(routeById(vehicle.routeId)?.label)}, ${freshnessLabels[vehicle.freshness]}, vehicle age ${vehicle.ageSeconds} seconds` });
        group.append(svgEl('circle', { r: vehicle.mode === 'rail' ? 13 : 11 }), svgEl('text', { 'text-anchor': 'middle', y: '4' }));
        group.lastChild.textContent = vehicle.mode === 'rail' ? 'R' : vehicle.mode === 'bus' ? 'B' : '?';
        const select = () => setSelection('vehicle', vehicle.id);
        group.addEventListener('click', select);
        group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
        vehiclesRoot.append(group);
      });
    }
    $('[data-map-empty]').hidden = !unavailable;
    $('[data-map]').setAttribute('aria-disabled', unavailable ? 'true' : 'false');
  }

  function renderFeeds(frame) {
    const root = $('[data-feed-health]');
    root.replaceChildren();
    const scenario = currentScenario();
    Object.entries(frame.feeds).forEach(([key, feed]) => {
      const status = scenario.feedStatus || (unavailableScenario() ? scenario.state : feed.status);
      const row = el('div', 'phx-feed-row');
      row.append(el('strong', '', feedLabels[key]), el('span', '', unavailableScenario() ? 'Feed age unavailable' : `Feed age ${feed.ageSeconds}s`), el('b', `status-${status}`, status.replace('_', ' ')));
      root.append(row);
    });
  }

  function renderAlerts(frame) {
    const root = $('[data-alerts]');
    root.replaceChildren();
    const alerts = visibleAlerts(frame);
    $('[data-alert-count]').textContent = unavailableScenario() ? 'Unavailable' : String(alerts.length);
    if (unavailableScenario()) { root.append(el('p', '', `${currentScenario().label}: alert records are unavailable.`)); return; }
    if (!alerts.length) { root.append(el('p', '', 'No active fictional alerts in this filtered frame.')); return; }
    alerts.forEach((alert) => {
      const button = el('button', `phx-alert${state.selected?.type === 'alert' && state.selected.id === alert.id ? ' is-selected' : ''}`);
      button.type = 'button';
      button.append(el('strong', '', alert.title), el('small', '', `${alert.effect} • ${alert.period}`), el('small', '', `Routes: ${alert.routes.join(', ')} • Stops: ${alert.stops.join(', ')}`));
      button.addEventListener('click', () => setSelection('alert', alert.id));
      root.append(button);
    });
  }

  function appendDefinitionList(root, pairs) {
    const list = el('dl');
    pairs.forEach(([term, value]) => {
      const item = el('div');
      item.append(el('dt', '', term), el('dd', '', String(value)));
      list.append(item);
    });
    root.append(list);
  }

  function renderInspector(frame) {
    const root = $('[data-inspector]');
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('strong', '', `${currentScenario().label}: record unavailable`), el('p', '', `${currentScenario().message} No previously selected record is presented as current.`));
      return;
    }
    if (!state.selected) { root.append(el('p', '', 'Select a route, alert, or vehicle to inspect its fictional record.')); return; }
    let pairs = [];
    if (state.selected.type === 'vehicle') {
      const vehicle = visibleVehicles(frame).find((item) => item.id === state.selected.id);
      if (!vehicle) return;
      pairs = [['Vehicle ID', vehicle.id], ['Route', unknown(routeById(vehicle.routeId)?.label)], ['Mode', unknown(vehicle.mode)], ['Vehicle age', `${vehicle.ageSeconds} seconds`], ['Freshness', freshnessLabels[vehicle.freshness]], ['Trip', unknown(vehicle.tripId)], ['Status', vehicle.status], ['Stop / direction', `${unknown(vehicle.stop)} / ${unknown(vehicle.direction)}`]];
    }
    if (state.selected.type === 'route') {
      const route = routeById(state.selected.id);
      pairs = [['Route ID', route.id], ['Label', route.label], ['Mode', route.mode], ['Direction', route.direction], ['Visible vehicles', visibleVehicles(frame).filter((vehicle) => vehicle.routeId === route.id).length], ['Alert affected', visibleAlerts(frame).some((alert) => alert.routes.includes(route.id)) ? 'Yes' : 'No']];
    }
    if (state.selected.type === 'alert') {
      const alert = visibleAlerts(frame).find((item) => item.id === state.selected.id);
      if (!alert) return;
      pairs = [['Alert ID', alert.id], ['Title', alert.title], ['Effect', alert.effect], ['Period', alert.period], ['Affected routes', alert.routes.join(', ')], ['Affected stops', alert.stops.join(', ')]];
    }
    appendDefinitionList(root, pairs);
  }

  function renderComposition(frame) {
    const root = $('[data-composition]');
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', `${currentScenario().label}: fleet composition is unavailable and no zero-service proportion is inferred.`));
      return;
    }
    const counts = derive(frame);
    const total = counts.vehicles.length || 1;
    [['Bus', counts.bus, 'bus'], ['Light rail', counts.rail, 'rail'], ['Unknown mode', counts.vehicles.length - counts.bus - counts.rail, 'unknown']].forEach(([label, count, className]) => {
      const bar = el('div', `phx-bar ${className}`);
      bar.style.setProperty('--value', `${count / total * 100}%`);
      const line = el('span');
      line.append(el('span', '', label), el('b', '', String(count)));
      bar.append(line, el('i'));
      root.append(bar);
    });
    if (currentScenario().state === 'very_stale') root.append(el('p', 'phx-unavailable', 'All displayed vehicles are very stale; none are counted as active.'));
  }

  function appendRecordRow(tbody, values) {
    const row = el('tr');
    values.forEach(([content, label]) => {
      const cell = el('td');
      cell.dataset.label = label;
      typeof content === 'string' ? cell.textContent = content : cell.append(content);
      row.append(cell);
    });
    tbody.append(row);
  }

  function renderRecords(frame) {
    const tbody = $('[data-records]');
    tbody.replaceChildren();
    if (unavailableScenario()) {
      $('[data-record-count]').textContent = 'Records unavailable';
      const cell = el('td', '', `${currentScenario().label}: ${currentScenario().message}`);
      cell.colSpan = 5;
      const row = el('tr'); row.append(cell); tbody.append(row);
      return;
    }
    const routes = visibleRoutes();
    const vehicles = visibleVehicles(frame);
    $('[data-record-count]').textContent = `${routes.length} routes • ${vehicles.length} vehicles`;
    routes.forEach((route) => {
      const button = el('button', '', `${route.label} (${route.id})`);
      button.type = 'button';
      button.addEventListener('click', () => setSelection('route', route.id));
      const count = vehicles.filter((vehicle) => vehicle.routeId === route.id).length;
      const affected = visibleAlerts(frame).some((alert) => alert.routes.includes(route.id)) ? 'Alert affected' : 'No active alert';
      appendRecordRow(tbody, [[button, 'Record'], [`${route.id} / ${route.mode}`, 'Route / mode'], ['Route record', 'Freshness'], [affected, 'Status'], [`${route.direction} • ${count} visible vehicles`, 'Stop / direction']]);
    });
    vehicles.forEach((vehicle) => {
      const route = routeById(vehicle.routeId);
      const button = el('button', '', vehicle.id);
      button.type = 'button';
      button.addEventListener('click', () => setSelection('vehicle', vehicle.id));
      appendRecordRow(tbody, [[button, 'Record'], [`${unknown(route?.label)} / ${vehicle.mode}`, 'Route / mode'], [`${freshnessLabels[vehicle.freshness]} (${vehicle.ageSeconds}s vehicle age)`, 'Freshness'], [vehicle.status, 'Status'], [`${unknown(vehicle.stop)} / ${unknown(vehicle.direction)}`, 'Stop / direction']]);
    });
    frame.tripStates.forEach((trip) => {
      if (!routes.some((route) => route.id === trip.routeId)) return;
      appendRecordRow(tbody, [[trip.tripId, 'Record'], [unknown(routeById(trip.routeId)?.label), 'Route / mode'], [trip.state.replace('_', ' '), 'Freshness'], [trip.label, 'Status'], [trip.state === 'skipped_stop' ? 'Fictional stop event' : 'Not applicable', 'Stop / direction']]);
    });
  }

  function render({ announceChange = false } = {}) {
    const frame = currentFrame();
    normalizeSelection(frame);
    renderStatus(frame); renderKpis(frame); renderMap(frame); renderFeeds(frame); renderAlerts(frame); renderInspector(frame); renderComposition(frame); renderRecords(frame);
    if (announceChange) announce(`${currentScenario().label}. Synthetic frame ${state.frame + 1} of ${state.data.frames.length}. ${currentScenario().message}`);
  }
  function stopReplay() { clearInterval(state.timer); state.timer = null; state.playing = false; }
  function startReplay() {
    if (reducedMotion.matches) { stopReplay(); announce('Autoplay is disabled because reduced motion is enabled. Use previous or next frame.'); render(); return; }
    if (state.frame === state.data.frames.length - 1) state.frame = 0;
    state.playing = true;
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (state.frame >= state.data.frames.length - 1) { stopReplay(); render({ announceChange: true }); return; }
      state.frame += 1;
      render({ announceChange: true });
    }, state.data.meta.frameIntervalMs);
    render();
  }
  function moveFrame(delta) { stopReplay(); state.frame = Math.max(0, Math.min(state.data.frames.length - 1, state.frame + delta)); render({ announceChange: true }); }

  function bindControls() {
    app.querySelectorAll('[data-action="restart"]').forEach((button) => button.addEventListener('click', () => { stopReplay(); state.frame = 0; render({ announceChange: true }); }));
    $('[data-action="previous"]').addEventListener('click', () => moveFrame(-1));
    $('[data-action="next"]').addEventListener('click', () => moveFrame(1));
    $('[data-action="play"]').addEventListener('click', () => state.playing ? (stopReplay(), render({ announceChange: true })) : startReplay());
    app.querySelectorAll('[data-action="reset"]').forEach((button) => button.addEventListener('click', () => {
      state.mode = 'all'; state.route = 'all'; state.selected = null;
      $('[data-mode-filter]').value = 'all'; $('[data-route-filter]').value = 'all';
      updateRouteOptions();
      render({ announceChange: true });
    }));
    $('[data-timeline]').addEventListener('input', (event) => { stopReplay(); state.frame = Number(event.target.value); render({ announceChange: true }); });
    $('[data-mode-filter]').addEventListener('change', (event) => {
      state.mode = event.target.value;
      const selectedRoute = routeById(state.route);
      if (selectedRoute && state.mode !== 'all' && selectedRoute.mode !== state.mode) { state.route = 'all'; $('[data-route-filter]').value = 'all'; }
      updateRouteOptions();
      state.selected = null;
      render({ announceChange: true });
    });
    $('[data-route-filter]').addEventListener('change', (event) => { state.route = event.target.value; state.selected = state.route === 'all' ? null : { type: 'route', id: state.route }; render({ announceChange: true }); });
    $('[data-scenario]').addEventListener('change', (event) => {
      stopReplay(); state.scenario = event.target.value; state.selected = null;
      const url = new URL(location.href);
      state.scenario === 'current' ? url.searchParams.delete('state') : url.searchParams.set('state', state.scenario);
      history.replaceState(null, '', url);
      render({ announceChange: true });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) { stopReplay(); render(); announce('Synthetic replay paused because the document is hidden.'); } });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopReplay(); render({ announceChange: true }); });
  }

  function renderLoadFailure() {
    stopReplay();
    app.dataset.appState = 'feed_error';
    const primary = $('[data-primary-state]');
    primary.replaceChildren(el('span', '', '●'), document.createTextNode(' Synthetic fixture error'));
    primary.firstChild.setAttribute('aria-hidden', 'true');
    $('[data-replay-time]').textContent = 'Unavailable';
    $('[data-frame-label]').textContent = 'Synthetic replay unavailable';
    $('[data-state-title]').textContent = 'Synthetic fixture error';
    $('[data-state-message]').textContent = 'The local fictional fixture could not be loaded. No live or provider data was requested.';
    const unavailableCard = (label, note) => { const card = el('article', 'phx-kpi'); card.append(el('span', '', label), el('strong', '', 'Unavailable'), el('small', '', note)); return card; };
    $('[data-kpis]').replaceChildren(...['Active vehicles', 'Fleet mix', 'Fresh / stale', 'Active alerts', 'Missing enrichment'].map((label) => unavailableCard(label, 'Synthetic fixture load failed')));
    $('[data-map-routes]').replaceChildren(); $('[data-map-stops]').replaceChildren(); $('[data-map-vehicles]').replaceChildren();
    $('[data-map]').setAttribute('aria-disabled', 'true'); $('[data-map-empty]').hidden = false;
    $('[data-feed-health]').replaceChildren(el('p', 'phx-unavailable', 'Feed health unavailable because the local synthetic fixture failed to load.'));
    $('[data-alert-count]').textContent = 'Unavailable'; $('[data-alerts]').replaceChildren(el('p', 'phx-unavailable', 'Alert records unavailable.'));
    $('[data-inspector]').replaceChildren(el('strong', '', 'Record unavailable'), el('p', '', 'No selected record is presented as current.'));
    $('[data-composition]').replaceChildren(el('p', 'phx-unavailable', 'Fleet composition unavailable; no zero-service proportion is inferred.'));
    $('[data-record-count]').textContent = 'Records unavailable';
    const row = el('tr'); const cell = el('td', '', 'Synthetic fixture load failed. Route, vehicle, and trip records are unavailable.'); cell.colSpan = 5; row.append(cell); $('[data-records]').replaceChildren(row);
    app.querySelectorAll('.phx-controls button, .phx-controls select, .phx-controls input').forEach((control) => { control.disabled = true; });
    announce('Synthetic fixture error. All dashboard data regions are unavailable.');
  }

  async function init() {
    try {
      const [replayResponse, scenarioResponse] = await Promise.all([fetch(REPLAY_URL), fetch(SCENARIOS_URL)]);
      if (!replayResponse.ok || !scenarioResponse.ok) throw new Error('Synthetic fixture request failed.');
      const [data, scenarios] = await Promise.all([replayResponse.json(), scenarioResponse.json()]);
      if (data.meta?.providerData !== false || data.meta?.fixtureKind !== 'synthetic-operations-demo' || !Array.isArray(data.frames) || !data.frames.length || !Array.isArray(scenarios.scenarios)) throw new Error('Synthetic replay fixture is invalid.');
      state.data = data; state.scenarios = scenarios.scenarios;
      $('[data-timeline]').max = String(data.frames.length - 1);
      data.routes.forEach((route) => { const option = el('option', '', `${route.label} • ${route.mode}`); option.value = route.id; $('[data-route-filter]').append(option); });
      updateRouteOptions();
      $('[data-scenario]').replaceChildren();
      state.scenarios.forEach((scenario) => { const option = el('option', '', scenario.label); option.value = scenario.id; $('[data-scenario]').append(option); });
      const requested = new URLSearchParams(location.search).get('state');
      if (state.scenarios.some((scenario) => scenario.id === requested)) state.scenario = requested;
      $('[data-scenario]').value = state.scenario;
      bindControls(); render({ announceChange: true });
    } catch (error) {
      renderLoadFailure();
    }
  }
  init();
})();
