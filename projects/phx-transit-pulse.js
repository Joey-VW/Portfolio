(() => {
  'use strict';

  const REPLAY_URL = '/data/phx-transit/synthetic/operations-replay.json';
  const SCENARIOS_URL = '/data/phx-transit/synthetic/state-scenarios.json';
  const app = document.querySelector('.phx-dashboard');
  if (!app) return;

  const $ = (selector) => app.querySelector(selector);
  const $$ = (selector) => Array.from(app.querySelectorAll(selector));
  const svgNS = 'http://www.w3.org/2000/svg';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    data: null,
    scenarios: [],
    frame: 0,
    playing: false,
    timer: null,
    mode: 'all',
    route: 'all',
    scenario: 'current',
    selected: null,
    mapAdapter: null,
    mapStatus: 'loading'
  };
  const feedLabels = {
    vehicle_positions: 'Vehicle Positions',
    trip_updates: 'Trip Updates',
    service_alerts: 'Service Alerts'
  };
  const freshnessLabels = {
    fresh: 'Fresh',
    stale: 'Stale',
    very_stale: 'Very stale',
    unknown: 'Unknown'
  };

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

  function currentFrame() {
    return state.data.frames[state.frame];
  }

  function currentScenario() {
    return state.scenarios.find((item) => item.id === state.scenario) || state.scenarios[0];
  }

  function unavailableScenario() {
    return Boolean(currentScenario().hideCounts);
  }

  function mapUnavailable() {
    return unavailableScenario() || Boolean(currentScenario().emptyMap);
  }

  function unknown(value) {
    return value === null || value === undefined || value === '' ? 'Unknown' : value;
  }

  function routeById(id) {
    return state.data.routes.find((route) => route.id === id);
  }

  function announce(message) {
    $('[data-announcer]').textContent = message;
  }

  function setMapPresentation(status, message = '') {
    const shell = $('[data-map-shell]');
    const canvas = $('[data-interactive-map]');
    const fallback = $('[data-map-fallback]');
    const statusNode = $('[data-map-status]');
    const resetButton = $('[data-map-action="reset"]');
    state.mapStatus = status;
    shell.classList.toggle('phx-map-shell-fallback', status === 'fallback');
    canvas.hidden = status === 'fallback';
    fallback.hidden = status !== 'fallback';
    resetButton.disabled = status !== 'ready';

    if (status === 'ready') {
      statusNode.hidden = true;
      statusNode.querySelector('strong').textContent = '';
      return;
    }

    statusNode.hidden = false;
    statusNode.querySelector('strong').textContent = message || 'Loading interactive basemap';
  }

  async function initializeInteractiveMap() {
    setMapPresentation('loading');
    try {
      if (!window.PHXTransitMap?.initMap) {
        throw new Error('Interactive map adapter is unavailable.');
      }
      state.mapAdapter = await window.PHXTransitMap.initMap({
        container: $('[data-interactive-map]'),
        mapConfig: state.data.map,
        reducedMotion: reducedMotion.matches,
        onSelect: setSelection
      });
      setMapPresentation('ready');
      renderMap(currentFrame());
      announce('Interactive Phoenix-area basemap loaded. All operational overlays are fictional.');
    } catch (error) {
      state.mapAdapter = null;
      setMapPresentation(
        'fallback',
        'Interactive basemap unavailable - showing the fictional schematic fallback.'
      );
      renderMap(currentFrame());
      announce('Interactive basemap unavailable. The fictional schematic fallback and accessible records remain available.');
    }
  }

  function updateRouteOptions() {
    Array.from($('[data-route-filter]').options).forEach((option) => {
      const route = routeById(option.value);
      option.disabled = Boolean(route && state.mode !== 'all' && route.mode !== state.mode);
    });
  }

  function effectiveVehicle(vehicle) {
    if (currentScenario().state !== 'very_stale') return vehicle;
    return {
      ...vehicle,
      ageSeconds: Math.max(301, vehicle.ageSeconds + 300),
      freshness: 'very_stale'
    };
  }

  function matchingRoutes() {
    return state.data.routes.filter((route) => {
      const modeMatches = state.mode === 'all' || route.mode === state.mode;
      const routeMatches = state.route === 'all' || route.id === state.route;
      return modeMatches && routeMatches;
    });
  }

  function visibleRoutes() {
    return mapUnavailable() ? [] : matchingRoutes();
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
    const routeIds = new Set(matchingRoutes().map((route) => route.id));
    return frame.alerts.filter((alert) => alert.routes.some((routeId) => routeIds.has(routeId)));
  }

  function visibleRouteSignals(frame = currentFrame()) {
    if (unavailableScenario()) return [];
    const routeIds = new Set(matchingRoutes().map((route) => route.id));
    return frame.routeSignals.filter((signal) => routeIds.has(signal.routeId));
  }

  function selectionIsValid(frame = currentFrame()) {
    if (!state.selected || unavailableScenario()) return false;
    if (state.selected.type === 'vehicle') return visibleVehicles(frame).some((vehicle) => vehicle.id === state.selected.id);
    if (state.selected.type === 'route') return matchingRoutes().some((route) => route.id === state.selected.id);
    if (state.selected.type === 'alert') return visibleAlerts(frame).some((alert) => alert.id === state.selected.id);
    return false;
  }

  function normalizeSelection(frame = currentFrame()) {
    if (state.selected && !selectionIsValid(frame)) state.selected = null;
  }

  function setSelection(type, id) {
    if (unavailableScenario()) return;
    state.selected = { type, id };
    render();
    announce(`Selected fictional ${type} ${id}.`);
  }

  function derive(frame) {
    const vehicles = visibleVehicles(frame);
    const routeSignals = visibleRouteSignals(frame);
    const eligibleDelays = routeSignals.map((item) => item.predictedDelayMinutes).filter(Number.isFinite);
    const averageDelay = eligibleDelays.length
      ? eligibleDelays.reduce((total, value) => total + value, 0) / eligibleDelays.length
      : null;
    return {
      vehicles,
      active: vehicles.filter((vehicle) => vehicle.ageSeconds <= 90).length,
      bus: vehicles.filter((vehicle) => vehicle.mode === 'bus').length,
      rail: vehicles.filter((vehicle) => vehicle.mode === 'rail').length,
      unknownMode: vehicles.filter((vehicle) => vehicle.mode !== 'bus' && vehicle.mode !== 'rail').length,
      fresh: vehicles.filter((vehicle) => vehicle.freshness === 'fresh').length,
      stale: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
      veryStale: vehicles.filter((vehicle) => vehicle.freshness === 'very_stale').length,
      missing: vehicles.filter((vehicle) => !vehicle.routeId || !vehicle.tripId).length,
      alerts: visibleAlerts(frame).length,
      cancelled: frame.tripStates.filter((trip) => trip.state === 'cancelled').length,
      skipped: frame.tripStates.filter((trip) => trip.state === 'skipped_stop').length,
      averageDelay
    };
  }

  function formatReplayTime(timestamp, includeDate = false) {
    return new Intl.DateTimeFormat('en-US', {
      ...(includeDate ? { month: 'short', day: 'numeric' } : {}),
      hour: 'numeric',
      minute: '2-digit',
      second: includeDate ? '2-digit' : undefined,
      timeZone: 'America/Phoenix'
    }).format(new Date(timestamp));
  }

  function renderStatus(frame) {
    const scenario = currentScenario();
    app.dataset.appState = scenario.state;
    $('[data-replay-time]').textContent = formatReplayTime(frame.timestamp, true);
    $('[data-clock-time]').textContent = formatReplayTime(frame.timestamp);
    $('[data-frame-count]').textContent = `${state.frame + 1} / ${state.data.frames.length}`;
    $('[data-timeline]').value = state.frame;
    $('[data-play-label]').textContent = state.playing ? 'Pause' : 'Play';
    $('[data-play-icon]').textContent = state.playing ? 'Ⅱ' : '▶';
    $('[data-action="play"]').setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} synthetic replay`);
    $('[data-state-title]').textContent = scenario.label;
    $('[data-state-message]').textContent = scenario.message;
    $('[data-primary-state] strong').textContent = scenario.label;

    const modeLabel = state.mode === 'all' ? 'All modes' : state.mode === 'rail' ? 'Light rail' : 'Bus';
    const routeLabel = state.route === 'all' ? '' : ` - ${routeById(state.route)?.label || state.route}`;
    $('[data-map-filter]').textContent = `${modeLabel}${routeLabel}`;
  }

  function renderKpis(frame) {
    const counts = derive(frame);
    const unavailable = unavailableScenario();
    const delayValue = counts.averageDelay === null ? 'Unavailable' : `${counts.averageDelay.toFixed(1)} min`;
    const values = [
      {
        label: 'Active vehicles',
        value: unavailable ? 'Unavailable' : counts.active,
        note: unavailable ? 'Synthetic state unavailable' : `${counts.vehicles.length} plotted - age ≤ 90 sec`,
        icon: '▣'
      },
      {
        label: 'Active alerts',
        value: unavailable ? 'Unavailable' : counts.alerts,
        note: unavailable ? 'Synthetic state unavailable' : 'Fictional source notices',
        icon: '!'
      },
      {
        label: 'Avg predicted delay',
        value: unavailable ? 'Unavailable' : delayValue,
        note: unavailable ? 'Synthetic state unavailable' : '<b>Provisional</b> fixture formula',
        icon: 'Δ',
        html: true
      },
      {
        label: 'Missing enrichment',
        value: unavailable ? 'Unavailable' : counts.missing,
        note: unavailable ? 'Synthetic state unavailable' : 'Route or trip context unknown',
        icon: '◇'
      }
    ];

    const root = $('[data-kpis]');
    root.replaceChildren();
    values.forEach((item) => {
      const card = el('article', 'phx-kpi');
      card.dataset.icon = item.icon;
      const note = el('small');
      if (item.html) note.innerHTML = item.note;
      else note.textContent = item.note;
      card.append(el('span', '', item.label), el('strong', '', String(item.value)), note);
      root.append(card);
    });
  }

  function renderMapRecordOptions(frame) {
    const select = $('[data-map-record]');
    const selectedValue = state.selected ? `${state.selected.type}:${state.selected.id}` : '';
    const groups = [
      {
        label: 'Fictional routes',
        type: 'route',
        records: visibleRoutes(),
        text: (route) => `${route.label} - ${route.mode === 'rail' ? 'light rail' : route.mode}`
      },
      {
        label: 'Visible vehicles',
        type: 'vehicle',
        records: visibleVehicles(frame),
        text: (vehicle) => `${vehicle.id} - ${unknown(routeById(vehicle.routeId)?.label)}`
      },
      {
        label: 'Visible alerts',
        type: 'alert',
        records: visibleAlerts(frame),
        text: (alert) => alert.title
      }
    ];

    select.replaceChildren();
    const prompt = el('option', '', mapUnavailable() ? 'Map records unavailable' : 'Map records');
    prompt.value = '';
    select.append(prompt);
    groups.forEach((group) => {
      if (!group.records.length) return;
      const options = document.createElement('optgroup');
      options.label = group.label;
      group.records.forEach((record) => {
        const option = el('option', '', group.text(record));
        option.value = `${group.type}:${record.id}`;
        options.append(option);
      });
      select.append(options);
    });
    select.disabled = mapUnavailable();
    select.value = Array.from(select.options).some((option) => option.value === selectedValue)
      ? selectedValue
      : '';
  }

  function renderMap(frame) {
    const routesRoot = $('[data-map-routes]');
    const stopsRoot = $('[data-map-stops]');
    const alertsRoot = $('[data-map-alerts]');
    const vehiclesRoot = $('[data-map-vehicles]');
    routesRoot.replaceChildren();
    stopsRoot.replaceChildren();
    alertsRoot.replaceChildren();
    vehiclesRoot.replaceChildren();

    const unavailable = mapUnavailable();
    const matchingRouteIds = new Set(matchingRoutes().map((route) => route.id));
    const selectedAlert = state.selected?.type === 'alert'
      ? frame.alerts.find((alert) => alert.id === state.selected.id)
      : null;
    const affectedRoutes = new Set(selectedAlert ? selectedAlert.routes : visibleAlerts(frame).flatMap((alert) => alert.routes));
    const affectedStops = new Set(selectedAlert ? selectedAlert.stops : visibleAlerts(frame).flatMap((alert) => alert.stops));

    if (!unavailable) {
      state.data.routes.forEach((route) => {
        const matches = matchingRouteIds.has(route.id);
        const selected = state.selected?.type === 'route' && state.selected.id === route.id;
        const alertFocused = affectedRoutes.has(route.id);
        const className = [
          'map-route',
          route.color,
          matches ? '' : 'is-muted',
          selected ? 'is-selected' : '',
          alertFocused ? 'is-alert-focused' : ''
        ].filter(Boolean).join(' ');
        const line = svgEl('path', { d: route.path, class: className });
        routesRoot.append(line);
        if (matches) {
          const hit = svgEl('path', {
            d: route.path,
            class: 'route-hit',
            tabindex: '0',
            role: 'button',
            'aria-label': `Select fictional route ${route.label}, ${route.mode}, ${route.direction}`
          });
          const select = () => setSelection('route', route.id);
          hit.addEventListener('click', select);
          hit.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              select();
            }
          });
          routesRoot.append(hit);
        }
      });

      state.data.stops.forEach((stop) => {
        const routeVisible = stop.routes.some((routeId) => matchingRouteIds.has(routeId));
        if (!routeVisible) return;
        const alertFocused = affectedStops.has(stop.id);
        const circle = svgEl('circle', {
          cx: stop.x,
          cy: stop.y,
          r: 5,
          class: `map-stop${alertFocused ? ' is-alert' : ''}`
        });
        const label = svgEl('text', {
          x: stop.x + 9,
          y: stop.y - 9,
          class: 'map-stop-label'
        });
        label.textContent = stop.label;
        stopsRoot.append(circle, label);
      });

      visibleAlerts(frame).forEach((alert) => {
        if (!Number.isFinite(alert.x) || !Number.isFinite(alert.y)) return;
        const group = svgEl('g', {
          class: 'map-alert',
          transform: `translate(${alert.x} ${alert.y})`,
          tabindex: '0',
          role: 'button',
          'aria-label': `Select fictional alert ${alert.title}`
        });
        group.append(svgEl('circle', { r: 12 }), svgEl('text', { 'text-anchor': 'middle', y: '4' }));
        group.lastChild.textContent = '!';
        const select = () => setSelection('alert', alert.id);
        group.addEventListener('click', select);
        group.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        });
        alertsRoot.append(group);
      });

      visibleVehicles(frame).forEach((vehicle) => {
        const selected = state.selected?.type === 'vehicle' && state.selected.id === vehicle.id;
        const route = routeById(vehicle.routeId);
        const group = svgEl('g', {
          class: `map-vehicle ${vehicle.mode} ${vehicle.freshness}${selected ? ' is-selected' : ''}`,
          transform: `translate(${vehicle.x} ${vehicle.y})`,
          tabindex: '0',
          role: 'button',
          'aria-label': `Select ${vehicle.id}, ${unknown(route?.label)}, ${freshnessLabels[vehicle.freshness]}, vehicle age ${vehicle.ageSeconds} seconds`
        });
        group.append(
          svgEl('circle', { r: vehicle.mode === 'rail' ? 17 : 15, class: 'vehicle-halo' }),
          svgEl('circle', { r: vehicle.mode === 'rail' ? 10 : 9, class: 'vehicle-body' }),
          svgEl('text', { 'text-anchor': 'middle', y: '3' })
        );
        group.lastChild.textContent = vehicle.mode === 'rail' ? 'R' : vehicle.mode === 'bus' ? 'B' : '?';
        const select = () => setSelection('vehicle', vehicle.id);
        group.addEventListener('click', select);
        group.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        });
        vehiclesRoot.append(group);
      });
    }

    $('[data-map-empty]').hidden = !unavailable;
    $('[data-map]').setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    $('[data-interactive-map]').setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    renderMapRecordOptions(frame);

    if (state.mapAdapter?.isReady()) {
      state.mapAdapter.setMapData({
        routes: state.data.routes,
        stops: state.data.stops,
        alerts: frame.alerts,
        vehicles: frame.vehicles.map(effectiveVehicle)
      });
      state.mapAdapter.setMapFilters({
        mode: state.mode,
        routeId: state.route
      });
      state.mapAdapter.setMapSelection(state.selected);
      state.mapAdapter.setMapScenario({
        mapUnavailable: unavailable
      });
    }
  }

  function renderAlerts(frame) {
    const root = $('[data-alerts]');
    root.replaceChildren();
    const alerts = visibleAlerts(frame);
    $('[data-alert-count]').textContent = unavailableScenario() ? '–' : String(alerts.length);

    if (unavailableScenario()) {
      root.append(el('p', '', `${currentScenario().label}: alert records are unavailable.`));
      return;
    }
    if (!alerts.length) {
      root.append(el('p', '', 'No active fictional alerts in this filtered frame.'));
      return;
    }

    alerts.forEach((alert) => {
      const button = el('button', `phx-alert${state.selected?.type === 'alert' && state.selected.id === alert.id ? ' is-selected' : ''}`);
      button.type = 'button';
      button.dataset.severity = alert.severity;
      button.append(
        el('strong', '', alert.title),
        el('small', '', `${alert.effect} - ${alert.routes.map((routeId) => routeById(routeId)?.label || routeId).join(', ')}`),
        el('time', '', alert.displayTime)
      );
      button.addEventListener('click', () => setSelection('alert', alert.id));
      root.append(button);
    });
  }

  function renderRouteSignals(frame) {
    const root = $('[data-route-signals]');
    root.replaceChildren();
    const signals = visibleRouteSignals(frame);

    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', `${currentScenario().label}: route signals are unavailable.`));
      return;
    }

    const header = el('div', 'phx-route-row');
    header.append(el('span', '', 'Route'), el('span', '', 'Vehicles'), el('span', '', 'Pred. delay'), el('span', '', ''));
    root.append(header);

    signals
      .slice()
      .sort((a, b) => b.predictedDelayMinutes - a.predictedDelayMinutes)
      .forEach((signal) => {
        const route = routeById(signal.routeId);
        const button = el('button', `phx-route-row${state.selected?.type === 'route' && state.selected.id === signal.routeId ? ' is-selected' : ''}`);
        button.type = 'button';
        button.dataset.status = signal.status;
        button.append(
          el('strong', '', route?.label || signal.routeId),
          el('span', '', String(signal.activeVehicles)),
          el('span', 'route-delay', `${signal.predictedDelayMinutes.toFixed(1)} min`),
          el('i')
        );
        button.addEventListener('click', () => setSelection('route', signal.routeId));
        root.append(button);
      });
  }

  function renderFreshness(frame) {
    const root = $('[data-freshness-chart]');
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', 'Vehicle freshness unavailable.'));
      return;
    }

    const counts = derive(frame);
    const total = counts.vehicles.length || 1;
    const rows = [
      ['Fresh', counts.fresh, 'var(--phx-teal)'],
      ['Stale', counts.stale, 'var(--phx-amber)'],
      ['Very stale', counts.veryStale, 'var(--phx-red)']
    ];
    rows.forEach(([label, count, color]) => {
      const row = el('div', 'phx-metric-bar');
      const bar = el('i');
      bar.style.setProperty('--value', `${count / total * 100}%`);
      bar.style.setProperty('--bar-color', color);
      row.append(el('span', '', label), bar, el('b', '', String(count)));
      root.append(row);
    });
  }

  function renderTripExceptions(frame) {
    const root = $('[data-trip-exceptions]');
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', 'Trip exceptions unavailable.'));
      return;
    }
    const counts = derive(frame);
    [['Cancelled', counts.cancelled], ['Skipped stops', counts.skipped]].forEach(([label, value]) => {
      const card = el('div', 'phx-exception');
      card.append(el('strong', '', String(value)), el('span', '', label));
      root.append(card);
    });
  }

  function renderFleetMix(frame) {
    const root = $('[data-fleet-mix]');
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', 'Fleet mix unavailable.'));
      return;
    }
    const counts = derive(frame);
    const total = counts.vehicles.length || 1;
    const known = counts.bus + counts.rail;
    const busShare = known ? counts.bus / known * 100 : 50;
    const donut = el('div', 'phx-donut');
    donut.style.setProperty('--bus', `${busShare}%`);
    donut.append(el('strong', '', String(counts.vehicles.length)));
    const legend = el('div', 'phx-donut-legend');
    [['Bus', counts.bus], ['Light rail', counts.rail], ['Unknown', counts.unknownMode]].forEach(([label, value]) => {
      const item = el('span');
      item.append(el('i'), document.createTextNode(`${label} ${value}`));
      legend.append(item);
    });
    root.append(donut, legend);
  }

  function renderFeeds(frame) {
    const root = $('[data-feed-health]');
    root.replaceChildren();
    const list = el('div', 'phx-feed-list');
    const scenario = currentScenario();
    Object.entries(frame.feeds).forEach(([key, feed]) => {
      const status = scenario.feedStatus || (unavailableScenario() ? scenario.state : feed.status);
      const row = el('div', 'phx-feed-row');
      row.append(
        el('strong', '', feedLabels[key]),
        el('span', '', unavailableScenario() ? 'Feed age unavailable' : `Header age ${feed.ageSeconds} sec`),
        el('b', `status-${status}`, status.replace('_', ' '))
      );
      list.append(row);
    });
    root.append(list);
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
      root.append(el('p', '', `${currentScenario().label}: no record is presented as current.`));
      return;
    }
    if (!state.selected) {
      root.append(el('p', '', 'Select a route line, vehicle marker, or alert to inspect its fictional source record.'));
      return;
    }

    let pairs = [];
    if (state.selected.type === 'vehicle') {
      const vehicle = visibleVehicles(frame).find((item) => item.id === state.selected.id);
      if (!vehicle) return;
      pairs = [
        ['Vehicle', vehicle.id],
        ['Route', unknown(routeById(vehicle.routeId)?.label)],
        ['Mode', unknown(vehicle.mode)],
        ['Vehicle age', `${vehicle.ageSeconds} sec`],
        ['Freshness', freshnessLabels[vehicle.freshness]],
        ['Trip', unknown(vehicle.tripId)],
        ['Status', vehicle.status],
        ['Stop', unknown(vehicle.stop)]
      ];
    }
    if (state.selected.type === 'route') {
      const route = routeById(state.selected.id);
      const signal = frame.routeSignals.find((item) => item.routeId === route.id);
      pairs = [
        ['Route ID', route.id],
        ['Label', route.label],
        ['Mode', route.mode],
        ['Direction', route.direction],
        ['Visible vehicles', visibleVehicles(frame).filter((vehicle) => vehicle.routeId === route.id).length],
        ['Predicted delay', signal ? `${signal.predictedDelayMinutes.toFixed(1)} min - provisional` : 'Unavailable']
      ];
    }
    if (state.selected.type === 'alert') {
      const alert = visibleAlerts(frame).find((item) => item.id === state.selected.id);
      if (!alert) return;
      pairs = [
        ['Alert ID', alert.id],
        ['Title', alert.title],
        ['Effect', alert.effect],
        ['Period', alert.period],
        ['Routes', alert.routes.join(', ')],
        ['Stops', alert.stops.join(', ')]
      ];
    }
    appendDefinitionList(root, pairs);
  }

  function appendRecordRow(tbody, values) {
    const row = el('tr');
    values.forEach(([content, label]) => {
      const cell = el('td');
      cell.dataset.label = label;
      typeof content === 'string' ? (cell.textContent = content) : cell.append(content);
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
      const row = el('tr');
      row.append(cell);
      tbody.append(row);
      return;
    }

    const routes = matchingRoutes();
    const vehicles = visibleVehicles(frame);
    $('[data-record-count]').textContent = `${routes.length} routes - ${vehicles.length} vehicles`;

    routes.forEach((route) => {
      const button = el('button', '', `${route.label} (${route.id})`);
      button.type = 'button';
      button.addEventListener('click', () => setSelection('route', route.id));
      const count = vehicles.filter((vehicle) => vehicle.routeId === route.id).length;
      const affected = visibleAlerts(frame).some((alert) => alert.routes.includes(route.id)) ? 'Alert affected' : 'No active alert';
      appendRecordRow(tbody, [
        [button, 'Record'],
        [`${route.id} / ${route.mode}`, 'Route / mode'],
        ['Static fixture record', 'Freshness'],
        [affected, 'Status'],
        [`${route.direction} - ${count} visible vehicles`, 'Stop / direction']
      ]);
    });

    vehicles.forEach((vehicle) => {
      const route = routeById(vehicle.routeId);
      const button = el('button', '', vehicle.id);
      button.type = 'button';
      button.addEventListener('click', () => setSelection('vehicle', vehicle.id));
      appendRecordRow(tbody, [
        [button, 'Record'],
        [`${unknown(route?.label)} / ${vehicle.mode}`, 'Route / mode'],
        [`${freshnessLabels[vehicle.freshness]} (${vehicle.ageSeconds} sec vehicle age)`, 'Freshness'],
        [vehicle.status, 'Status'],
        [`${unknown(vehicle.stop)} / ${unknown(vehicle.direction)}`, 'Stop / direction']
      ]);
    });

    frame.tripStates.forEach((trip) => {
      if (!routes.some((route) => route.id === trip.routeId)) return;
      appendRecordRow(tbody, [
        [trip.tripId, 'Record'],
        [unknown(routeById(trip.routeId)?.label), 'Route / mode'],
        [trip.state.replace('_', ' '), 'Freshness'],
        [trip.label, 'Status'],
        [trip.stop || 'Not applicable', 'Stop / direction']
      ]);
    });
  }

  function render({ announceChange = false } = {}) {
    const frame = currentFrame();
    normalizeSelection(frame);
    renderStatus(frame);
    renderKpis(frame);
    renderMap(frame);
    renderAlerts(frame);
    renderRouteSignals(frame);
    renderFreshness(frame);
    renderTripExceptions(frame);
    renderFleetMix(frame);
    renderFeeds(frame);
    renderInspector(frame);
    renderRecords(frame);
    if (announceChange) {
      announce(`${currentScenario().label}. Synthetic frame ${state.frame + 1} of ${state.data.frames.length}. ${currentScenario().message}`);
    }
  }

  function stopReplay() {
    clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
  }

  function startReplay() {
    if (reducedMotion.matches) {
      stopReplay();
      announce('Autoplay is disabled because reduced motion is enabled. Use previous or next frame.');
      render();
      return;
    }
    if (state.frame === state.data.frames.length - 1) state.frame = 0;
    state.playing = true;
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (state.frame >= state.data.frames.length - 1) {
        stopReplay();
        render({ announceChange: true });
        return;
      }
      state.frame += 1;
      render({ announceChange: true });
    }, state.data.meta.frameIntervalMs);
    render();
  }

  function moveFrame(delta) {
    stopReplay();
    state.frame = Math.max(0, Math.min(state.data.frames.length - 1, state.frame + delta));
    render({ announceChange: true });
  }

  function resetFilters() {
    state.mode = 'all';
    state.route = 'all';
    state.selected = null;
    $('[data-route-filter]').value = 'all';
    $$('[data-mode]').forEach((button) => {
      const active = button.dataset.mode === 'all';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateRouteOptions();
    state.mapAdapter?.resetMapView();
    render({ announceChange: true });
  }

  function bindControls() {
    $('[data-action="restart"]').addEventListener('click', () => {
      stopReplay();
      state.frame = 0;
      render({ announceChange: true });
    });
    $('[data-action="previous"]').addEventListener('click', () => moveFrame(-1));
    $('[data-action="next"]').addEventListener('click', () => moveFrame(1));
    $('[data-action="play"]').addEventListener('click', () => {
      if (state.playing) {
        stopReplay();
        render({ announceChange: true });
      } else {
        startReplay();
      }
    });
    $('[data-action="reset"]').addEventListener('click', resetFilters);
    $('[data-map-action="reset"]').addEventListener('click', () => {
      if (!state.mapAdapter?.isReady()) {
        announce('Interactive basemap controls are unavailable while the schematic fallback is active.');
        return;
      }
      state.mapAdapter.resetMapView();
      announce('Interactive map recentered on the fictional Phoenix-area network.');
    });
    $('[data-map-record]').addEventListener('change', (event) => {
      if (!event.target.value) return;
      const [type, ...idParts] = event.target.value.split(':');
      setSelection(type, idParts.join(':'));
    });
    $('[data-timeline]').addEventListener('input', (event) => {
      stopReplay();
      state.frame = Number(event.target.value);
      render({ announceChange: true });
    });

    $$('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        $$('[data-mode]').forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle('is-active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });
        const selectedRoute = routeById(state.route);
        if (selectedRoute && state.mode !== 'all' && selectedRoute.mode !== state.mode) {
          state.route = 'all';
          $('[data-route-filter]').value = 'all';
        }
        updateRouteOptions();
        state.selected = null;
        render({ announceChange: true });
      });
    });

    $('[data-route-filter]').addEventListener('change', (event) => {
      state.route = event.target.value;
      state.selected = state.route === 'all' ? null : { type: 'route', id: state.route };
      render({ announceChange: true });
    });

    $('[data-scenario]').addEventListener('change', (event) => {
      stopReplay();
      state.scenario = event.target.value;
      state.selected = null;
      const url = new URL(location.href);
      state.scenario === 'current' ? url.searchParams.delete('state') : url.searchParams.set('state', state.scenario);
      history.replaceState(null, '', url);
      render({ announceChange: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.playing) {
        stopReplay();
        render();
        announce('Synthetic replay paused because the document is hidden.');
      }
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) stopReplay();
      state.mapAdapter?.setReducedMotion?.(reducedMotion.matches);
      render({ announceChange: true });
    });
    window.addEventListener('beforeunload', () => {
      state.mapAdapter?.destroyMap();
    }, { once: true });
  }

  function renderLoadFailure() {
    stopReplay();
    state.mapAdapter?.destroyMap();
    state.mapAdapter = null;
    setMapPresentation(
      'fallback',
      'Interactive map not initialized because the synthetic fixture is unavailable.'
    );
    app.dataset.appState = 'feed_error';
    $('[data-primary-state] strong').textContent = 'Synthetic fixture error';
    $('[data-replay-time]').textContent = 'Unavailable';
    $('[data-clock-time]').textContent = 'Replay unavailable';
    $('[data-state-title]').textContent = 'Synthetic fixture error';
    $('[data-state-message]').textContent = 'The local fictional fixture could not be loaded. No live or provider data was requested.';
    $('[data-map-empty]').hidden = false;
    $('[data-map]').setAttribute('aria-disabled', 'true');
    $('[data-interactive-map]').setAttribute('aria-disabled', 'true');
    $('[data-map-routes]').replaceChildren();
    $('[data-map-stops]').replaceChildren();
    $('[data-map-alerts]').replaceChildren();
    $('[data-map-vehicles]').replaceChildren();
    $('[data-kpis]').replaceChildren(el('p', 'phx-unavailable', 'Snapshot cards unavailable.'));
    $('[data-alerts]').replaceChildren(el('p', 'phx-unavailable', 'Alert records unavailable.'));
    $('[data-route-signals]').replaceChildren(el('p', 'phx-unavailable', 'Route signals unavailable.'));
    $('[data-freshness-chart]').replaceChildren(el('p', 'phx-unavailable', 'Vehicle freshness unavailable.'));
    $('[data-trip-exceptions]').replaceChildren(el('p', 'phx-unavailable', 'Trip exceptions unavailable.'));
    $('[data-fleet-mix]').replaceChildren(el('p', 'phx-unavailable', 'Fleet mix unavailable.'));
    $('[data-feed-health]').replaceChildren(el('p', 'phx-unavailable', 'Feed health unavailable.'));
    $('[data-inspector]').replaceChildren(el('p', 'phx-unavailable', 'No selected record is presented as current.'));
    $('[data-record-count]').textContent = 'Records unavailable';
    $('[data-records]').replaceChildren();
    $('[data-map-record]').replaceChildren(el('option', '', 'Map records unavailable'));
    $('[data-map-record]').disabled = true;
    $$('.phx-control-stack button, .phx-control-stack select, .phx-control-stack input').forEach((control) => {
      control.disabled = true;
    });
    announce('Synthetic fixture error. All dashboard data regions are unavailable.');
  }

  async function init() {
    try {
      const [replayResponse, scenarioResponse] = await Promise.all([
        fetch(REPLAY_URL),
        fetch(SCENARIOS_URL)
      ]);
      if (!replayResponse.ok || !scenarioResponse.ok) throw new Error('Synthetic fixture request failed.');
      const [data, scenarios] = await Promise.all([replayResponse.json(), scenarioResponse.json()]);
      const validFixture = data.meta?.providerData === false
        && data.meta?.fixtureKind === 'synthetic-operations-demo'
        && Array.isArray(data.frames)
        && data.frames.length
        && Array.isArray(scenarios.scenarios);
      if (!validFixture) throw new Error('Synthetic replay fixture is invalid.');

      state.data = data;
      state.scenarios = scenarios.scenarios;
      $('[data-timeline]').max = String(data.frames.length - 1);
      data.routes.forEach((route) => {
        const option = el('option', '', `${route.label} - ${route.mode === 'rail' ? 'light rail' : route.mode}`);
        option.value = route.id;
        $('[data-route-filter]').append(option);
      });
      updateRouteOptions();

      $('[data-scenario]').replaceChildren();
      state.scenarios.forEach((scenario) => {
        const option = el('option', '', scenario.label);
        option.value = scenario.id;
        $('[data-scenario]').append(option);
      });
      const requested = new URLSearchParams(location.search).get('state');
      if (state.scenarios.some((scenario) => scenario.id === requested)) state.scenario = requested;
      $('[data-scenario]').value = state.scenario;

      bindControls();
      render({ announceChange: true });
      void initializeInteractiveMap();
    } catch (error) {
      renderLoadFailure();
    }
  }

  init();
})();
