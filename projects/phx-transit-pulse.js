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
  const mobileLayout = window.matchMedia('(max-width: 780px)');
  const localMapFallbackQa = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get('phxMapQa') === 'fallback';
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

  function geometryMetrics(coordinates) {
    const latitude = coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length;
    const longitudeScale = Math.cos(latitude * Math.PI / 180);
    const lengths = coordinates.slice(1).map((coordinate, index) => {
      const previous = coordinates[index];
      return Math.hypot((coordinate[0] - previous[0]) * longitudeScale, coordinate[1] - previous[1]);
    });
    return { lengths, total: lengths.reduce((sum, length) => sum + length, 0) };
  }

  function pointAlong(coordinates, progress) {
    const safeProgress = Math.max(0, Math.min(1, progress));
    const { lengths, total } = geometryMetrics(coordinates);
    let remaining = total * safeProgress;
    for (let index = 0; index < lengths.length; index += 1) {
      if (remaining <= lengths[index] || index === lengths.length - 1) {
        const ratio = lengths[index] ? remaining / lengths[index] : 0;
        const start = coordinates[index];
        const end = coordinates[index + 1];
        return {
          longitude: start[0] + (end[0] - start[0]) * ratio,
          latitude: start[1] + (end[1] - start[1]) * ratio,
          bearing: (Math.atan2(
            (end[0] - start[0]) * Math.cos(((start[1] + end[1]) / 2) * Math.PI / 180),
            end[1] - start[1]
          ) * 180 / Math.PI + 360) % 360
        };
      }
      remaining -= lengths[index];
    }
    return { longitude: coordinates[0][0], latitude: coordinates[0][1], bearing: 0 };
  }

  function distanceKilometers(first, second) {
    const latitudeScale = 111.32;
    const longitudeScale = latitudeScale * Math.cos(((first.latitude + second.latitude) / 2) * Math.PI / 180);
    return Math.hypot(
      (first.longitude - second.longitude) * longitudeScale,
      (first.latitude - second.latitude) * latitudeScale
    );
  }

  function projectPointToGeometry(point, coordinates) {
    const { lengths, total } = geometryMetrics(coordinates);
    const longitudeScale = Math.cos(point.latitude * Math.PI / 180);
    let traversed = 0;
    let best = null;
    coordinates.slice(1).forEach((end, index) => {
      const start = coordinates[index];
      const dx = (end[0] - start[0]) * longitudeScale;
      const dy = end[1] - start[1];
      const px = (point.longitude - start[0]) * longitudeScale;
      const py = point.latitude - start[1];
      const ratio = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
      const projected = {
        longitude: start[0] + (end[0] - start[0]) * ratio,
        latitude: start[1] + (end[1] - start[1]) * ratio
      };
      const candidate = {
        distanceKm: distanceKilometers(point, projected),
        progress: (traversed + lengths[index] * ratio) / total
      };
      if (!best || candidate.distanceKm < best.distanceKm) best = candidate;
      traversed += lengths[index];
    });
    return best;
  }

  function sliceGeometry(coordinates, startProgress, endProgress) {
    const { lengths, total } = geometryMetrics(coordinates);
    const cumulative = [0];
    lengths.forEach((length) => cumulative.push(cumulative.at(-1) + length));
    const start = pointAlong(coordinates, startProgress);
    const end = pointAlong(coordinates, endProgress);
    return [[start.longitude, start.latitude], ...coordinates.filter((coordinate, index) => {
      const progress = cumulative[index] / total;
      return progress > startProgress && progress < endProgress;
    }), [end.longitude, end.latitude]];
  }

  function projectToSchematic(record, map) {
    const [[west, south], [east, north]] = map.bounds;
    return {
      x: 50 + ((record.longitude - west) / (east - west)) * 800,
      y: 580 - ((record.latitude - south) / (north - south)) * 540
    };
  }

  function schematicPath(coordinates, map) {
    return `M${coordinates.map((coordinate) => {
      const point = projectToSchematic({ longitude: coordinate[0], latitude: coordinate[1] }, map);
      return `${point.x} ${point.y}`;
    }).join(' L')}`;
  }

  function hydrateFixture(data) {
    const patterns = new Map(data.routes.flatMap((route) => route.patterns.map((pattern) => [pattern.id, pattern])));
    const stops = new Map(data.stops.map((stop) => [stop.id, stop]));
    data.routes.forEach((route) => {
      const displayPattern = patterns.get(route.displayPatternId);
      route.geometry = displayPattern.geometry;
      route.path = schematicPath(displayPattern.geometry.coordinates, data.map);
    });
    data.frames.forEach((frame) => {
      frame.vehicles.forEach((vehicle) => {
        if (!vehicle.patternId) return;
        const pattern = patterns.get(vehicle.patternId);
        const position = pointAlong(pattern.geometry.coordinates, vehicle.progress);
        Object.assign(vehicle, position, projectToSchematic(position, data.map), {
          direction: pattern.headsign
        });
        const orderedStops = pattern.stopIds.map((id) => stops.get(id));
        const stopProgress = orderedStops.map((stop) => ({
          stop,
          ...projectPointToGeometry(stop, pattern.geometry.coordinates)
        }));
        const nearest = stopProgress.reduce((best, item) => (
          distanceKilometers(position, item.stop) < distanceKilometers(position, best.stop) ? item : best
        ));
        const next = stopProgress.find((item) => item.progress >= vehicle.progress) || stopProgress.at(-1);
        const nearestDistance = distanceKilometers(position, nearest.stop);
        const nextDistance = distanceKilometers(position, next.stop);
        const atStop = nearestDistance <= 0.2;
        const context = atStop ? nearest : next;
        vehicle.stop = context.stop.label;
        vehicle.nearestStopId = nearest.stop.id;
        vehicle.nextStopId = next.stop.id;
        vehicle.status = atStop ? 'At stop' : nextDistance <= 1.2 ? 'Approaching' : 'In transit';
      });
      frame.alerts.forEach((alert) => {
        if (!alert.patternId || !alert.segmentProgress) return;
        const pattern = patterns.get(alert.patternId);
        alert.segmentGeometry = {
          type: 'LineString',
          coordinates: sliceGeometry(pattern.geometry.coordinates, ...alert.segmentProgress)
        };
        const midpoint = pointAlong(pattern.geometry.coordinates, (alert.segmentProgress[0] + alert.segmentProgress[1]) / 2);
        Object.assign(alert, midpoint, projectToSchematic(midpoint, data.map));
        alert.segmentPath = schematicPath(alert.segmentGeometry.coordinates, data.map);
      });
    });
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

  function stopById(id) {
    return state.data.stops.find((stop) => stop.id === id);
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
      if (localMapFallbackQa) throw new Error('Local QA requested the schematic map fallback.');
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

  function setMobileDisclosure(panel, expanded) {
    if (!panel) return;
    panel.dataset.mobileCollapsed = String(!expanded);
    panel.querySelector('[data-mobile-disclosure-toggle]')
      ?.setAttribute('aria-expanded', String(expanded));
  }

  function updateInspectorSummary() {
    const summary = $('[data-inspector-summary]');
    if (!summary) return;
    if (!state.selected) {
      summary.textContent = 'Selected item - none';
      return;
    }
    if (state.selected.type === 'route') {
      summary.textContent = `Selected route - ${routeById(state.selected.id)?.label || state.selected.id}`;
      return;
    }
    if (state.selected.type === 'alert') {
      const alert = visibleAlerts(currentFrame()).find((item) => item.id === state.selected.id);
      summary.textContent = `Selected alert - ${alert?.title || state.selected.id}`;
      return;
    }
    summary.textContent = `Selected vehicle - ${state.selected.id}`;
  }

  function syncMobileHierarchy(event) {
    const isMobile = event?.matches ?? mobileLayout.matches;
    const controls = $('.phx-control-stack');
    const navigation = $('.phx-project-links');
    const operationsGrid = $('.phx-ops-grid');
    const mapPanel = $('.phx-map-panel');
    const snapshot = $('.phx-snapshot');
    const controlTarget = isMobile ? $('[data-mobile-controls-host]') : $('[data-control-home]');
    const navigationTarget = isMobile ? $('[data-mobile-nav-host]') : $('.phx-sidebar');
    if (controls && controlTarget && controls.parentElement !== controlTarget) controlTarget.append(controls);
    if (navigation && navigationTarget && navigation.parentElement !== navigationTarget) navigationTarget.append(navigation);
    if (operationsGrid && mapPanel && snapshot) {
      operationsGrid.insertBefore(isMobile ? mapPanel : snapshot, isMobile ? snapshot : mapPanel);
    }
    if (isMobile) {
      $$('[data-mobile-disclosure]').forEach((panel) => {
        setMobileDisclosure(panel, panel.matches('[data-inspector-disclosure]') && Boolean(state.selected));
      });
    }
    state.mapAdapter?.resizeMap();
  }

  function bindMobileHierarchy() {
    $$('[data-mobile-disclosure-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.closest('[data-mobile-disclosure]');
        setMobileDisclosure(panel, button.getAttribute('aria-expanded') !== 'true');
      });
    });
    syncMobileHierarchy();
    mobileLayout.addEventListener('change', syncMobileHierarchy);
  }

  function setSelection(type, id) {
    if (unavailableScenario()) return;
    state.selected = { type, id };
    if (mobileLayout.matches) setMobileDisclosure($('[data-inspector-disclosure]'), true);
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
    app.dataset.playing = String(state.playing);
    app.dataset.vehicleMode = state.mode;
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

    const mapFilter = $('[data-map-filter]');
    mapFilter.hidden = state.mode === 'all';
    mapFilter.textContent = state.mode === 'rail' ? 'Rail only' : state.mode === 'bus' ? 'Bus only' : '';
    mapFilter.dataset.mode = state.mode;
  }

  function createKpiIcon(kind) {
    const icon = svgEl('svg', {
      class: 'phx-kpi-icon',
      viewBox: '0 0 48 48',
      'aria-hidden': 'true'
    });
    const common = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const shapes = {
      vehicle: [
        ['rect', { x: 13, y: 11, width: 22, height: 25, rx: 5 }],
        ['path', { d: 'M16 16h16M17 28h14M18 36v3M30 36v3' }],
        ['circle', { cx: 18, cy: 31, r: 1 }],
        ['circle', { cx: 30, cy: 31, r: 1 }]
      ],
      alert: [
        ['path', { d: 'M24 9 39 37H9L24 9Z' }],
        ['path', { d: 'M24 18v9M24 32v.5' }]
      ],
      delay: [
        ['circle', { cx: 24, cy: 24, r: 15 }],
        ['path', { d: 'M24 15v10l7 4' }]
      ],
      enrichment: [
        ['path', { d: 'M24 8 38 16v9c0 8-5.5 13-14 16-8.5-3-14-8-14-16v-9l14-8Z' }],
        ['path', { d: 'm19 24 3 3 7-8' }]
      ]
    };
    (shapes[kind] || shapes.enrichment).forEach(([tag, attributes]) => {
      icon.append(svgEl(tag, { ...common, ...attributes }));
    });
    return icon;
  }

  function createSparkline(values) {
    const width = 64;
    const height = 32;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 4 - ((value - min) / range) * (height - 9);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const sparkline = svgEl('svg', {
      class: 'phx-kpi-sparkline',
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true'
    });
    sparkline.append(
      svgEl('polygon', { points: `0,${height} ${points} ${width},${height}`, class: 'sparkline-area' }),
      svgEl('polyline', { points, class: 'sparkline-line' })
    );
    return sparkline;
  }

  function renderKpis(frame) {
    const counts = derive(frame);
    const unavailable = unavailableScenario();
    const delayValue = counts.averageDelay === null ? 'Unavailable' : `${counts.averageDelay.toFixed(1)} min`;
    const values = [
      {
        label: 'Active vehicles',
        value: unavailable ? 'Unavailable' : counts.active,
        note: unavailable ? 'Demo state unavailable' : `${counts.vehicles.length} plotted - age ≤ 90 sec`,
        icon: 'vehicle',
        sparkline: [6, 7, 7, 8, 7, 9, counts.active]
      },
      {
        label: 'Active alerts',
        value: unavailable ? 'Unavailable' : counts.alerts,
        note: unavailable ? 'Demo state unavailable' : 'Fictional service alerts',
        icon: 'alert'
      },
      {
        label: 'Avg predicted delay',
        value: unavailable ? 'Unavailable' : delayValue,
        note: unavailable ? 'Demo state unavailable' : 'Based on demo data',
        icon: 'delay',
        sparkline: [2.8, 3.4, 3.1, 4.2, 3.8, 4.5, counts.averageDelay ?? 0]
      }
    ];

    const root = $('[data-kpis]');
    root.replaceChildren();
    values.forEach((item) => {
      const hasSparkline = Boolean(item.sparkline && !unavailable);
      const card = el(
        'article',
        `phx-kpi${hasSparkline ? ' has-sparkline' : ''}${unavailable ? ' is-unavailable' : ''}`
      );
      const label = el('span', 'phx-kpi-label', item.label);
      const metricRow = el('div', 'phx-kpi-main');
      const value = el('strong', 'phx-kpi-value', String(item.value));
      const note = el('small', 'phx-kpi-note');

      if (item.html) note.innerHTML = item.note;
      else note.textContent = item.note;

      metricRow.append(
        createKpiIcon(item.icon),
        value
      );
      if (hasSparkline) metricRow.append(createSparkline(item.sparkline));

      card.append(
        label,
        metricRow,
        note
      );
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
    const prompt = el('option', '', mapUnavailable() ? 'Records unavailable' : 'Choose record');
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

  function appendVehicleGlyph(group, mode) {
    if (mode === 'rail') {
      group.append(
        svgEl('rect', { x: -6, y: -8, width: 12, height: 16, rx: 2.5, class: 'vehicle-glyph' }),
        svgEl('path', { d: 'M-4-3H4M-4 2H4M-4 9l2-2M4 9 2-2', class: 'vehicle-glyph' }),
        svgEl('circle', { cx: -3, cy: 5, r: 1, class: 'vehicle-wheel' }),
        svgEl('circle', { cx: 3, cy: 5, r: 1, class: 'vehicle-wheel' })
      );
      return;
    }
    if (mode === 'bus') {
      group.append(
        svgEl('rect', { x: -7, y: -7, width: 14, height: 14, rx: 2.5, class: 'vehicle-glyph' }),
        svgEl('path', { d: 'M-5-2H5M-5 3H5', class: 'vehicle-glyph' }),
        svgEl('circle', { cx: -4, cy: 5, r: 1, class: 'vehicle-wheel' }),
        svgEl('circle', { cx: 4, cy: 5, r: 1, class: 'vehicle-wheel' })
      );
      return;
    }
    const unknownGlyph = svgEl('text', { 'text-anchor': 'middle', y: '3' });
    unknownGlyph.textContent = '?';
    group.append(unknownGlyph);
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
    const affectedStops = new Set(selectedAlert ? selectedAlert.stops : visibleAlerts(frame).flatMap((alert) => alert.stops));

    if (!unavailable) {
      state.data.routes.forEach((route) => {
        const matches = matchingRouteIds.has(route.id);
        const selected = state.selected?.type === 'route' && state.selected.id === route.id;
        const selectionDimmed = state.selected?.type === 'route' && matches && !selected;
        const className = [
          'map-route',
          route.color,
          route.mode,
          matches ? '' : 'is-muted',
          selectionDimmed ? 'is-selection-dimmed' : '',
          selected ? 'is-selected' : ''
        ].filter(Boolean).join(' ');
        routesRoot.append(svgEl('path', { d: route.path, class: `map-route-casing${matches ? '' : ' is-muted'}${selectionDimmed ? ' is-selection-dimmed' : ''}` }));
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

      (selectedAlert ? [selectedAlert] : visibleAlerts(frame)).forEach((alert) => {
        if (alert.segmentPath) routesRoot.append(svgEl('path', { d: alert.segmentPath, class: 'map-route-alert-segment' }));
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
          svgEl('circle', { r: vehicle.mode === 'rail' ? 10 : 9, class: 'vehicle-body' })
        );
        appendVehicleGlyph(group, vehicle.mode);
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
      state.mapAdapter.setMapFilters({
        mode: state.mode,
        routeId: state.route
      });
      state.mapAdapter.setMapScenario({
        mapUnavailable: unavailable
      });
      state.mapAdapter.setMapData({
        routes: state.data.routes,
        stops: state.data.stops,
        alerts: frame.alerts,
        vehicles: frame.vehicles.map(effectiveVehicle),
        transitionDurationMs: state.data.meta.frameIntervalMs * 0.4
      });
      state.mapAdapter.setMapSelection(state.selected);
      state.mapAdapter.setPlayback?.(state.playing);
    }
  }

  function renderAlerts(frame) {
    const root = $('[data-alerts]');
    root.replaceChildren();
    const alerts = visibleAlerts(frame);
    const alertCount = unavailableScenario() ? '–' : String(alerts.length);
    $('[data-alert-count]').textContent = alertCount;
    $('[data-alert-count-mobile]').textContent = alertCount;

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
    $('[data-route-count-mobile]').textContent = unavailableScenario() ? '–' : String(signals.length);

    if (unavailableScenario()) {
      root.append(el('p', 'phx-unavailable', `${currentScenario().label}: route signals are unavailable.`));
      return;
    }

    const header = el('div', 'phx-route-row');
    header.append(el('span', '', 'Route'), el('span', '', 'Vehicles'), el('span', '', 'Est. delay'), el('span', '', ''));
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
      root.append(el('p', 'phx-unavailable', 'Vehicle update times unavailable.'));
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
      root.append(el('p', 'phx-unavailable', 'Service changes unavailable.'));
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
    const total = counts.vehicles.length;
    const percentage = (value) => total ? value / total * 100 : 0;
    const busShare = percentage(counts.bus);
    const railShare = percentage(counts.rail);
    const donut = el('div', 'phx-donut');
    donut.style.setProperty('--bus', `${busShare}%`);
    donut.style.setProperty('--rail', `${busShare + railShare}%`);
    donut.append(el('strong', '', String(counts.vehicles.length)));
    const legend = el('div', 'phx-donut-legend');
    [['Bus', counts.bus], ['Light rail', counts.rail], ['Unknown', counts.unknownMode]].forEach(([label, value]) => {
      const share = percentage(value);
      const item = el('div', 'phx-fleet-item');
      const summary = el('span', 'phx-fleet-summary');
      summary.append(el('i'), el('span', '', label), el('b', '', String(value)), el('em', '', `${Math.round(share)}%`));
      const bar = el('span', 'phx-fleet-bar');
      bar.style.setProperty('--value', `${share}%`);
      item.append(summary, bar);
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
    const list = el('dl', 'phx-inspector-grid');
    pairs.forEach(([term, value]) => {
      const item = el('div');
      item.append(el('dt', '', term), el('dd', '', String(value)));
      list.append(item);
    });
    root.append(list);
  }

  function createInspectorVisual(kind, mode) {
    const visual = el('div', `phx-inspector-visual ${kind}${mode ? ` ${mode}` : ''}`);
    const icon = svgEl('svg', { viewBox: '0 0 48 48', 'aria-hidden': 'true' });
    if (kind === 'alert') {
      icon.append(
        svgEl('path', { d: 'M24 6 43 40H5L24 6Z' }),
        svgEl('path', { d: 'M24 17v12M24 35v1' })
      );
    } else if (mode === 'rail') {
      icon.append(
        svgEl('rect', { x: 10, y: 6, width: 28, height: 32, rx: 8 }),
        svgEl('path', { d: 'M15 15h18v10H15zM16 42l5-5m11 5-5-5' }),
        svgEl('circle', { cx: 17, cy: 31, r: 2 }), svgEl('circle', { cx: 31, cy: 31, r: 2 })
      );
    } else {
      icon.append(
        svgEl('rect', { x: 6, y: 9, width: 36, height: 27, rx: 5 }),
        svgEl('path', { d: 'M11 15h26v11H11z' }),
        svgEl('circle', { cx: 14, cy: 38, r: 3 }), svgEl('circle', { cx: 34, cy: 38, r: 3 })
      );
    }
    visual.append(icon);
    return visual;
  }

  function routeDelayHistory(routeId) {
    const values = state.data.frames.map((replayFrame) => replayFrame.routeSignals
      .find((signal) => signal.routeId === routeId)?.predictedDelayMinutes);
    return values.every(Number.isFinite) && values.length > 1 ? values : null;
  }

  function appendInspectorHeader(root, { kind, mode, eyebrow, title, subtitle, badges }) {
    const identity = el('div', 'phx-inspector-identity');
    const copy = el('div', 'phx-inspector-copy');
    copy.append(el('span', 'phx-inspector-eyebrow', eyebrow), el('strong', '', title), el('p', '', subtitle));
    const badgeRow = el('div', 'phx-inspector-badges');
    badges.filter(Boolean).forEach((badge) => badgeRow.append(el('span', '', badge)));
    copy.append(badgeRow);
    identity.append(createInspectorVisual(kind, mode), copy);
    root.append(identity);
  }

  function appendDelayHistory(root, routeId, vehicleRoute = false) {
    const values = routeDelayHistory(routeId);
    if (!values) return;
    const history = el('section', 'phx-inspector-history');
    const copy = el('div');
    copy.append(
      el('strong', '', vehicleRoute ? 'Route-level replay delay' : 'Estimated replay delay'),
      el('span', '', vehicleRoute
        ? 'Synthetic route signal across replay frames - not vehicle history'
        : 'Synthetic route signal across replay frames - not historical performance')
    );
    const sparkline = createSparkline(values);
    sparkline.classList.add('phx-inspector-sparkline');
    history.append(copy, sparkline);
    root.append(history);
  }

  function renderInspector(frame) {
    const root = $('[data-inspector]');
    $('[data-inspector-title]').hidden = unavailableScenario() || !state.selected;
    updateInspectorSummary();
    root.replaceChildren();
    if (unavailableScenario()) {
      root.append(el('p', '', `${currentScenario().label}: no record is presented as current.`));
      return;
    }
    if (!state.selected) {
      root.append(el('p', '', 'Choose a route, vehicle, or alert on the map to see its details.'));
      return;
    }

    if (state.selected.type === 'vehicle') {
      const vehicle = visibleVehicles(frame).find((item) => item.id === state.selected.id);
      if (!vehicle) return;
      const route = routeById(vehicle.routeId);
      appendInspectorHeader(root, {
        kind: 'vehicle', mode: vehicle.mode, eyebrow: 'Selected vehicle', title: vehicle.id,
        subtitle: `${unknown(route?.label)} · ${unknown(vehicle.direction)}`,
        badges: [vehicle.mode === 'rail' ? 'Light rail' : 'Bus', freshnessLabels[vehicle.freshness], vehicle.status]
      });
      appendDefinitionList(root, [
        ['Source vehicle ID', vehicle.id],
        ['Route', unknown(routeById(vehicle.routeId)?.label)],
        ['Vehicle age', `${vehicle.ageSeconds} sec`],
        ['Source trip ID', unknown(vehicle.tripId)],
        [vehicle.status === 'At stop' ? 'Current stop' : 'Next stop', unknown(vehicle.stop)],
        ['Destination sign (headsign)', unknown(vehicle.direction)],
        ['Direction (degrees)', Number.isFinite(vehicle.bearing) ? `${Math.round(vehicle.bearing)}°` : 'Unknown']
      ]);
      appendDelayHistory(root, vehicle.routeId, true);
    }
    if (state.selected.type === 'route') {
      const route = routeById(state.selected.id);
      const signal = frame.routeSignals.find((item) => item.routeId === route.id);
      appendInspectorHeader(root, {
        kind: 'route', mode: route.mode, eyebrow: 'Selected route', title: route.label,
        subtitle: route.direction,
        badges: [route.mode === 'rail' ? 'Light rail' : 'Bus', signal ? `${signal.predictedDelayMinutes.toFixed(1)} min estimated delay` : 'Delay unavailable']
      });
      appendDefinitionList(root, [
        ['Source route ID', route.id],
        ['Direction', route.direction],
        ['Visible vehicles', visibleVehicles(frame).filter((vehicle) => vehicle.routeId === route.id).length],
        ['Predicted delay', signal ? `${signal.predictedDelayMinutes.toFixed(1)} min - demo estimate` : 'Unavailable']
      ]);
      appendDelayHistory(root, route.id);
    }
    if (state.selected.type === 'alert') {
      const alert = visibleAlerts(frame).find((item) => item.id === state.selected.id);
      if (!alert) return;
      appendInspectorHeader(root, {
        kind: 'alert', eyebrow: 'Selected service alert', title: alert.title,
        subtitle: alert.period, badges: [alert.effect, `${alert.routes.length} affected route${alert.routes.length === 1 ? '' : 's'}`]
      });
      appendDefinitionList(root, [
        ['Source alert ID', alert.id],
        ['Effect', alert.effect],
        ['Period', alert.period],
        ['Routes', alert.routes.join(', ')],
        ['Stops', alert.stops.map((stopId) => stopById(stopId)?.label || stopId).join(', ')]
      ]);
    }
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
        ['Static schedule record', 'Freshness'],
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
        [trip.stopId ? unknown(stopById(trip.stopId)?.label) : 'Not applicable', 'Stop / direction']
      ]);
    });
  }

  function render({ announceChange = false } = {}) {
    const frame = currentFrame();
    normalizeSelection(frame);
    if (!state.selected && mobileLayout.matches) {
      setMobileDisclosure($('[data-inspector-disclosure]'), false);
    }
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
      state.frame = (state.frame + 1) % state.data.frames.length;
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
    setMobileDisclosure($('[data-inspector-disclosure]'), false);
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
        setMobileDisclosure($('[data-inspector-disclosure]'), false);
        render({ announceChange: true });
      });
    });

    $('[data-route-filter]').addEventListener('change', (event) => {
      state.route = event.target.value;
      state.selected = state.route === 'all' ? null : { type: 'route', id: state.route };
      setMobileDisclosure($('[data-inspector-disclosure]'), Boolean(state.selected) && mobileLayout.matches);
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
      'Interactive map not initialized because the fictional replay is unavailable.'
    );
    app.dataset.appState = 'feed_error';
    $('[data-primary-state] strong').textContent = 'Replay unavailable';
    $('[data-replay-time]').textContent = 'Unavailable';
    $('[data-clock-time]').textContent = 'Replay unavailable';
    $('[data-state-title]').textContent = 'Replay unavailable';
    $('[data-state-message]').textContent = 'The fictional replay could not be loaded. No live or provider data was requested.';
    $('[data-map-empty]').hidden = false;
    $('[data-map]').setAttribute('aria-disabled', 'true');
    $('[data-interactive-map]').setAttribute('aria-disabled', 'true');
    $('[data-map-routes]').replaceChildren();
    $('[data-map-stops]').replaceChildren();
    $('[data-map-alerts]').replaceChildren();
    $('[data-map-vehicles]').replaceChildren();
    $('[data-kpis]').replaceChildren(el('p', 'phx-unavailable', 'Current snapshot unavailable.'));
    $('[data-alerts]').replaceChildren(el('p', 'phx-unavailable', 'Active alerts unavailable.'));
    $('[data-route-signals]').replaceChildren(el('p', 'phx-unavailable', 'Route status unavailable.'));
    $('[data-freshness-chart]').replaceChildren(el('p', 'phx-unavailable', 'Vehicle update times unavailable.'));
    $('[data-trip-exceptions]').replaceChildren(el('p', 'phx-unavailable', 'Service changes unavailable.'));
    $('[data-fleet-mix]').replaceChildren(el('p', 'phx-unavailable', 'Fleet mix unavailable.'));
    $('[data-feed-health]').replaceChildren(el('p', 'phx-unavailable', 'Feed updates unavailable.'));
    $('[data-inspector-title]').hidden = true;
    $('[data-inspector]').replaceChildren(el('p', 'phx-unavailable', 'No selected item is available.'));
    $('[data-record-count]').textContent = 'Records unavailable';
    $('[data-records]').replaceChildren();
    $('[data-map-record]').replaceChildren(el('option', '', 'Map records unavailable'));
    $('[data-map-record]').disabled = true;
    $$('.phx-control-stack button, .phx-control-stack select, .phx-control-stack input').forEach((control) => {
      control.disabled = true;
    });
    announce('Fictional replay unavailable. All dashboard data regions are unavailable.');
  }

  async function init() {
    bindMobileHierarchy();
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
      hydrateFixture(data);
      state.scenarios = scenarios.scenarios;
      $('[data-timeline]').max = String(data.frames.length - 1);
      data.routes.forEach((route) => {
        const option = el('option', '', `${route.label} - ${route.mode === 'rail' ? 'light rail' : route.mode}`);
        option.value = route.id;
        $('[data-route-filter]').append(option);
      });
      updateRouteOptions();

      const requested = new URLSearchParams(location.search).get('state');
      if (state.scenarios.some((scenario) => scenario.id === requested)) state.scenario = requested;

      bindControls();
      if (state.scenario === 'current' && !reducedMotion.matches) startReplay();
      else render({ announceChange: true });
      void initializeInteractiveMap();
    } catch (error) {
      renderLoadFailure();
    }
  }

  init();
})();
