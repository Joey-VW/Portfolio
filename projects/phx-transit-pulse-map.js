(() => {
  'use strict';

  const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
  const SOURCE_IDS = {
    routes: 'phx-routes',
    stops: 'phx-stops',
    alerts: 'phx-alerts',
    alertSegments: 'phx-alert-segments',
    vehicles: 'phx-vehicles'
  };
  const RIPPLE_POOL_SIZE = 3;
  const RIPPLE_SOURCE_IDS = Array.from(
    { length: RIPPLE_POOL_SIZE },
    (_, index) => `phx-vehicle-ripples-${index}`
  );
  const RIPPLE_LAYER_IDS = Array.from(
    { length: RIPPLE_POOL_SIZE },
    (_, index) => `phx-vehicle-ripples-${index}`
  );
  const ANIMATION = Object.freeze({
    rippleSpawnIntervalMs: 3000,
    rippleLifetimeMs: 2100,
    rippleStartRadius: 5,
    rippleEndRadius: 24,
    rippleStartOpacity: 0.65,
    defaultVehicleTransitionMs: 1312,
    teleportThresholdKm: 4
  });
  const routeColors = {
    blue: '#00a8ff',
    cyan: '#26d9ff',
    teal: '#20bfe8',
    magenta: '#ec4899',
    amber: '#fbbf24'
  };

  function featureCollection(features = []) {
    return { type: 'FeatureCollection', features };
  }

  function pointGeometry(record) {
    if (!Number.isFinite(record.longitude) || !Number.isFinite(record.latitude)) return null;
    return { type: 'Point', coordinates: [record.longitude, record.latitude] };
  }

  function distanceKilometers(first, second) {
    const latitudeScale = 111.32;
    const longitudeScale = latitudeScale
      * Math.cos(((first.latitude + second.latitude) / 2) * Math.PI / 180);
    return Math.hypot(
      (first.longitude - second.longitude) * longitudeScale,
      (first.latitude - second.latitude) * latitudeScale
    );
  }

  function smoothstep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function interpolateBearing(start, end, progress) {
    const safeStart = Number.isFinite(start) ? start : 0;
    const safeEnd = Number.isFinite(end) ? end : safeStart;
    const delta = ((safeEnd - safeStart + 540) % 360) - 180;
    return (safeStart + delta * progress + 360) % 360;
  }

  function expandedBounds(bounds) {
    const [[west, south], [east, north]] = bounds;
    const longitudePadding = Math.max((east - west) * 0.28, 0.12);
    const latitudePadding = Math.max((north - south) * 0.28, 0.1);
    return [
      [west - longitudePadding, south - latitudePadding],
      [east + longitudePadding, north + latitudePadding]
    ];
  }

  function addSources(map) {
    [...Object.values(SOURCE_IDS), ...RIPPLE_SOURCE_IDS].forEach((id) => {
      map.addSource(id, {
        type: 'geojson',
        data: featureCollection()
      });
    });
  }

  function addRouteLayers(map) {
    map.addLayer({
      id: 'phx-routes-casing', type: 'line', source: SOURCE_IDS.routes,
      paint: {
        'line-color': '#03101c',
        'line-width': ['case', ['==', ['get', 'selected'], true], 10, ['==', ['get', 'mode'], 'rail'], 8, 6],
        'line-opacity': ['case', ['==', ['get', 'visible'], true], 0.95, 0.12]
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    });
    map.addLayer({
      id: 'phx-routes-muted',
      type: 'line',
      source: SOURCE_IDS.routes,
      filter: ['==', ['get', 'visible'], false],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
        'line-opacity': 0.18
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
    map.addLayer({
      id: 'phx-routes-glow',
      type: 'line',
      source: SOURCE_IDS.routes,
      filter: ['==', ['get', 'visible'], true],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['==', ['get', 'mode'], 'rail'], 12, 9],
        'line-opacity': 0.24,
        'line-blur': 4
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
    map.addLayer({
      id: 'phx-routes-visible',
      type: 'line',
      source: SOURCE_IDS.routes,
      filter: ['==', ['get', 'visible'], true],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'case',
          ['==', ['get', 'selected'], true], 6,
          ['==', ['get', 'mode'], 'rail'], 4,
          3
        ],
        'line-opacity': 0.94,
        'line-blur': 0.25
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
    map.addLayer({
      id: 'phx-routes-alert',
      type: 'line',
      source: SOURCE_IDS.alertSegments,
      paint: {
        'line-color': '#ffb34d',
        'line-width': 5,
        'line-opacity': 0.95,
        'line-dasharray': [2, 1.6]
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
    map.addLayer({
      id: 'phx-rail-center', type: 'line', source: SOURCE_IDS.routes,
      filter: ['all', ['==', ['get', 'visible'], true], ['==', ['get', 'mode'], 'rail']],
      paint: { 'line-color': '#f4eaff', 'line-width': 1.2, 'line-opacity': 0.9, 'line-dasharray': [1.2, 2] },
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    });
    map.addLayer({
      id: 'phx-routes-hit',
      type: 'line',
      source: SOURCE_IDS.routes,
      filter: ['==', ['get', 'visible'], true],
      paint: {
        'line-color': 'rgba(0, 0, 0, 0)',
        'line-width': 22
      }
    });
  }

  function addStopLayers(map) {
    map.addLayer({
      id: 'phx-stops',
      type: 'circle',
      source: SOURCE_IDS.stops,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'transfer'], true], 5.5,
          4
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'alertAffected'], true], '#3b2512',
          '#091725'
        ],
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'alertAffected'], true], '#ffb34d',
          ['==', ['get', 'transfer'], true], '#d6e8f8',
          '#9cb4ca'
        ],
        'circle-stroke-width': [
          'case',
          ['==', ['get', 'transfer'], true], 2.4,
          1.7
        ]
      }
    });
    map.addLayer({
      id: 'phx-stop-labels',
      type: 'symbol',
      source: SOURCE_IDS.stops,
      minzoom: 10.35,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-anchor': 'bottom-left',
        'text-offset': [0.65, -0.45],
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#bfd0df',
        'text-halo-color': '#06111d',
        'text-halo-width': 1.5
      }
    });
  }

  function addAlertLayers(map) {
    map.addLayer({
      id: 'phx-alert-selection',
      type: 'circle',
      source: SOURCE_IDS.alerts,
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-radius': 16,
        'circle-color': 'rgba(255, 179, 77, 0.12)',
        'circle-stroke-color': '#ffd39a',
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: 'phx-alerts',
      type: 'circle',
      source: SOURCE_IDS.alerts,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'selected'], true], 11,
          9
        ],
        'circle-color': [
          'match',
          ['get', 'severity'],
          'major', '#d94255',
          'warning', '#a86820',
          '#1f6f97'
        ],
        'circle-stroke-color': '#ffe0bd',
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: 'phx-alert-labels',
      type: 'symbol',
      source: SOURCE_IDS.alerts,
      layout: {
        'text-field': '!',
        'text-size': 13,
        'text-font': ['Noto Sans Bold']
      },
      paint: {
        'text-color': '#ffffff'
      }
    });
  }

  function createVehicleIcon(mode) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, size, size);
    context.strokeStyle = '#ffffff';
    context.fillStyle = '#ffffff';
    context.lineWidth = 4.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (mode === 'rail') {
      context.beginPath();
      context.roundRect(16, 8, 32, 44, 8);
      context.stroke();
      context.beginPath();
      context.moveTo(20, 19);
      context.lineTo(44, 19);
      context.moveTo(20, 35);
      context.lineTo(44, 35);
      context.stroke();
      context.beginPath();
      context.arc(24, 44, 2.8, 0, Math.PI * 2);
      context.arc(40, 44, 2.8, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(22, 57);
      context.lineTo(27, 51);
      context.moveTo(42, 57);
      context.lineTo(37, 51);
      context.stroke();
    } else if (mode === 'bus') {
      context.beginPath();
      context.roundRect(13, 9, 38, 43, 7);
      context.stroke();
      context.beginPath();
      context.moveTo(18, 19);
      context.lineTo(46, 19);
      context.moveTo(18, 35);
      context.lineTo(46, 35);
      context.stroke();
      context.beginPath();
      context.arc(21, 44, 3, 0, Math.PI * 2);
      context.arc(43, 44, 3, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(20, 53);
      context.lineTo(20, 57);
      context.moveTo(44, 53);
      context.lineTo(44, 57);
      context.stroke();
    } else {
      context.font = '700 38px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('?', 32, 34);
    }
    return context.getImageData(0, 0, size, size);
  }

  function addVehicleImages(map) {
    const images = {
      'phx-bus-marker': createVehicleIcon('bus'),
      'phx-rail-marker': createVehicleIcon('rail'),
      'phx-unknown-marker': createVehicleIcon('unknown')
    };
    Object.entries(images).forEach(([id, image]) => {
      if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
    });
  }

  function tuneBasemap(map) {

    const palette = {
      // Base geography
      background: '#030812', // '#07101A' or '#030812'
      water: '#0A1824',
      landuse: '#0A131D',
      park: '#0B1818',
      building: '#101C27',

      // Roads
      motorway: '#2A4055',
      motorwayCasing: '#0A121C',

      roadMajor: '#1E3042',
      roadCasing: '#09121B',

      roadMinor: '#152433',
      roadPath: '#101C28',

      // Existing real-world rail infrastructure
      railTransit: '#2A3949',
      rail: '#202E3C',

      // Basemap labels
      label: '#7E91A5',
      labelHalo: '#07101A'
    };


    const labelLayers = [];

    map.getStyle().layers.forEach((layer) => {
      const id = String(layer.id || '').toLowerCase();
      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

      try {
        // Overall map background.
        if (layer.type === 'background') {
          map.setPaintProperty(
            layer.id,
            'background-color',
            palette.background
          );
          map.setPaintProperty(
            layer.id,
            'background-opacity',
            1
          );
        }

        // Water.
        if (
          layer.type === 'fill'
          && (
            sourceLayer === 'water'
            || id.includes('water')
          )
        ) {
          map.setPaintProperty(
            layer.id,
            'fill-color',
            palette.water
          );
        }

        // Parks / green-space / land cover.
        if (
          layer.type === 'fill'
          && (
            sourceLayer === 'park'
            || sourceLayer === 'landcover'
            || id.includes('park')
          )
        ) {
          map.setPaintProperty(
            layer.id,
            'fill-color',
            palette.park
          );
        }

        // General land-use polygons.
        if (
          layer.type === 'fill'
          && (
            sourceLayer === 'landuse'
            || id.includes('landuse')
          )
        ) {
          map.setPaintProperty(
            layer.id,
            'fill-color',
            palette.landuse
          );
        }

        // Buildings.
        if (
          layer.type === 'fill'
          && (
            sourceLayer === 'building'
            || id.includes('building')
          )
        ) {
          map.setPaintProperty(
            layer.id,
            'fill-color',
            palette.building
          );
        }

        // Basemap transportation layers only. Explicitly exclude PHX Transit
        // Pulse's own route layers so their operational styling stays intact.
        const isPhxLayer = id.startsWith('phx-');
        const isTransportationLayer =
          !isPhxLayer
          && layer.type === 'line'
          && sourceLayer === 'transportation';

        if (isTransportationLayer) {
          let lineColor = null;

          // Paths, pedestrian ways, cycleways, etc.
          if (id === 'highway_path') {
            lineColor = palette.roadPath;

          // Local / residential / minor streets.
          } else if (
            id === 'highway_minor'
            || id === 'road_pier'
          ) {
            lineColor = palette.roadMinor;

          // Major-road casing.
          } else if (id === 'highway_major_casing') {
            lineColor = palette.roadCasing;

          // Major-road surface.
          } else if (
            id === 'highway_major_inner'
            || id === 'highway_major_subtle'
          ) {
            lineColor = palette.roadMajor;

          // Freeway / motorway casing.
          } else if (id === 'highway_motorway_casing') {
            lineColor = palette.motorwayCasing;

          // Freeway / motorway surface.
          } else if (
            id === 'highway_motorway_inner'
            || id === 'highway_motorway_subtle'
          ) {
            lineColor = palette.motorway;

          // Transit rail supplied by the basemap.
          } else if (
            id === 'railway_transit'
            || id === 'railway_transit_dashline'
          ) {
            lineColor = palette.railTransit;

          // Other railway infrastructure.
          } else if (
            id === 'railway_minor'
            || id === 'railway_minor_dashline'
            || id === 'railway'
            || id === 'railway_dashline'
          ) {
            lineColor = palette.rail;
          }

          if (lineColor) {
            map.setPaintProperty(
              layer.id,
              'line-color',
              lineColor
            );
          }
        }

        // Preserve and recolor place labels.
        if (
          layer.type === 'symbol'
          && /place|settlement|city|town/i.test(layer.id)
        ) {
          map.setPaintProperty(
            layer.id,
            'text-color',
            palette.label
          );
          map.setPaintProperty(
            layer.id,
            'text-halo-color',
            palette.labelHalo
          );
          map.setPaintProperty(
            layer.id,
            'text-halo-width',
            1.6
          );

          labelLayers.push(layer.id);
        }
      } catch (error) {
        // Third-party styles vary; unsupported paint properties
        // are safely ignored.
      }
    });

    // Keep city/place labels above the operational overlays.
    labelLayers.forEach((id) => {
      if (map.getLayer(id)) {
        map.moveLayer(id);
      }
    });
  }


  function addRippleLayers(map) {
    RIPPLE_SOURCE_IDS.forEach((sourceId, index) => {
      map.addLayer({
        id: RIPPLE_LAYER_IDS[index],
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': ANIMATION.rippleStartRadius,
          'circle-color': 'rgba(0, 0, 0, 0)',
          'circle-stroke-color': [
            'match',
            ['get', 'mode'],
            'rail', '#ec4899',
            'bus', '#00a8ff',
            '#97a8bb'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-opacity': 0
        }
      });
    });
  }

  function addVehicleLayers(map) {
    map.addLayer({
      id: 'phx-vehicle-selection',
      type: 'circle',
      source: SOURCE_IDS.vehicles,
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-radius': 15,
        'circle-color': 'rgba(0, 168, 255, 0.1)',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: 'phx-vehicles',
      type: 'circle',
      source: SOURCE_IDS.vehicles,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'mode'], 'rail'], 9,
          8
        ],
        'circle-color': [
          'match',
          ['get', 'freshness'],
          'very_stale', '#667789',
          'stale', '#a86820',
          ['match',
            ['get', 'mode'],
            'rail', '#b94bd0',
            'bus', '#007fc1',
            '#718496'
          ]
        ],
        'circle-opacity': [
          'case',
          ['==', ['get', 'freshness'], 'very_stale'], 0.58,
          ['==', ['get', 'freshness'], 'stale'], 0.78,
          0.96
        ],
        'circle-stroke-color': [
          'match',
          ['get', 'mode'],
          'rail', '#f0a7ff',
          'bus', '#78d7ff',
          '#d0d9e2'
        ],
        'circle-stroke-width': 2
      }
    });
    map.addLayer({
      id: 'phx-vehicle-labels',
      type: 'symbol',
      source: SOURCE_IDS.vehicles,
      layout: {
        'icon-image': [
          'match',
          ['get', 'mode'],
          'rail', 'phx-rail-marker',
          'bus', 'phx-bus-marker',
          'phx-unknown-marker'
        ],
        'icon-size': 0.52,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-rotation-alignment': 'map',
        'icon-rotate': ['coalesce', ['get', 'bearing'], 0]
      },
      paint: {
        'icon-opacity': [
          'case',
          ['==', ['get', 'freshness'], 'very_stale'], 0.58,
          ['==', ['get', 'freshness'], 'stale'], 0.82,
          1
        ]
      }
    });
  }

  function bindSelection(map, layerId, type, onSelect) {
    map.on('click', layerId, (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (id) onSelect(type, id);
    });
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  function initMap({
    container,
    mapConfig,
    onSelect = () => {},
    reducedMotion = false,
    styleUrl = STYLE_URL,
    timeoutMs = 12000
  }) {
    if (!container) return Promise.reject(new Error('Interactive map container not found.'));
    if (!window.maplibregl?.Map) return Promise.reject(new Error('MapLibre GL JS is unavailable.'));
    if (!mapConfig?.bounds || !mapConfig?.center) {
      return Promise.reject(new Error('Synthetic map configuration is invalid.'));
    }

    const adapterState = {
      map: null,
      ready: false,
      destroyed: false,
      data: { routes: [], stops: [], alerts: [], vehicles: [] },
      filters: { mode: 'all', routeId: 'all' },
      selection: null,
      scenario: { mapUnavailable: false },
      playing: false,
      reducedMotion: Boolean(reducedMotion),
      config: mapConfig,
      displayVehicles: new Map(),
      targetVehicles: new Map(),
      transitionStartVehicles: new Map(),
      transitionStartTime: 0,
      transitionDurationMs: ANIMATION.defaultVehicleTransitionMs,
      vehicleTransitionActive: false,
      rippleGenerations: RIPPLE_SOURCE_IDS.map((sourceId, index) => ({
        sourceId,
        layerId: RIPPLE_LAYER_IDS[index],
        active: false,
        startedAt: 0
      })),
      nextRippleSpawnAt: null
    };

    let settled = false;
    let loadTimer = null;
    let resizeObserver = null;
    let animationFrame = null;

    const map = new window.maplibregl.Map({
      container,
      style: styleUrl,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      maxBounds: expandedBounds(mapConfig.bounds),
      bearing: 0,
      pitch: 0,
      minPitch: 0,
      maxPitch: 0,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
      fadeDuration: adapterState.reducedMotion ? 0 : 180
    });
    adapterState.map = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new window.maplibregl.NavigationControl({
      showCompass: false,
      visualizePitch: false
    }), 'top-right');
    map.addControl(new window.maplibregl.AttributionControl({
      compact: true,
      customAttribution: 'Synthetic operations overlay'
    }), 'bottom-right');

    function matchingRouteIds() {
      return new Set(adapterState.data.routes.filter((route) => {
        const modeMatches = adapterState.filters.mode === 'all'
          || route.mode === adapterState.filters.mode;
        const routeMatches = adapterState.filters.routeId === 'all'
          || route.id === adapterState.filters.routeId;
        return modeMatches && routeMatches;
      }).map((route) => route.id));
    }

    function visibleVehicleTargets() {
      if (adapterState.scenario.mapUnavailable) return [];
      const visibleRouteIds = matchingRouteIds();
      return adapterState.data.vehicles.filter((vehicle) => {
        const modeMatches = adapterState.filters.mode === 'all'
          || vehicle.mode === adapterState.filters.mode;
        const routeMatches = adapterState.filters.routeId === 'all'
          || vehicle.routeId === adapterState.filters.routeId;
        const routeVisible = !vehicle.routeId || visibleRouteIds.has(vehicle.routeId);
        return modeMatches && routeMatches && routeVisible && pointGeometry(vehicle);
      });
    }

    function updateMapPresentationSources() {
      if (!adapterState.ready || adapterState.destroyed) return;

      const unavailable = adapterState.scenario.mapUnavailable;
      const visibleRouteIds = matchingRouteIds();
      const visibleAlerts = unavailable ? [] : adapterState.data.alerts.filter((alert) =>
        alert.routes.some((routeId) => visibleRouteIds.has(routeId))
      );
      const selectedAlert = adapterState.selection?.type === 'alert'
        ? visibleAlerts.find((alert) => alert.id === adapterState.selection.id)
        : null;
      const alertRoutes = new Set(
        (selectedAlert ? [selectedAlert] : visibleAlerts).flatMap((alert) => alert.routes)
      );
      const alertStops = new Set(
        (selectedAlert ? [selectedAlert] : visibleAlerts).flatMap((alert) => alert.stops)
      );
      const alertSegmentFeatures = (selectedAlert ? [selectedAlert] : visibleAlerts)
        .filter((alert) => alert.segmentGeometry)
        .map((alert) => ({ type: 'Feature', id: `${alert.id}-segment`, geometry: alert.segmentGeometry, properties: { id: alert.id } }));

      const routeFeatures = unavailable ? [] : adapterState.data.routes.map((route) => ({
        type: 'Feature',
        id: route.id,
        geometry: route.geometry,
        properties: {
          id: route.id,
          label: route.label,
          mode: route.mode,
          color: routeColors[route.color] || '#8fa6ba',
          visible: visibleRouteIds.has(route.id),
          selected: adapterState.selection?.type === 'route'
            && adapterState.selection.id === route.id,
          alertAffected: alertRoutes.has(route.id)
        }
      }));

      const stopFeatures = unavailable ? [] : adapterState.data.stops
        .filter((stop) => stop.routes.some((routeId) => visibleRouteIds.has(routeId)))
        .map((stop) => ({
          type: 'Feature',
          id: stop.id,
          geometry: pointGeometry(stop),
          properties: {
            id: stop.id,
            label: stop.label,
            transfer: Boolean(stop.transfer),
            alertAffected: alertStops.has(stop.id)
          }
        }))
        .filter((feature) => feature.geometry);

      const alertFeatures = visibleAlerts.map((alert) => ({
        type: 'Feature',
        id: alert.id,
        geometry: pointGeometry(alert),
        properties: {
          id: alert.id,
          label: alert.title,
          severity: alert.severity,
          selected: adapterState.selection?.type === 'alert'
            && adapterState.selection.id === alert.id
        }
      })).filter((feature) => feature.geometry);

      map.getSource(SOURCE_IDS.routes).setData(featureCollection(routeFeatures));
      map.getSource(SOURCE_IDS.alertSegments).setData(featureCollection(alertSegmentFeatures));
      map.getSource(SOURCE_IDS.stops).setData(featureCollection(stopFeatures));
      map.getSource(SOURCE_IDS.alerts).setData(featureCollection(alertFeatures));
    }

    function renderDisplayedVehicleSource() {
      if (!adapterState.ready || adapterState.destroyed) return;
      const vehicleFeatures = Array.from(adapterState.displayVehicles.values())
        .map((vehicle) => ({
          type: 'Feature',
          id: vehicle.id,
          geometry: pointGeometry(vehicle),
          properties: {
            id: vehicle.id,
            mode: vehicle.mode,
            freshness: vehicle.freshness,
            bearing: vehicle.bearing,
            selected: adapterState.selection?.type === 'vehicle'
              && adapterState.selection.id === vehicle.id
          }
        }))
        .filter((feature) => feature.geometry);
      map.getSource(SOURCE_IDS.vehicles).setData(featureCollection(vehicleFeatures));
    }

    function sameVehicleTarget(first, second) {
      return Boolean(first && second)
        && first.longitude === second.longitude
        && first.latitude === second.latitude
        && first.bearing === second.bearing
        && first.routeId === second.routeId
        && first.tripId === second.tripId;
    }

    function sameTargetSet(nextTargets) {
      if (nextTargets.size !== adapterState.targetVehicles.size) return false;
      return Array.from(nextTargets.entries()).every(([id, target]) =>
        sameVehicleTarget(adapterState.targetVehicles.get(id), target)
      );
    }

    function advanceVehicleTransition(timestamp, renderSource = true) {
      if (!adapterState.vehicleTransitionActive) return false;
      const elapsed = Math.max(0, timestamp - adapterState.transitionStartTime);
      const progress = Math.min(1, elapsed / adapterState.transitionDurationMs);
      const easedProgress = smoothstep(progress);

      adapterState.targetVehicles.forEach((target, id) => {
        const start = adapterState.transitionStartVehicles.get(id);
        if (!start) {
          adapterState.displayVehicles.set(id, { ...target });
          return;
        }
        adapterState.displayVehicles.set(id, {
          ...target,
          longitude: start.longitude
            + (target.longitude - start.longitude) * easedProgress,
          latitude: start.latitude
            + (target.latitude - start.latitude) * easedProgress,
          bearing: interpolateBearing(start.bearing, target.bearing, easedProgress)
        });
      });

      if (progress >= 1) {
        adapterState.vehicleTransitionActive = false;
        adapterState.transitionStartVehicles.clear();
      }
      if (renderSource) renderDisplayedVehicleSource();
      return adapterState.vehicleTransitionActive;
    }

    function snapVehiclesToTargets() {
      adapterState.displayVehicles = new Map(
        Array.from(adapterState.targetVehicles.entries(), ([id, vehicle]) => [
          id,
          { ...vehicle }
        ])
      );
      adapterState.transitionStartVehicles.clear();
      adapterState.vehicleTransitionActive = false;
      renderDisplayedVehicleSource();
    }

    function shouldSnapVehicle(start, target, forceSnap) {
      return forceSnap
        || adapterState.reducedMotion
        || adapterState.scenario.mapUnavailable
        || start.routeId !== target.routeId
        || start.tripId !== target.tripId
        || distanceKilometers(start, target) > ANIMATION.teleportThresholdKm;
    }

    function updateVehicleTargets({
      forceSnap = false,
      transitionDurationMs = adapterState.transitionDurationMs
    } = {}) {
      if (!adapterState.ready || adapterState.destroyed) return;

      const now = performance.now();
      advanceVehicleTransition(now, false);
      const nextTargets = new Map(
        visibleVehicleTargets().map((vehicle) => [vehicle.id, { ...vehicle }])
      );
      const safeDuration = Number.isFinite(transitionDurationMs)
        ? Math.max(0, transitionDurationMs)
        : ANIMATION.defaultVehicleTransitionMs;
      adapterState.transitionDurationMs = safeDuration;

      if (!forceSnap && sameTargetSet(nextTargets)) {
        adapterState.targetVehicles = nextTargets;
        nextTargets.forEach((target, id) => {
          const displayed = adapterState.displayVehicles.get(id);
          if (displayed) {
            adapterState.displayVehicles.set(id, {
              ...target,
              longitude: displayed.longitude,
              latitude: displayed.latitude,
              bearing: displayed.bearing
            });
          }
        });
        renderDisplayedVehicleSource();
        ensureAnimationCoordinator();
        return;
      }

      const nextDisplayVehicles = new Map();
      const nextTransitionStarts = new Map();
      let transitionActive = false;

      nextTargets.forEach((target, id) => {
        const displayed = adapterState.displayVehicles.get(id);
        if (!displayed || shouldSnapVehicle(displayed, target, forceSnap) || safeDuration === 0) {
          nextDisplayVehicles.set(id, { ...target });
          return;
        }
        if (sameVehicleTarget(displayed, target)) {
          nextDisplayVehicles.set(id, { ...target });
          return;
        }

        nextDisplayVehicles.set(id, { ...displayed });
        nextTransitionStarts.set(id, { ...displayed });
        transitionActive = true;
      });

      adapterState.targetVehicles = nextTargets;
      adapterState.displayVehicles = nextDisplayVehicles;
      adapterState.transitionStartVehicles = nextTransitionStarts;
      adapterState.transitionStartTime = now;
      adapterState.vehicleTransitionActive = transitionActive;
      if (!transitionActive) adapterState.transitionStartVehicles.clear();
      renderDisplayedVehicleSource();
      ensureAnimationCoordinator();
    }

    function clearRippleGeneration(generation) {
      generation.active = false;
      generation.startedAt = 0;
      const source = map.getSource(generation.sourceId);
      if (source) source.setData(featureCollection());
      if (map.getLayer(generation.layerId)) {
        map.setPaintProperty(
          generation.layerId,
          'circle-radius',
          ANIMATION.rippleStartRadius
        );
        map.setPaintProperty(generation.layerId, 'circle-stroke-opacity', 0);
      }
    }

    function clearRipplePool() {
      if (!adapterState.ready || adapterState.destroyed) return;
      adapterState.rippleGenerations.forEach(clearRippleGeneration);
    }

    function spawnRippleGeneration(timestamp) {
      const generation = adapterState.rippleGenerations.find((candidate) => !candidate.active);
      if (!generation) return;

      const rippleFeatures = Array.from(adapterState.displayVehicles.values())
        .map((vehicle) => ({
          type: 'Feature',
          id: `${generation.sourceId}-${vehicle.id}`,
          geometry: pointGeometry(vehicle),
          properties: { id: vehicle.id, mode: vehicle.mode }
        }))
        .filter((feature) => feature.geometry);
      if (!rippleFeatures.length) return;

      map.getSource(generation.sourceId).setData(featureCollection(rippleFeatures));
      generation.active = true;
      generation.startedAt = timestamp;
      map.setPaintProperty(
        generation.layerId,
        'circle-radius',
        ANIMATION.rippleStartRadius
      );
      map.setPaintProperty(
        generation.layerId,
        'circle-stroke-opacity',
        ANIMATION.rippleStartOpacity
      );
    }

    function advanceRippleGenerations(timestamp) {
      let active = false;
      adapterState.rippleGenerations.forEach((generation) => {
        if (!generation.active) return;
        const progress = Math.min(
          1,
          Math.max(0, timestamp - generation.startedAt) / ANIMATION.rippleLifetimeMs
        );
        if (progress >= 1) {
          clearRippleGeneration(generation);
          return;
        }

        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const radius = ANIMATION.rippleStartRadius
          + (ANIMATION.rippleEndRadius - ANIMATION.rippleStartRadius) * easedProgress;
        const opacity = ANIMATION.rippleStartOpacity * Math.pow(1 - progress, 2);
        map.setPaintProperty(generation.layerId, 'circle-radius', radius);
        map.setPaintProperty(generation.layerId, 'circle-stroke-opacity', opacity);
        active = true;
      });
      return active;
    }

    function playbackAnimationEnabled() {
      return adapterState.playing
        && !adapterState.reducedMotion
        && !adapterState.scenario.mapUnavailable;
    }

    function animationNeeded() {
      return adapterState.ready
        && !adapterState.destroyed
        && (
          adapterState.vehicleTransitionActive
          || adapterState.rippleGenerations.some((generation) => generation.active)
          || playbackAnimationEnabled()
        );
    }

    function runAnimationCoordinator(timestamp) {
      animationFrame = null;
      if (!adapterState.ready || adapterState.destroyed) return;

      if (document.hidden) {
        adapterState.nextRippleSpawnAt = null;
        clearRipplePool();
        snapVehiclesToTargets();
        return;
      }

      advanceVehicleTransition(timestamp);
      if (playbackAnimationEnabled()) {
        if (adapterState.nextRippleSpawnAt === null) {
          adapterState.nextRippleSpawnAt = timestamp;
        }
        if (timestamp >= adapterState.nextRippleSpawnAt) {
          spawnRippleGeneration(timestamp);
          adapterState.nextRippleSpawnAt = timestamp + ANIMATION.rippleSpawnIntervalMs;
        }
      } else {
        adapterState.nextRippleSpawnAt = null;
      }
      advanceRippleGenerations(timestamp);

      if (animationNeeded()) {
        animationFrame = requestAnimationFrame(runAnimationCoordinator);
      }
    }

    function ensureAnimationCoordinator() {
      if (animationFrame === null && animationNeeded()) {
        animationFrame = requestAnimationFrame(runAnimationCoordinator);
      }
    }

    function resetMapView() {
      if (!adapterState.ready || adapterState.destroyed) return;
      map.fitBounds(adapterState.config.bounds, {
        padding: { top: 44, right: 44, bottom: 54, left: 44 },
        bearing: 0,
        pitch: 0,
        duration: adapterState.reducedMotion ? 0 : 500
      });
    }

    function destroyMap() {
      if (adapterState.ready && !adapterState.destroyed) clearRipplePool();
      adapterState.destroyed = true;
      adapterState.ready = false;
      clearTimeout(loadTimer);
      resizeObserver?.disconnect();
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      adapterState.displayVehicles.clear();
      adapterState.targetVehicles.clear();
      adapterState.transitionStartVehicles.clear();
      map.remove();
    }

    return new Promise((resolve, reject) => {
      function fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimer);
        destroyMap();
        reject(error instanceof Error ? error : new Error(String(error)));
      }

      loadTimer = window.setTimeout(() => {
        fail(new Error('Interactive basemap initialization timed out.'));
      }, timeoutMs);

      map.on('error', (event) => {
        if (!adapterState.ready) {
          fail(event.error || new Error('Interactive basemap failed to load.'));
        }
      });

      map.on('load', () => {
        if (settled || adapterState.destroyed) return;
        try {
          addSources(map);
          addVehicleImages(map);
          addRouteLayers(map);
          addStopLayers(map);
          addAlertLayers(map);
          addRippleLayers(map);
          addVehicleLayers(map);
          tuneBasemap(map);
          bindSelection(map, 'phx-routes-hit', 'route', onSelect);
          bindSelection(map, 'phx-alerts', 'alert', onSelect);
          bindSelection(map, 'phx-vehicles', 'vehicle', onSelect);
          if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => map.resize());
            resizeObserver.observe(container);
          }
          container.setAttribute(
            'aria-label',
            'Interactive Phoenix-area basemap with fictional transit routes, stops, alerts, and vehicles. Use the Map records control for an accessible feature list.'
          );
          adapterState.ready = true;
          clearTimeout(loadTimer);
          updateMapPresentationSources();
          updateVehicleTargets({ forceSnap: true });
          resetMapView();

          const api = {
            setMapData({
              routes = [],
              stops = [],
              alerts = [],
              vehicles = [],
              transitionDurationMs = ANIMATION.defaultVehicleTransitionMs
            }) {
              adapterState.data = { routes, stops, alerts, vehicles };
              updateMapPresentationSources();
              updateVehicleTargets({ transitionDurationMs });
            },
            setMapFilters({ mode = 'all', routeId = 'all' }) {
              if (
                adapterState.filters.mode === mode
                && adapterState.filters.routeId === routeId
              ) return;
              adapterState.filters = { mode, routeId };
              clearRipplePool();
              updateMapPresentationSources();
              updateVehicleTargets();
            },
            setMapSelection(selection) {
              if (
                adapterState.selection?.type === selection?.type
                && adapterState.selection?.id === selection?.id
              ) return;
              adapterState.selection = selection;
              updateMapPresentationSources();
              renderDisplayedVehicleSource();
            },
            setMapScenario(scenario = {}) {
              const mapUnavailable = Boolean(scenario.mapUnavailable);
              if (adapterState.scenario.mapUnavailable === mapUnavailable) return;
              adapterState.scenario = { mapUnavailable };
              clearRipplePool();
              updateMapPresentationSources();
              updateVehicleTargets({ forceSnap: true });
              ensureAnimationCoordinator();
            },
            resizeMap() {
              if (!adapterState.destroyed) map.resize();
            },
            setPlayback(value) {
              const nextPlaying = Boolean(value);
              if (adapterState.playing === nextPlaying) return;
              adapterState.playing = nextPlaying;
              adapterState.nextRippleSpawnAt = null;
              if (!nextPlaying) {
                clearRipplePool();
                if (document.hidden) snapVehiclesToTargets();
              }
              ensureAnimationCoordinator();
            },
            setReducedMotion(value) {
              const nextReducedMotion = Boolean(value);
              if (adapterState.reducedMotion === nextReducedMotion) return;
              adapterState.reducedMotion = nextReducedMotion;
              adapterState.nextRippleSpawnAt = null;
              if (nextReducedMotion) {
                clearRipplePool();
                snapVehiclesToTargets();
              }
              ensureAnimationCoordinator();
            },
            resetMapView,
            destroyMap,
            isReady() {
              return adapterState.ready && !adapterState.destroyed;
            }
          };
          settled = true;
          resolve(api);
        } catch (error) {
          fail(error);
        }
      });
    });
  }

  window.PHXTransitMap = Object.freeze({ initMap });
})();
