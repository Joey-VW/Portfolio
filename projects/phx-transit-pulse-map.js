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
  const routeColors = {
    blue: '#00a8ff',
    cyan: '#26d9ff',
    teal: '#21d6bd',
    magenta: '#e35cff',
    amber: '#ffb34d'
  };

  function featureCollection(features = []) {
    return { type: 'FeatureCollection', features };
  }

  function pointGeometry(record) {
    if (!Number.isFinite(record.longitude) || !Number.isFinite(record.latitude)) return null;
    return { type: 'Point', coordinates: [record.longitude, record.latitude] };
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
    Object.values(SOURCE_IDS).forEach((id) => {
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
          'major', '#b93445',
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
        'text-field': [
          'match',
          ['get', 'mode'],
          'rail', 'R',
          'bus', 'B',
          '?'
        ],
        'text-size': 9,
        'text-font': ['Noto Sans Bold'],
        'text-allow-overlap': true
      },
      paint: {
        'text-color': '#ffffff'
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
      reducedMotion: Boolean(reducedMotion),
      config: mapConfig
    };

    let settled = false;
    let loadTimer = null;
    let resizeObserver = null;

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

    function updateSources() {
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

      const vehicleFeatures = unavailable ? [] : adapterState.data.vehicles
        .filter((vehicle) => {
          const modeMatches = adapterState.filters.mode === 'all'
            || vehicle.mode === adapterState.filters.mode;
          const routeMatches = adapterState.filters.routeId === 'all'
            || vehicle.routeId === adapterState.filters.routeId;
          const routeVisible = !vehicle.routeId || visibleRouteIds.has(vehicle.routeId);
          return modeMatches && routeMatches && routeVisible;
        })
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

      map.getSource(SOURCE_IDS.routes).setData(featureCollection(routeFeatures));
      map.getSource(SOURCE_IDS.alertSegments).setData(featureCollection(alertSegmentFeatures));
      map.getSource(SOURCE_IDS.stops).setData(featureCollection(stopFeatures));
      map.getSource(SOURCE_IDS.alerts).setData(featureCollection(alertFeatures));
      map.getSource(SOURCE_IDS.vehicles).setData(featureCollection(vehicleFeatures));
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
      adapterState.destroyed = true;
      adapterState.ready = false;
      clearTimeout(loadTimer);
      resizeObserver?.disconnect();
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
          addRouteLayers(map);
          addStopLayers(map);
          addAlertLayers(map);
          addVehicleLayers(map);
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
          updateSources();
          resetMapView();

          const api = {
            setMapData({ routes = [], stops = [], alerts = [], vehicles = [] }) {
              adapterState.data = { routes, stops, alerts, vehicles };
              updateSources();
            },
            setMapFilters({ mode = 'all', routeId = 'all' }) {
              adapterState.filters = { mode, routeId };
              updateSources();
            },
            setMapSelection(selection) {
              adapterState.selection = selection;
              updateSources();
            },
            setMapScenario(scenario = {}) {
              adapterState.scenario = {
                mapUnavailable: Boolean(scenario.mapUnavailable)
              };
              updateSources();
            },
            resizeMap() {
              if (!adapterState.destroyed) map.resize();
            },
            setReducedMotion(value) {
              adapterState.reducedMotion = Boolean(value);
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
