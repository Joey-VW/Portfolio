(() => {
  "use strict";

  const canvas = document.querySelector("#gravityCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAME_VISIBILITY_THRESHOLD = 0.35;
  const teamMeta = {
    player: { label: "Cyan", color: "#6ff8ff", ai: false },
    enemy: { label: "Red", color: "#ff5d9e", ai: true },
    orange: { label: "Orange", color: "#ff9f43", ai: true },
    neutral: { label: "Neutral", color: "#dfe8ff", ai: false },
  };
  const activeTeamKeys = Object.keys(teamMeta);
  const contestTeamKeys = activeTeamKeys.filter(key => key !== "neutral");
  const colors = { ...Object.fromEntries(activeTeamKeys.map(key => [key, teamMeta[key].color])), worm: "#c77dff", gold: "#ffe58a", danger: "#ff6d7a" };
  const BASE_WORLD_BOUNDS = { x: 0, y: 0, width: 1280, height: 800 };
  const BASE_LAUNCH_RADIUS = 98;
  const BASE_PULL_RADIUS = 78;
  const MIN_LAUNCH_SPEED = 112;
  const MAX_LAUNCH_SPEED = 236;
  const LAUNCH_POWER_CURVE = 1.25;
  const MAX_SPEED = 255;
  const BASE_WORM_MAX_RANGE = 285;
  const BASE_WORM_INFLUENCE = 88;
  const BASE_TOTAL_SHIP_CAP = 420;
  const PLANET_MOTION_MULTIPLIER = 1.2;
  const TAU = Math.PI * 2;
  const HEATMAP_WIDTH = 24;
  const HEATMAP_HEIGHT = 15;
  const liveTelemetryConfig = { desktopIntervalMs: 200, mobileIntervalMs: 1000 };


  const LEVELS = [
    {
      id: 1,
      name: "First Orbit",
      difficulty: "Onboarding",
      subtitle: "The classic three-front system: close neutral grabs, a contested star, and forgiving wormhole reach.",
      scale: 1,
      worldBounds: BASE_WORLD_BOUNDS,
      launchRadius: BASE_LAUNCH_RADIUS,
      pullRadius: BASE_PULL_RADIUS,
      wormholeRange: BASE_WORM_MAX_RANGE,
      wormholeInfluence: BASE_WORM_INFLUENCE,
      shipCap: BASE_TOTAL_SHIP_CAP,
      startingShips: { player: 20, enemy: 18, orange: 18 },
      neutralDefenders: 0,
      orbitSpeedMultiplier: 1,
      homeProduction: { player: 1.35, enemy: 1.22, orange: 1.22 },
      aiTuning: { enemy: { thinkOffset: 0, aggressionBase: 0 }, orange: { thinkOffset: 0, aggressionBase: 0 } },
      orbitPaths: {
        inner: { id: "inner", label: "Inner drift", semiMajor: 255, eccentricity: 0.025, phase: -0.18, projectionScale: 0.64, speed: 0.0064 },
        middle: { id: "middle", label: "Home orbit", semiMajor: 500, eccentricity: 0.018, phase: 0, projectionScale: 0.58, speed: 0.0031 },
        outer: { id: "outer", label: "Outer drift", semiMajor: 570, eccentricity: 0.035, phase: 0.16, projectionScale: 0.55, speed: 0.0051 }
      },
      planetSeeds: [
        { id: "star", type: "star", owner: "neutral", radius: 38, rate: .35, isStar: true, fixed: "center", strategicValue: "star-control" },
        { id: "player-home", baseId: "cyan-home", type: "home", owner: "player", radius: 35, path: "middle", angle: Math.PI },
        { id: "enemy-home", baseId: "rival-home", type: "home", owner: "enemy", radius: 34, path: "middle", angle: -Math.PI / 3 },
        { id: "orange-home", baseId: "orange-home", type: "home", owner: "orange", radius: 34, path: "middle", angle: Math.PI / 3 },
        { id: "p1", type: "moon", owner: "neutral", radius: 22, rate: .78, path: "inner", angle: -Math.PI / 2 },
        { id: "p2", type: "planet", owner: "neutral", radius: 29, rate: 1.08, path: "inner", angle: Math.PI / 6 },
        { id: "p3", type: "asteroid", owner: "neutral", radius: 19, rate: .68, path: "inner", angle: Math.PI * .82 },
        { id: "p4", type: "planet", owner: "neutral", radius: 28, rate: 1.02, path: "outer", angle: -Math.PI * .82 },
        { id: "p5", type: "moon", owner: "neutral", radius: 22, rate: .82, path: "outer", angle: -Math.PI * .22 },
        { id: "p6", type: "asteroid", owner: "neutral", radius: 19, rate: .66, path: "outer", angle: Math.PI * .22 },
        { id: "p7", type: "planet", owner: "neutral", radius: 27, rate: 1.04, path: "outer", angle: Math.PI * .78 }
      ]
    },
    {
      id: 2,
      name: "Wide Periapsis",
      difficulty: "Advanced",
      subtitle: "A wider board with distant neutral routes; wormholes matter and both AI factions begin slightly ahead.",
      scale: .92,
      worldBounds: BASE_WORLD_BOUNDS,
      launchRadius: 92,
      pullRadius: 72,
      wormholeRange: 268,
      wormholeInfluence: 80,
      shipCap: 470,
      startingShips: { player: 20, enemy: 22, orange: 21 },
      neutralDefenders: 5,
      orbitSpeedMultiplier: 1.07,
      homeProduction: { player: 1.32, enemy: 1.34, orange: 1.3 },
      aiTuning: { enemy: { thinkOffset: -.45, aggressionBase: .04 }, orange: { thinkOffset: -.3, aggressionBase: .035 } },
      orbitPaths: {
        inner: { id: "inner", label: "Inner slingshot", semiMajor: 285, eccentricity: 0.02, phase: -0.34, projectionScale: 0.61, speed: 0.0058 },
        middle: { id: "middle", label: "Home braid", semiMajor: 535, eccentricity: 0.03, phase: 0.08, projectionScale: 0.56, speed: 0.0028 },
        outer: { id: "outer", label: "Outer picket", semiMajor: 610, eccentricity: 0.035, phase: 0.23, projectionScale: 0.53, speed: 0.0045 }
      },
      planetSeeds: []
    },
    {
      id: 3,
      name: "Broken Helix",
      difficulty: "Expert",
      subtitle: "The largest asymmetric system: longer lanes, stronger enemy homes, and multiple contested comeback routes.",
      scale: .86,
      worldBounds: BASE_WORLD_BOUNDS,
      launchRadius: 86,
      pullRadius: 68,
      wormholeRange: 252,
      wormholeInfluence: 74,
      shipCap: 520,
      startingShips: { player: 28, enemy: 18, orange: 18 },
      neutralDefenders: 8,
      orbitSpeedMultiplier: 1.14,
      homeProduction: { player: 1.34, enemy: 1.46, orange: 1.42 },
      playerHomeGraceSeconds: 10,
      aiTuning: { enemy: { thinkOffset: -.75, aggressionBase: .075 }, orange: { thinkOffset: -.6, aggressionBase: .065 } },
      orbitPaths: {
        inner: { id: "inner", label: "Inner knife-edge", semiMajor: 305, eccentricity: 0.018, phase: -0.48, projectionScale: 0.59, speed: 0.0052 },
        middle: { id: "middle", label: "Home helix", semiMajor: 560, eccentricity: 0.04, phase: -0.05, projectionScale: 0.53, speed: 0.00245 },
        outer: { id: "outer", label: "Outer siege ring", semiMajor: 635, eccentricity: 0.045, phase: 0.31, projectionScale: 0.50, speed: 0.0039 }
      },
      planetSeeds: []
    }
  ];

  LEVELS[1].planetSeeds = [
    { id: "star", type: "star", owner: "neutral", radius: 35, rate: .38, isStar: true, fixed: "center", strategicValue: "star-control" },
    { id: "player-home", baseId: "cyan-home", type: "home", owner: "player", radius: 32, path: "middle", angle: Math.PI * .96 },
    { id: "enemy-home", baseId: "rival-home", type: "home", owner: "enemy", radius: 32, path: "middle", angle: -Math.PI * .36 },
    { id: "orange-home", baseId: "orange-home", type: "home", owner: "orange", radius: 31, path: "middle", angle: Math.PI * .31 },
    { id: "p1", type: "moon", owner: "neutral", radius: 20, rate: .74, path: "inner", angle: -Math.PI * .72 },
    { id: "p2", type: "planet", owner: "neutral", radius: 27, rate: 1.12, path: "inner", angle: -.08 },
    { id: "p3", type: "asteroid", owner: "neutral", radius: 18, rate: .66, path: "inner", angle: Math.PI * .66 },
    { id: "p4", type: "planet", owner: "neutral", radius: 26, rate: 1.05, path: "outer", angle: -Math.PI * .93 },
    { id: "p5", type: "moon", owner: "neutral", radius: 21, rate: .86, path: "outer", angle: -Math.PI * .58 },
    { id: "p6", type: "planet", owner: "enemy", radius: 27, rate: 1.16, path: "outer", angle: Math.PI * .03, startingShips: 12 },
    { id: "p7", type: "asteroid", owner: "orange", radius: 18, rate: .7, path: "outer", angle: Math.PI * .42, startingShips: 12 },
    { id: "p8", type: "moon", owner: "neutral", radius: 21, rate: .82, path: "outer", angle: Math.PI * .82 },
    { id: "p9", type: "planet", owner: "neutral", radius: 25, rate: 1.0, path: "inner", angle: Math.PI * 1.16 }
  ];
  LEVELS[2].planetSeeds = [
    { id: "star", type: "star", owner: "neutral", radius: 33, rate: .42, isStar: true, fixed: "center", strategicValue: "star-control" },
    { id: "player-home", baseId: "cyan-home", type: "home", owner: "player", radius: 30, path: "middle", angle: Math.PI * 1.03 },
    { id: "enemy-home", baseId: "rival-home", type: "home", owner: "enemy", radius: 31, path: "middle", angle: -Math.PI * .42 },
    { id: "orange-home", baseId: "orange-home", type: "home", owner: "orange", radius: 31, path: "middle", angle: Math.PI * .24 },
    { id: "p1", type: "asteroid", owner: "neutral", radius: 16, rate: .62, path: "inner", angle: -Math.PI * .86 },
    { id: "p2", type: "moon", owner: "enemy", radius: 19, rate: .78, path: "inner", angle: -Math.PI * .34, startingShips: 14 },
    { id: "p3", type: "planet", owner: "neutral", radius: 25, rate: 1.14, path: "inner", angle: Math.PI * .08 },
    { id: "p4", type: "asteroid", owner: "orange", radius: 17, rate: .68, path: "inner", angle: Math.PI * .54, startingShips: 14 },
    { id: "p5", type: "moon", owner: "neutral", radius: 20, rate: .82, path: "inner", angle: Math.PI * .92 },
    { id: "p6", type: "planet", owner: "neutral", radius: 25, rate: 1.18, path: "outer", angle: -Math.PI * .96 },
    { id: "p7", type: "moon", owner: "neutral", radius: 19, rate: .84, path: "outer", angle: -Math.PI * .62 },
    { id: "p8", type: "planet", owner: "enemy", radius: 26, rate: 1.2, path: "outer", angle: -Math.PI * .08, startingShips: 12 },
    { id: "p9", type: "asteroid", owner: "orange", radius: 17, rate: .7, path: "outer", angle: Math.PI * .27, startingShips: 14 },
    { id: "p10", type: "planet", owner: "neutral", radius: 25, rate: 1.1, path: "outer", angle: Math.PI * .61 },
    { id: "p11", type: "moon", owner: "neutral", radius: 19, rate: .86, path: "outer", angle: Math.PI * .93 }
  ];
  const GRAVITY_DEBUG_STORAGE_KEY = "portfolio.gravityFleetDevLab";
  const GRAVITY_DEBUG_ENABLED_KEY = "portfolio.gravityFleetDebug";
  const GRAVITY_NAV_DEFAULTS = { liveTelemetryOffset: -430, matchAnalysisOffset: 72 };
  const GRAVITY_BALANCE_KEYS = ["launchRadius", "pullRadius", "wormholeRange", "wormholeInfluence", "shipCap", "playerHomeGraceSeconds"];
  const originalGravityBalance = Object.fromEntries(LEVELS.map(level => [level.id, Object.fromEntries(GRAVITY_BALANCE_KEYS.map(key => [key, Object.hasOwn(level, key) ? level[key] : null]))]));
  const gravityDevSettings = { navigation: { ...GRAVITY_NAV_DEFAULTS }, levelOverrides: {} };
  let selectedLevelId = 1;

  const ui = {
    start: document.querySelector("#startMatch"), dockMissionSetup: document.querySelector("#dockMissionSetup"), reset: document.querySelector("#resetMatch"), worm: document.querySelector("#wormholeMode"), mobileModes: [...document.querySelectorAll("[data-game-mode]")], mobileModeControls: document.querySelector("#mobileModeControls"),
    overlay: document.querySelector("#gameStartOverlay"), levelPicker: document.querySelector("#levelPicker"), levelName: document.querySelector("#selectedLevelName"), levelDescription: document.querySelector("#selectedLevelDescription"), levelDifficulty: document.querySelector("#selectedLevelDifficulty"),
    tutorial: document.querySelector("#gameTutorialOverlay"), tutorialGo: document.querySelector("#tutorialGo"),
    outcome: document.querySelector("#gameOutcomeOverlay"), outcomeTitle: document.querySelector("#gameOutcomeTitle"), outcomeSummary: document.querySelector("#gameOutcomeSummary"), outcomeLevel: document.querySelector("#gameOutcomeLevel"), outcomeScore: document.querySelector("#gameOutcomeScore"), outcomeDuration: document.querySelector("#gameOutcomeDuration"), outcomeCaptures: document.querySelector("#gameOutcomeCaptures"), outcomeLargestLaunch: document.querySelector("#gameOutcomeLargestLaunch"), outcomeDestroyed: document.querySelector("#gameOutcomeDestroyed"), outcomeTransits: document.querySelector("#gameOutcomeTransits"), outcomeSignal: document.querySelector("#gameOutcomeSignal"),
    viewAnalysis: document.querySelector("#viewMatchAnalysis"), playAgain: document.querySelector("#playAgain"), chooseLevel: document.querySelector("#chooseLevel"), analytics: document.querySelector("#analytics"), analyticsTitle: document.querySelector("#analytics-title"),
    timer: document.querySelector("#matchTimer"), readout: document.querySelector("#fleetReadout"), feed: document.querySelector("#eventFeed"),
    commandDock: document.querySelector(".command-dock"), commandModeLabel: document.querySelector("#commandModeLabel"), commandStates: [...document.querySelectorAll("[data-command-state]")],
    dockLiveObjective: document.querySelector("#dockLiveObjective"), dockLiveSource: document.querySelector("#dockLiveSource"), dockLiveAim: document.querySelector("#dockLiveAim"), dockLiveReadiness: document.querySelector("#dockLiveReadiness"), dockLiveStatus: document.querySelector("#dockLiveStatus"),
    dockPostOutcome: document.querySelector("#dockPostOutcome"), dockPostLevel: document.querySelector("#dockPostLevel"), dockPostScore: document.querySelector("#dockPostScore"), dockPostDuration: document.querySelector("#dockPostDuration"), dockPostSignal: document.querySelector("#dockPostSignal"), dockViewAnalysis: document.querySelector("#dockViewAnalysis"), dockPlayAgain: document.querySelector("#dockPlayAgain"),
    factionModule: document.querySelector(".faction-module"), telemetryModule: document.querySelector("#liveTelemetryModule"), telemetryHeading: document.querySelector("#liveTelemetryModule h3"), eventRail: document.querySelector(".event-rail"), eventRailLabel: document.querySelector(".event-rail-head span"),
    empty: document.querySelector("#dashboardEmpty"), dashboard: document.querySelector("#dashboard"), kpis: document.querySelector("#kpiGrid"),
    shipChart: document.querySelector("#shipChart"), ownerChart: document.querySelector("#ownershipChart"), heatmap: document.querySelector("#heatmap"), heatmapControls: document.querySelector("#heatmapControls"), heatmapSummary: document.querySelector("#heatmapSummary"), captures: document.querySelector("#captureTimeline"),
    liveFleetChart: document.querySelector("#liveFleetChart"), liveLaunchChart: document.querySelector("#liveLaunchChart"), liveSystemDonut: document.querySelector("#liveSystemDonut"),
    pressure: document.querySelector("#pressureSnapshot"), launchPulse: document.querySelector("#launchPulse"), liveTelemetry: document.querySelector("#liveTelemetryModule"), liveTelemetryBadge: document.querySelector("#liveTelemetryBadge"), backToGame: document.querySelector("#backToGame"),
    insights: document.querySelector("#insights"), leaderboard: document.querySelector("#leaderboard"), recent: document.querySelector("#recentRuns"), clearRecent: document.querySelector("#clearLocalRuns"), recentStatus: document.querySelector("#recentRunsStatus"),
    tutorialCanvases: [...document.querySelectorAll("[data-tutorial-demo]")],
    mobileHud: document.querySelector("#mobileGameHud"), mobileHudLevel: document.querySelector("#mobileHudLevel"), mobileHudTimer: document.querySelector("#mobileHudTimer"), mobileHudShips: document.querySelector("#mobileHudShips"), mobileHudWorlds: document.querySelector("#mobileHudWorlds"), mobileHudRivals: document.querySelector("#mobileHudRivals"), mobileHudTraveling: document.querySelector("#mobileHudTraveling"), mobileHudFps: document.querySelector("#mobileHudFps"), mobileHudStatus: document.querySelector("#mobileHudStatus"),
    mobileTelemetryToggle: document.querySelector("#mobileTelemetryToggle"), mobileTelemetryDrawer: document.querySelector("#mobileTelemetryDrawer"), mobileTelemetryClose: document.querySelector("#mobileTelemetryClose"), mobileDrawerBackdrop: document.querySelector("#mobileDrawerBackdrop"), mobileDrawerRed: document.querySelector("#mobileDrawerRed"), mobileDrawerOrange: document.querySelector("#mobileDrawerOrange"), mobileDrawerStar: document.querySelector("#mobileDrawerStar"), mobileDrawerLaunch: document.querySelector("#mobileDrawerLaunch"), mobileDrawerFights: document.querySelector("#mobileDrawerFights"), mobileDrawerTransits: document.querySelector("#mobileDrawerTransits"), mobileDrawerEvents: document.querySelector("#mobileDrawerEvents"), mobileReset: document.querySelector("#mobileResetMatch"), mobileChooseLevel: document.querySelector("#mobileChooseLevel"),
    mobileShellStatus: document.querySelector("#mobileShellStatus"), mobileShellStatusTitle: document.querySelector("#mobileShellStatusTitle"), mobileShellStatusMessage: document.querySelector("#mobileShellStatusMessage"), mobileShellDiagnostic: document.querySelector("#mobileShellDiagnostic"), mobileShellActions: document.querySelector("#mobileShellActions"), mobileShellRetry: document.querySelector("#mobileShellRetry"), mobileShellReturn: document.querySelector("#mobileShellReturn"), mobileMatchExit: document.querySelector("#mobileMatchExit")
  };

  const modalElements = [ui.overlay, ui.tutorial, ui.outcome].filter(Boolean);
  const gameStage = canvas.closest(".game-stage");
  let stagePortalPlaceholder = null;
  let stagePortalParent = null;
  modalElements.forEach(element => document.body.append(element));

  function rand(min, max) { return min + Math.random() * (max - min); }

  function createCaptureState() {
    return Object.fromEntries(contestTeamKeys.map(key => [key, 0]));
  }

  function bodyInfluence(body) {
    if (body.isStar) return body.radius + 128;
    return body.radius + (body.type === "home" || body.type === "base" ? 115 : 84);
  }

  function hydratePlanet(body) {
    return { ...body, capture: createCaptureState(), prod: 0, pulse: Math.random() * 7 };
  }

  function activeLevel() {
    return LEVELS.find(level => level.id === selectedLevelId) || LEVELS[0];
  }

  function levelValue(key) {
    const level = activeLevel();
    const defaults = {
      worldBounds: BASE_WORLD_BOUNDS,
      launchRadius: BASE_LAUNCH_RADIUS,
      pullRadius: BASE_PULL_RADIUS,
      wormholeRange: BASE_WORM_MAX_RANGE,
      wormholeInfluence: BASE_WORM_INFLUENCE,
      shipCap: BASE_TOTAL_SHIP_CAP
    };
    return level[key] ?? defaults[key];
  }

  const levelWorldBounds = () => levelValue("worldBounds");
  const levelLaunchRadius = () => levelValue("launchRadius");
  const levelPullRadius = () => levelValue("pullRadius");
  const levelWormMaxRange = () => levelValue("wormholeRange");
  const levelWormInfluence = () => levelValue("wormholeInfluence");
  const levelShipCap = () => levelValue("shipCap");

  function orbitCenter(levelConfig = activeLevel()) {
    const bounds = levelConfig.worldBounds || BASE_WORLD_BOUNDS;
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }

  function makeOrbitPaths(levelConfig = activeLevel()) {
    const center = orbitCenter(levelConfig);
    const levelSpeedMultiplier = levelConfig.orbitSpeedMultiplier ?? 1;
    return Object.fromEntries(Object.entries(levelConfig.orbitPaths).map(([key, path]) => [key, { ...path, speed: path.speed * PLANET_MOTION_MULTIPLIER * levelSpeedMultiplier, cx: path.cx ?? center.x, cy: path.cy ?? center.y }]));
  }

  function positionOnOrbit(path, angle) {
    const theta = angle + (path.phase || 0);
    const e = clamp(path.eccentricity || 0, 0, 0.05);
    const a = path.semiMajor;
    const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
    return {
      x: path.cx + Math.cos(theta) * r,
      y: path.cy + Math.sin(theta) * r * (path.projectionScale || 1)
    };
  }

  function attachOrbit(seed, path, angle) {
    const point = positionOnOrbit(path, angle);
    return { ...seed, ...point, orbitPathId: path.id, orbitAngle: angle, orbitSpeed: path.speed, orbitPhase: path.phase, orbitRadius: path.semiMajor, semiMajor: path.semiMajor, eccentricity: path.eccentricity, projectionScale: path.projectionScale };
  }

  function canPlaceBody(candidate, bodies, minSpacing = 92) {
    return bodies.every(body => dist(candidate, body) >= body.radius + candidate.radius + minSpacing);
  }

  function placeOrbitalBody(seed, path, baseAngle, bodies, minSpacing = 96, attempts = 18) {
    const increments = [0, .14, -.14, .28, -.28, .42, -.42, .56, -.56, .7, -.7, .84, -.84, 1.02, -1.02, 1.2, -1.2, 1.38];
    for (let i = 0; i < Math.min(attempts, increments.length); i++) {
      const angle = baseAngle + increments[i];
      const candidate = attachOrbit(seed, path, angle);
      if (canPlaceBody(candidate, bodies, minSpacing)) return candidate;
    }
    return attachOrbit(seed, path, baseAngle);
  }

  function generatePlanets(levelConfig = activeLevel()) {
    const paths = makeOrbitPaths(levelConfig);
    const center = orbitCenter(levelConfig);
    const bodies = [];
    levelConfig.planetSeeds.forEach(seed => {
      const { path, angle, fixed, minSpacing, attempts, ...bodySeed } = seed;
      const production = bodySeed.type === "home" ? levelConfig.homeProduction?.[bodySeed.owner] ?? bodySeed.rate : bodySeed.rate;
      const body = fixed === "center"
        ? { ...bodySeed, rate: production, x: center.x, y: center.y }
        : placeOrbitalBody({ ...bodySeed, rate: production }, paths[path], angle, bodies, minSpacing ?? (bodySeed.type === "home" ? 118 : 96), attempts ?? (bodySeed.type === "home" ? 1 : 18));
      bodies.push(hydratePlanet(body));
    });
    return bodies;
  }

  function updatePlanetOrbits(dt) {
    if (state.ended) return;
    const paths = makeOrbitPaths();
    state.planets.forEach(planet => {
      if (!planet.orbitPathId) return;
      const path = paths[planet.orbitPathId];
      if (!path) return;
      const speed = reduced ? 0 : planet.orbitSpeed;
      planet.orbitAngle += speed * dt;
      const point = positionOnOrbit(path, planet.orbitAngle);
      planet.x = point.x;
      planet.y = point.y;
    });
  }

  let state;
  let shipId = 1;
  let wormMode = false;
  let pendingWorm = null;
  let activePointerId = null;
  const coarsePointerQuery = window.matchMedia("(any-pointer: coarse)");
  const finePointerQuery = window.matchMedia("(any-pointer: fine)");
  const primaryCoarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const mobileViewportQuery = window.matchMedia("(max-width: 900px)");
  const isTouchCapable = () => coarsePointerQuery.matches;
  const usesMobilePresentation = () => isTouchCapable() && mobileViewportQuery.matches;
  const allowsShipTrails = () => !reduced && !usesMobilePresentation();
  const usesCoarseTargets = event => event.pointerType === "touch" || event.pointerType === "pen" || (!event.pointerType && primaryCoarsePointerQuery.matches);
  let completedRun = null;
  let dashboardRunId = null;
  let dashboardRenderPromise = null;
  let dashboardRun = null;
  let heatmapMode = "movement";
  let benchmarkRunsPromise = null;
  let activeModal = null;
  let modalOrigin = null;
  const inertedBackground = new Map();
  let commandDockSignature = "";
  let syncGravityDevLab = () => {};
  let updateGravityDevActions = () => {};
  let mobileDrawerOpen = false;
  let mobileHudSignature = "";
  let lastHudUpdateAt = 0;
  let lastProcessedFrameAt = 0;
  let lastTutorialFrameAt = 0;
  let frameWindowStartedAt = performance.now();
  let frameWindowCount = 0;
  let observedFps = 0;
  let staticMapLayer = null;
  let staticMapLayerLevel = null;
  let mobilePresentationDismissed = false;
  let mobileShellState = "idle";
  let mobileShellTimer = 0;
  let lastSuccessfulDrawAt = 0;
  let lastSuccessfulSimulationAt = 0;
  let lastRuntimeError = "";
  const mobileDiagnosticsEnabled = new URLSearchParams(window.location.search).get("gravityDebug") === "1";

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const alphaColor = (hex, alpha) => {
    const value = hex?.startsWith("#") ? hex.slice(1) : "";
    if (value.length !== 6) return hex || `rgba(255,255,255,${alpha})`;
    const n = parseInt(value, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };
  const norm = (x, y) => {
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d, len: d };
  };

  function createAiTeamState(team) {
    const tuning = activeLevel().aiTuning?.[team] || {};
    return {
      team, mode: "expand", targetPlanetId: null, modeUntil: 0, nextThinkAt: (team === "enemy" ? 2.2 : 3.8) + (tuning.thinkOffset || 0) + Math.random() * 2.4, aggression: (team === "enemy" ? .58 : .48) + (tuning.aggressionBase || 0),
      lastMajorLaunchTime: -99, lastWormholeAt: -99, lastPlayerHomeTargetAt: -99, openingComplete: false, firstExpansionAt: null, earlyNeutralCaptures: 0, recentLosses: [], recentCaptures: [], preferredFrontPlanetId: null
    };
  }

  function makeState() {
    const level = activeLevel();
    return {
      levelId: level.id, levelName: level.name, levelDifficulty: level.difficulty, levelSubtitle: level.subtitle,
      running: false, ended: false, acceptingInput: false, dashboardRendered: false, outcome: null, outcomeScore: 0, startedAt: null, endedAt: null,
      elapsed: 0, lastTick: performance.now(), planets: generatePlanets(level),
      ships: [], launcher: null, aiLaunchFields: [], wormholes: [], wormDrag: null, wormholesCreated: 0, playerWormholesCreated: 0, aiWormholesCreated: 0, wormholeUses: 0, shipTransits: 0, wormholeEvents: [], wormholePulls: 0,
      wormholeOrbitCaptures: 0, wormholeTransitCount: 0,
      events: [], effects: [], launchEvents: [], launches: 0, shipsLaunched: 0, largestLaunch: 0, captures: [], combat: 0, shipsLost: 0, shipsDestroyed: 0,
      shipsPulled: 0, gravityCaptures: 0, blasterHits: 0, deepSpaceCombats: 0, wallBounces: 0, enemyMajorLaunches: 0,
      heatmap: { width: HEATMAP_WIDTH, height: HEATMAP_HEIGHT, movement: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0), combat: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0) }, shipCountTimeline: [], ownershipTimeline: [], lastSnap: 0, lastLiveSignature: "", lastHudSignature: "", liveSpikeUntil: 0, aiClock: 2.5, peakPlayerShips: 0, peakFleetAdvantage: 0,
      aiTeams: Object.fromEntries(contestTeamKeys.filter(key => teamMeta[key].ai).map(key => [key, createAiTeamState(key)]))
    };
  }


  function deriveCommandDockMode() {
    if (state?.ended) return "post-game";
    if (state?.running && state?.acceptingInput) return "live";
    return "pre-game";
  }

  function setText(el, value) {
    if (el && el.textContent !== String(value)) el.textContent = String(value);
  }

  function moveFocusIfHidden(container, fallback) {
    if (container?.hidden && container.contains(document.activeElement)) (fallback || canvas)?.focus({ preventScroll: true });
  }

  function planetDisplayName(planet) {
    if (!planet) return "Open space";
    if (planet.isStar) return `${teamLabel(planet.owner)} star`;
    return `${teamLabel(planet.owner)} ${planet.type}`;
  }

  function aimPlanetLabel() {
    const point = state.launcher?.lockedPointer;
    if (!point) return "Open space";
    const hit = nearestPlanet(point) || [...state.planets].sort((a, b) => dist(point, a) - dist(point, b))[0];
    return hit && dist(point, hit) <= hit.radius + 44 ? planetDisplayName(hit) : "Open space";
  }

  // Older local runs only recorded a combined portal count and per-ship wormhole uses.
  // Keep those records readable while new runs make the two measures explicit.
  function playerPortalCount(run) {
    if (Number.isFinite(run?.playerWormholesCreated)) return run.playerWormholesCreated;
    return Math.max(0, (run?.wormholesCreated || 0) - (run?.aiWormholesCreated || 0));
  }

  function aiPortalCount(run) {
    if (Number.isFinite(run?.aiWormholesCreated)) return run.aiWormholesCreated;
    return 0;
  }

  function shipTransitCount(run) {
    return run?.shipTransits ?? run?.wormholeUses ?? 0;
  }

  function strongestMatchSignal(run = completedRun) {
    if (!run) return "Telemetry captured";
    const signals = [
      [run.largestLaunch > 0, `Largest launch: ${run.largestLaunch} ships`],
      [run.peakFleetAdvantage > 0, `Peak fleet advantage: +${run.peakFleetAdvantage} ships`],
      [run.planetsCaptured > 0, `Planets captured: ${run.planetsCaptured}`],
      [run.shipsDestroyed > 0, `Ships destroyed: ${run.shipsDestroyed}`],
      [shipTransitCount(run) > 0, `Ship transits: ${shipTransitCount(run)}`],
      [playerPortalCount(run) > 0, `Cyan portals deployed: ${playerPortalCount(run)}`],
      [run.deepSpaceCombats > 0, `Deep-space fights: ${run.deepSpaceCombats}`]
    ];
    return signals.find(([ok]) => ok)?.[1] || "Telemetry captured for review";
  }

  function liveDockContext(c = counts()) {
    const l = state.launcher;
    const selected = l?.selectedShipIds?.length || 0;
    const sourcePlanet = l?.nearPlanetId ? state.planets.find(p => p.id === l.nearPlanetId) : null;
    const source = l?.active ? planetDisplayName(sourcePlanet) : "Select a Cyan fleet";
    const aim = l?.active ? aimPlanetLabel() : "Open space";
    const inFlight = c.teams.player?.traveling || 0;
    const playerShips = c.playerShips || 0;
    let readiness = `${playerShips} Cyan ships · ${inFlight} in flight`;
    let status = "Hold LMB near a Cyan planet to gather a launch field.";
    if (wormMode) status = pendingWorm ? "Choose a wormhole exit point." : "Choose a wormhole entrance point.";
    else if (l?.active && selected > 0) {
      readiness = `${selected} ships selected · Release to launch`;
      status = `Release to launch ${selected} Cyan ships toward the current aim.`;
    } else if (l?.active) {
      readiness = "No ships gathered · Move near a Cyan fleet";
      status = "Move the launch field toward orbiting Cyan ships.";
    }
    return { source, aim, readiness, status };
  }

  function updateCommandDock(c = counts()) {
    updateGravityDevActions();
    const mode = deriveCommandDockMode();
    const level = activeLevel();
    const live = mode === "live" ? liveDockContext(c) : null;
    const sig = [mode, selectedLevelId, state?.elapsed?.toFixed(0), state?.outcome, state?.outcomeScore, state?.launcher?.nearPlanetId, state?.launcher?.selectedShipIds?.length || 0, state?.launcher?.lockedPointer ? `${Math.round(state.launcher.lockedPointer.x)},${Math.round(state.launcher.lockedPointer.y)}` : "", wormMode, pendingWorm ? 1 : 0, completedRun?.runId].join("|");
    if (sig === commandDockSignature) return;
    commandDockSignature = sig;
    if (ui.commandDock) ui.commandDock.dataset.mode = mode;
    setText(ui.commandModeLabel, mode.replace("-", " "));
    ui.commandStates.forEach(group => {
      const active = group.dataset.commandState === mode;
      if (group.hidden === active) group.hidden = !active;
      if (!active) moveFocusIfHidden(group, ui.dockMissionSetup || canvas);
    });
    const supportingHidden = mode === "pre-game";
    [ui.factionModule, ui.telemetryModule, ui.eventRail].forEach(module => { if (module) module.hidden = supportingHidden; });
    setText(ui.telemetryHeading, mode === "post-game" ? "Final telemetry" : "Live telemetry");
    setText(ui.eventRailLabel, mode === "post-game" ? "Final log" : "Live log");
    setText(ui.dockLiveObjective, "Protect Cyan while capturing every Red and Orange planet.");
    if (live) {
      setText(ui.dockLiveSource, live.source);
      setText(ui.dockLiveAim, live.aim);
      setText(ui.dockLiveReadiness, live.readiness);
      setText(ui.dockLiveStatus, live.status);
    }
    if (mode !== "live") setWormMode(false);
    if (ui.mobileModeControls) ui.mobileModeControls.hidden = !(mode === "live" && isTouchCapable());
    if (ui.reset) ui.reset.disabled = mode !== "live";
    if (ui.worm) ui.worm.disabled = mode !== "live";
    const run = completedRun;
    setText(ui.dockPostOutcome, run ? `${run.outcome} - ${run.levelName}` : "Match complete");
    setText(ui.dockPostLevel, run ? `Level ${run.levelId} - ${run.levelName}` : `Level ${level.id} - ${level.name}`);
    setText(ui.dockPostScore, run?.score ?? state?.outcomeScore ?? 0);
    setText(ui.dockPostDuration, fmt(run?.durationSeconds ?? state?.elapsed ?? 0));
    setText(ui.dockPostSignal, strongestMatchSignal(run));
  }

  function setOverlayVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.setAttribute("aria-hidden", String(!visible));
  }

  function closeMobileTelemetryDrawer({ restoreFocus = false } = {}) {
    if (!mobileDrawerOpen && ui.mobileTelemetryDrawer?.hidden) return;
    mobileDrawerOpen = false;
    if (ui.mobileTelemetryDrawer) ui.mobileTelemetryDrawer.hidden = true;
    if (ui.mobileDrawerBackdrop) ui.mobileDrawerBackdrop.hidden = true;
    ui.mobileTelemetryToggle?.setAttribute("aria-expanded", "false");
    if (ui.mobileHud) ui.mobileHud.inert = false;
    if (ui.mobileModeControls) ui.mobileModeControls.inert = false;
    document.body.classList.remove("gravity-mobile-drawer-open");
    if (restoreFocus) ui.mobileTelemetryToggle?.focus({ preventScroll: true });
  }

  function openMobileTelemetryDrawer() {
    if (!usesMobilePresentation() || !state?.running || state?.ended) return;
    mobileDrawerOpen = true;
    if (ui.mobileTelemetryDrawer) ui.mobileTelemetryDrawer.hidden = false;
    if (ui.mobileDrawerBackdrop) ui.mobileDrawerBackdrop.hidden = false;
    ui.mobileTelemetryToggle?.setAttribute("aria-expanded", "true");
    if (ui.mobileHud) ui.mobileHud.inert = true;
    if (ui.mobileModeControls) ui.mobileModeControls.inert = true;
    document.body.classList.add("gravity-mobile-drawer-open");
    updateMobileHud(counts(), true);
    ui.mobileTelemetryClose?.focus({ preventScroll: true });
  }

  function portalGameStage() {
    if (!gameStage || gameStage.parentElement === document.body) return;
    stagePortalParent = gameStage.parentNode;
    stagePortalPlaceholder = document.createComment("gravity-fleet-stage-placeholder");
    stagePortalParent.insertBefore(stagePortalPlaceholder, gameStage);
    document.body.append(gameStage);
    gameStage.classList.add("gravity-mobile-stage");
  }

  function restoreGameStage() {
    if (!gameStage || gameStage.parentElement !== document.body) return;
    if (stagePortalPlaceholder?.parentNode) stagePortalPlaceholder.parentNode.replaceChild(gameStage, stagePortalPlaceholder);
    else if (stagePortalParent) stagePortalParent.append(gameStage);
    stagePortalPlaceholder = null;
    stagePortalParent = null;
    gameStage.classList.remove("gravity-mobile-stage");
  }

  function syncMobilePresentation() {
    if (gameStage?.parentElement === document.body && (!usesMobilePresentation() || !state?.running || mobilePresentationDismissed || mobileShellState === "idle" || mobileShellState === "failed")) restoreGameStage();
    const preparing = Boolean(usesMobilePresentation() && state?.running && mobileShellState === "preparing");
    const active = Boolean(usesMobilePresentation() && state?.running && mobileShellState === "ready" && !mobilePresentationDismissed);
    document.documentElement.classList.toggle("gravity-mobile-preparing", preparing);
    document.body.classList.toggle("gravity-mobile-preparing", preparing);
    document.documentElement.classList.toggle("gravity-mobile-match", active);
    document.body.classList.toggle("gravity-mobile-match", active);
    if (ui.mobileHud) ui.mobileHud.hidden = !(active && state?.acceptingInput && !state?.ended);
    if (ui.mobileModeControls) ui.mobileModeControls.hidden = !(active && state?.acceptingInput && !state?.ended);
    if (ui.mobileMatchExit) ui.mobileMatchExit.hidden = !(preparing || active);
    if (!active || state?.ended) closeMobileTelemetryDrawer();
    mobileHudSignature = "";
  }

  function setMobileShellStatus(stateName, title, message, error = "") {
    mobileShellState = stateName;
    if (ui.mobileShellStatus) ui.mobileShellStatus.hidden = stateName === "idle" || stateName === "ready";
    setText(ui.mobileShellStatusTitle, title);
    setText(ui.mobileShellStatusMessage, message);
    if (ui.mobileShellDiagnostic) {
      ui.mobileShellDiagnostic.hidden = !error || !mobileDiagnosticsEnabled;
      setText(ui.mobileShellDiagnostic, error);
    }
    if (ui.mobileShellActions) ui.mobileShellActions.hidden = stateName !== "failed";
    syncMobilePresentation();
  }

  function viewportIntersection(rect) {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const right = left + (viewport?.width || window.innerWidth);
    const bottom = top + (viewport?.height || window.innerHeight);
    return Boolean(rect && rect.right > left && rect.left < right && rect.bottom > top && rect.top < bottom);
  }

  function visibleSurfaceDetails(element) {
    const rect = element?.getBoundingClientRect();
    const style = element ? window.getComputedStyle(element) : null;
    return { rect, display: style?.display || "", visibility: style?.visibility || "", opacity: Number(style?.opacity || 0), position: style?.position || "", zIndex: Number(style?.zIndex || 0), intersects: viewportIntersection(rect), valid: Boolean(rect?.width > 0 && rect?.height > 0 && style?.display !== "none" && style?.visibility !== "hidden" && Number(style?.opacity || 0) > .01 && viewportIntersection(rect)) };
  }

  function mobileSurfaceDetails() {
    const stage = visibleSurfaceDetails(gameStage);
    const surface = visibleSurfaceDetails(canvas);
    const hud = visibleSurfaceDetails(ui.mobileHud);
    const controls = visibleSurfaceDetails(ui.mobileModeControls);
    const exit = visibleSurfaceDetails(ui.mobileMatchExit);
    const stackingValid = stage.position === "fixed" && stage.zIndex >= 900 && hud.zIndex > stage.zIndex && controls.zIndex > stage.zIndex && exit.zIndex > stage.zIndex;
    return { stage, surface, hud, controls, exit, stackingValid, valid: gameStage?.parentElement === document.body && [stage, surface, hud, controls, exit].every(item => item.valid) && stackingValid && canvas.width > 0 && canvas.height > 0 };
  }

  function rollbackMobileShell(reason) {
    window.clearTimeout(mobileShellTimer);
    lastRuntimeError = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    state.running = false;
    state.acceptingInput = false;
    cancelActiveGesture({ cancelPending: true });
    closeMobileTelemetryDrawer();
    hideGameOverlays();
    setBackgroundInert(false);
    restoreGameStage();
    setMobileShellStatus("failed", "Mobile match could not start", "The portfolio has been restored. Retry the match or return to mission setup.", lastRuntimeError);
    scrollGameIntoView();
  }

  function beginMobileShell() {
    portalGameStage();
    setMobileShellStatus("preparing", "Preparing tactical map", "Checking the game surface before entering the mobile match.");
    mobileShellTimer = window.setTimeout(() => rollbackMobileShell("Mobile shell readiness timed out after 2500ms."), 2500);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        let surface = mobileSurfaceDetails();
        if (!surface.stage.valid || !surface.surface.valid || !surface.exit.valid || gameStage?.parentElement !== document.body) throw new Error("Mobile game surface is not viewport-visible in its body-level shell.");
        draw();
        lastSuccessfulDrawAt = performance.now();
        mobileShellState = "ready";
        state.acceptingInput = true;
        syncMobilePresentation();
        updateHud(counts(), true);
        surface = mobileSurfaceDetails();
        if (!surface.valid) throw new Error("Mobile canvas, HUD, controls, or exit action did not become viewport-visible.");
        window.clearTimeout(mobileShellTimer);
        setMobileShellStatus("ready", "", "");
        updateHud(counts(), true);
      } catch (error) {
        rollbackMobileShell(error);
      }
    }));
  }

  function initMobileDiagnostics() {
    const reportError = reason => {
      lastRuntimeError = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
      if (mobileShellState === "preparing" || mobileShellState === "ready") rollbackMobileShell(reason);
    };
    window.addEventListener("error", event => reportError(event.error || event.message));
    window.addEventListener("unhandledrejection", event => reportError(event.reason));
    if (!mobileDiagnosticsEnabled) return;
    const panel = document.createElement("aside");
    panel.className = "gravity-mobile-diagnostics";
    panel.setAttribute("aria-live", "polite");
    document.body.append(panel);
    const update = () => {
      const { stage, surface, hud, controls, exit } = mobileSurfaceDetails();
      const inertChildren = [...document.body.children].filter(element => element.inert).map(element => element.id || element.className || element.tagName).join(", ") || "none";
      const focused = document.activeElement?.id ? `#${document.activeElement.id}` : document.activeElement?.tagName || "none";
      panel.textContent = [
        `shell: ${mobileShellState}`, `input: ${document.documentElement.dataset.gravityInput || "unknown"}`, `viewport: ${window.innerWidth} × ${window.innerHeight}`,
        `stage parent: ${gameStage?.parentElement === document.body ? "body" : gameStage?.parentElement?.className || "none"}`, `stage: ${Math.round(stage.rect?.width || 0)} × ${Math.round(stage.rect?.height || 0)} ${stage.position} z:${stage.zIndex} ${stage.display}/${stage.visibility}/${stage.opacity} intersect:${stage.intersects}`,
        `canvas CSS: ${Math.round(surface.rect?.width || 0)} × ${Math.round(surface.rect?.height || 0)} z:${surface.zIndex} ${surface.display}/${surface.visibility}/${surface.opacity} intersect:${surface.intersects}`,
        `HUD: z:${hud.zIndex} ${hud.display}/${hud.visibility}/${hud.opacity} intersect:${hud.intersects}`, `controls: z:${controls.zIndex} ${controls.display}/${controls.visibility}/${controls.opacity} intersect:${controls.intersects}`, `exit: z:${exit.zIndex} ${exit.display}/${exit.visibility}/${exit.opacity} intersect:${exit.intersects}`,
        `panel contains stage: ${Boolean(document.querySelector(".sim-panel")?.contains(gameStage))}`, `focus: ${focused}`, `modal: ${activeModal?.id || "none"}`, `inert body children: ${inertChildren}`,
        `canvas backing: ${canvas.width} × ${canvas.height}`, `running/input/ended: ${Boolean(state?.running)}/${Boolean(state?.acceptingInput)}/${Boolean(state?.ended)}`,
        `sim/draw: ${Math.round(lastSuccessfulSimulationAt)} / ${Math.round(lastSuccessfulDrawAt)}`, `FPS: ${observedFps}`, `error: ${lastRuntimeError || "none"}`
      ].join("\n");
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  function mobileInputStatus() {
    if (wormMode) return pendingWorm ? "Tap to place the wormhole exit" : "Tap to place the wormhole entrance";
    const selected = state?.launcher?.selectedShipIds?.length || 0;
    if (selected) return `${selected} ships selected - release to launch`;
    return "Hold and drag from a Cyan world to launch";
  }

  function updateMobileHud(c = counts(), force = false) {
    if (!ui.mobileHud || !usesMobilePresentation()) return;
    const star = state.planets.find(planet => planet.isStar);
    const signature = [Math.floor(state.elapsed), c.playerShips, c.playerPlanets, c.rivalPlanets, c.travelingShips, c.enemyPlanets, c.enemyShips, c.orangePlanets, c.orangeShips, star?.owner, state.largestLaunch, state.deepSpaceCombats, state.shipTransits, wormMode, pendingWorm ? 1 : 0, state.launcher?.selectedShipIds?.length || 0, state.events[0]?.message, observedFps].join("|");
    if (!force && signature === mobileHudSignature) return;
    mobileHudSignature = signature;
    setText(ui.mobileHudLevel, `Level ${state.levelId} - ${state.levelName}`);
    setText(ui.mobileHudTimer, fmt(state.elapsed));
    setText(ui.mobileHudShips, c.playerShips);
    setText(ui.mobileHudWorlds, c.playerPlanets);
    setText(ui.mobileHudRivals, c.rivalPlanets);
    setText(ui.mobileHudTraveling, c.travelingShips);
    setText(ui.mobileHudFps, observedFps ? `${observedFps} fps` : "--");
    setText(ui.mobileHudStatus, mobileInputStatus());
    setText(ui.mobileDrawerRed, `${c.enemyPlanets} worlds · ${c.enemyShips} ships`);
    setText(ui.mobileDrawerOrange, `${c.orangePlanets} worlds · ${c.orangeShips} ships`);
    setText(ui.mobileDrawerStar, star ? teamLabel(star.owner) : "Neutral");
    setText(ui.mobileDrawerLaunch, `${state.largestLaunch} ships`);
    setText(ui.mobileDrawerFights, state.deepSpaceCombats);
    setText(ui.mobileDrawerTransits, state.shipTransits);
    if (ui.mobileDrawerEvents) ui.mobileDrawerEvents.innerHTML = state.events.length
      ? state.events.slice(0, 5).map(event => `<li>${event.t}s · ${event.message}</li>`).join("")
      : "<li>Telemetry will appear after launch.</li>";
  }

  function focusableModalControls(element) {
    if (!element) return [];
    return [...element.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(control => !control.hidden && control.getClientRects().length > 0);
  }

  function setBackgroundInert(inert) {
    if (inert) {
      [...document.body.children].forEach(element => {
        if (modalElements.includes(element) || inertedBackground.has(element)) return;
        inertedBackground.set(element, element.inert);
        element.inert = true;
      });
      document.documentElement.classList.add("gravity-modal-open");
      document.body.classList.add("gravity-modal-open");
      return;
    }
    inertedBackground.forEach((wasInert, element) => { element.inert = wasInert; });
    inertedBackground.clear();
    document.documentElement.classList.remove("gravity-modal-open");
    document.body.classList.remove("gravity-modal-open");
  }

  function trapModalTab(event) {
    if (!activeModal || event.key !== "Tab") return;
    const controls = focusableModalControls(activeModal);
    if (!controls.length) {
      event.preventDefault();
      activeModal.focus({ preventScroll: true });
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !activeModal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !activeModal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function keepModalFocus(event) {
    if (!activeModal || activeModal.contains(event.target)) return;
    (focusableModalControls(activeModal)[0] || activeModal).focus({ preventScroll: true });
  }

  function deactivateModal(element, { restoreFocus = false, focusTarget = null } = {}) {
    if (!element) return;
    if (activeModal !== element) { setOverlayVisible(element, false); return; }
    document.removeEventListener("keydown", trapModalTab, true);
    document.removeEventListener("focusin", keepModalFocus, true);
    activeModal = null;
    setBackgroundInert(false);
    const origin = modalOrigin;
    modalOrigin = null;
    const destination = focusTarget || (restoreFocus && origin?.isConnected && !origin.inert ? origin : canvas);
    if (destination?.isConnected && !destination.inert) destination.focus({ preventScroll: true });
    setOverlayVisible(element, false);
  }

  function activateModal(element, initialFocus, origin = document.activeElement) {
    if (!element) return;
    if (activeModal && activeModal !== element) deactivateModal(activeModal);
    modalOrigin = modalElements.some(modal => modal.contains(origin)) ? canvas : origin;
    activeModal = element;
    setOverlayVisible(element, true);
    setBackgroundInert(true);
    document.addEventListener("keydown", trapModalTab, true);
    document.addEventListener("focusin", keepModalFocus, true);
    window.requestAnimationFrame(() => (initialFocus || focusableModalControls(element)[0] || element).focus({ preventScroll: true }));
  }

  function syncInputCapability() {
    const inputMode = coarsePointerQuery.matches ? (finePointerQuery.matches ? "hybrid" : "touch") : "mouse";
    document.documentElement.dataset.gravityInput = inputMode;
    if (!state) return;
    cancelActiveGesture({ cancelPending: true });
    commandDockSignature = "";
    updateCommandDock();
    syncMobilePresentation();
  }

  function hideOutcomeOverlay() {
    deactivateModal(ui.outcome);
  }

  function hideGameOverlays() {
    deactivateModal(ui.overlay);
    deactivateModal(ui.tutorial);
    hideOutcomeOverlay();
  }

  function updateLevelUi() {
    const level = activeLevel();
    if (ui.levelName) ui.levelName.textContent = `Level ${level.id} - ${level.name}`;
    if (ui.levelDescription) ui.levelDescription.textContent = level.subtitle;
    if (ui.levelDifficulty) ui.levelDifficulty.textContent = `${level.difficulty} · ${Math.round(level.scale * 100)}% tactical scale`;
    ui.levelPicker?.querySelectorAll("[data-level-id]").forEach(button => {
      const selected = Number(button.dataset.levelId) === level.id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    syncGravityDevLab();
    updateCommandDock();
  }

  function showStartOverlay() {
    updateLevelUi();
    deactivateModal(ui.tutorial);
    hideOutcomeOverlay();
    const selectedButton = ui.levelPicker?.querySelector(`[data-level-id="${selectedLevelId}"]`);
    activateModal(ui.overlay, selectedButton || ui.start);
  }

  function showTutorialOverlay() {
    hideOutcomeOverlay();
    deactivateModal(ui.overlay);
    activateModal(ui.tutorial, ui.tutorialGo, ui.start);
  }

  function showOutcomeOverlay(run) {
    completedRun = run;
    deactivateModal(ui.overlay);
    deactivateModal(ui.tutorial);
    const won = run.outcome === "Victory";
    if (ui.outcomeTitle) ui.outcomeTitle.textContent = won ? "System claimed" : "Fleet lost";
    if (ui.outcomeSummary) ui.outcomeSummary.textContent = `${won ? "Victory" : "Defeat"} on Level ${run.levelId} - ${run.levelName}. Choose your next step.`;
    if (ui.outcomeLevel) ui.outcomeLevel.textContent = `Level ${run.levelId} - ${run.levelName}`;
    if (ui.outcomeScore) ui.outcomeScore.textContent = run.score;
    if (ui.outcomeDuration) ui.outcomeDuration.textContent = fmt(run.durationSeconds);
    setText(ui.outcomeCaptures, run.planetsCaptured || 0);
    setText(ui.outcomeLargestLaunch, `${run.largestLaunch || 0} ships`);
    setText(ui.outcomeDestroyed, run.shipsDestroyed || 0);
    setText(ui.outcomeTransits, shipTransitCount(run));
    setText(ui.outcomeSignal, strongestMatchSignal(run));
    syncMobilePresentation();
    activateModal(ui.outcome, ui.viewAnalysis, canvas);
  }

  function shouldReduceMotion() {
    return reduced;
  }

  function scrollGameIntoView() {
    canvas.scrollIntoView({
      behavior: shouldReduceMotion() ? "auto" : "smooth",
      block: "center"
    });
  }

  function scrollElementWithOffset(element, offset = 0) {
    if (!element) return;
    const top = Math.max(0, window.scrollY + element.getBoundingClientRect().top + Number(offset || 0));
    window.scrollTo({ top, behavior: shouldReduceMotion() ? "auto" : "smooth" });
  }

  function updateTelemetryBadgeVisibility() {
    if (!ui.liveTelemetryBadge) return;
    const recording = Boolean(state?.running && !state?.ended && state?.acceptingInput);
    ui.liveTelemetryBadge.hidden = !recording;
  }

  function scrollLiveTelemetryIntoView() {
    if (!ui.liveTelemetry) return;
    const topbar = document.querySelector(".topbar");
    const stickyHeaderOffset = topbar && getComputedStyle(topbar).position === "sticky"
      ? topbar.getBoundingClientRect().height + 20
      : 20;
    const offset = window.matchMedia("(min-width: 901px)").matches
      ? gravityDevSettings.navigation.liveTelemetryOffset
      : -stickyHeaderOffset;
    scrollElementWithOffset(ui.liveTelemetry, offset);
    ui.liveTelemetry.focus({ preventScroll: true });
  }

  function setBackToGameVisible(visible) {
    if (ui.backToGame) ui.backToGame.hidden = !visible;
  }

  function initBackToGameObserver() {
    if (!ui.backToGame || !("IntersectionObserver" in window)) {
      setBackToGameVisible(false);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const viewportHeight = entry.rootBounds?.height || window.innerHeight || document.documentElement.clientHeight;
      const canvasMovedAboveViewportRegion = entry.boundingClientRect.bottom < viewportHeight * (1 - GAME_VISIBILITY_THRESHOLD);
      const canvasSubstantiallyVisible = entry.intersectionRatio >= GAME_VISIBILITY_THRESHOLD;
      setBackToGameVisible(!canvasSubstantiallyVisible && canvasMovedAboveViewportRegion);
    }, { threshold: [0, GAME_VISIBILITY_THRESHOLD, 1] });
    observer.observe(canvas);
  }

  function initGravityDevLab() {
    const params = new URLSearchParams(window.location.search);
    const localHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
    let debugWasEnabled = false;
    try { debugWasEnabled = localStorage.getItem(GRAVITY_DEBUG_ENABLED_KEY) === "true"; } catch { /* Runtime-only debug remains available. */ }
    const explicitDebugAccess = params.get("gravityDebug") === "1";
    const debugAvailable = localHost || explicitDebugAccess;
    if (!debugAvailable) return;

    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(GRAVITY_DEBUG_STORAGE_KEY) || "null"); } catch { return null; }
    })();
    if (saved?.navigation) {
      Object.keys(GRAVITY_NAV_DEFAULTS).forEach(key => {
        const value = Number(saved.navigation[key]);
        if (Number.isFinite(value)) gravityDevSettings.navigation[key] = clamp(value, -560, 240);
      });
    }
    if (saved?.levelOverrides && typeof saved.levelOverrides === "object") {
      Object.entries(saved.levelOverrides).forEach(([id, values]) => {
        const level = LEVELS.find(item => item.id === Number(id));
        if (!level || !values || typeof values !== "object") return;
        GRAVITY_BALANCE_KEYS.forEach(key => {
          const value = Number(values[key]);
          if (Number.isFinite(value)) level[key] = value;
        });
      });
      gravityDevSettings.levelOverrides = saved.levelOverrides;
    }

    const navigationDescriptors = [
      { key: "liveTelemetryOffset", label: "Live telemetry offset", min: -560, max: 120, step: 4, unit: "px" },
      { key: "matchAnalysisOffset", label: "Post-match analysis offset", min: -120, max: 240, step: 4, unit: "px" }
    ];
    const balanceDescriptors = [
      { key: "launchRadius", label: "Launch radius", min: 60, max: 130, step: 1 },
      { key: "pullRadius", label: "Fleet pull radius", min: 48, max: 110, step: 1 },
      { key: "wormholeRange", label: "Wormhole range", min: 180, max: 360, step: 1 },
      { key: "wormholeInfluence", label: "Wormhole influence", min: 48, max: 130, step: 1 },
      { key: "shipCap", label: "Total ship cap", min: 250, max: 700, step: 10 },
      { key: "playerHomeGraceSeconds", label: "Player-home grace", min: 0, max: 30, step: 1, unit: "s" }
    ];
    const renderControl = (group, descriptor) => `<label class="showcase-dev-control"><span>${descriptor.label} <output data-gravity-output="${group}.${descriptor.key}"></output></span><span class="showcase-dev-inputs"><input type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-gravity-group="${group}" data-gravity-key="${descriptor.key}" aria-label="${descriptor.label}"><input type="number" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-gravity-group="${group}" data-gravity-key="${descriptor.key}" aria-label="${descriptor.label} value"></span></label>`;
    const tabDefinitions = [{ id: "flow", label: "Flow" }, { id: "navigation", label: "Navigation" }, { id: "balance", label: "Balance" }];
    const tabs = tabDefinitions.map(({ id, label }, index) => `<button type="button" role="tab" id="gravity-dev-tab-${id}" aria-controls="gravity-dev-panel-${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-gravity-tab="${id}">${label}</button>`).join("");
    const lab = document.createElement("aside");
    lab.className = "showcase-dev-panel gravity-dev-lab";
    lab.setAttribute("aria-label", "Gravity Fleet Dev Lab");
    lab.innerHTML = `
      <label class="showcase-dev-toggle">
        <input type="checkbox" data-gravity-debug-toggle ${explicitDebugAccess || (localHost && debugWasEnabled) ? "checked" : ""}>
        <span>Gravity Fleet Dev Lab</span>
      </label>
      <section class="showcase-dev-drawer" data-gravity-debug-drawer ${explicitDebugAccess || (localHost && debugWasEnabled) ? "" : "hidden"}>
        <header><div><strong>Gravity Fleet Dev Lab</strong><small>Local runtime testing</small></div></header>
        <nav class="showcase-dev-labs" aria-label="Development labs"><button type="button" class="is-selected" aria-current="page">Gravity Fleet</button></nav>
        <div class="showcase-dev-tabs" role="tablist" aria-label="Gravity Fleet debug controls">${tabs}</div>
        <section class="showcase-dev-tabpanel" role="tabpanel" id="gravity-dev-panel-flow" aria-labelledby="gravity-dev-tab-flow" data-gravity-panel="flow">
          <h4>Match flow</h4>
          <div class="gravity-dev-flow">
            <button class="gravity-dev-action" type="button" data-gravity-force="Victory">Force victory</button>
            <button class="gravity-dev-action gravity-dev-action--danger" type="button" data-gravity-force="Defeat">Force defeat</button>
            <button class="gravity-dev-action" type="button" data-gravity-show-result>Show result overlay</button>
            <button class="gravity-dev-action" type="button" data-gravity-reset-match>Reset mission</button>
          </div>
        </section>
        <section class="showcase-dev-tabpanel" role="tabpanel" id="gravity-dev-panel-navigation" aria-labelledby="gravity-dev-tab-navigation" data-gravity-panel="navigation" hidden>
          <h4>Scroll tuning</h4><div class="showcase-dev-controls">${navigationDescriptors.map(descriptor => renderControl("navigation", descriptor)).join("")}</div>
        </section>
        <section class="showcase-dev-tabpanel" role="tabpanel" id="gravity-dev-panel-balance" aria-labelledby="gravity-dev-tab-balance" data-gravity-panel="balance" hidden>
          <h4>Selected-level balance</h4><div class="showcase-dev-controls">${balanceDescriptors.map(descriptor => renderControl("balance", descriptor)).join("")}</div>
        </section>
        <div class="showcase-dev-actions">
          <button type="button" data-gravity-copy>Copy config</button>
          <button type="button" data-gravity-reset-settings>Reset defaults</button>
        </div>
        <textarea class="showcase-dev-output" data-gravity-config-output readonly hidden aria-label="Current Gravity Fleet debug configuration"></textarea>
        <p class="showcase-dev-status" data-gravity-status aria-live="polite">Runtime controls ready</p>
      </section>`;
    document.body.append(lab);

    const toggle = lab.querySelector("[data-gravity-debug-toggle]");
    const drawer = lab.querySelector("[data-gravity-debug-drawer]");
    const status = lab.querySelector("[data-gravity-status]");
    const output = lab.querySelector("[data-gravity-config-output]");
    const tabButtons = [...lab.querySelectorAll("[role='tab']")];
    const descriptorFor = (group, key) => (group === "navigation" ? navigationDescriptors : balanceDescriptors).find(item => item.key === key);
    const valueFor = (group, key) => group === "navigation" ? gravityDevSettings.navigation[key] : (activeLevel()[key] ?? 0);
    const configText = () => JSON.stringify({ navigation: gravityDevSettings.navigation, selectedLevel: activeLevel().id, balance: Object.fromEntries(GRAVITY_BALANCE_KEYS.map(key => [key, activeLevel()[key] ?? 0])) }, null, 2);
    const persist = () => {
      try { localStorage.setItem(GRAVITY_DEBUG_STORAGE_KEY, JSON.stringify(gravityDevSettings)); } catch { /* Runtime preview still works. */ }
    };
    const syncControls = () => {
      lab.querySelectorAll("[data-gravity-group][data-gravity-key]").forEach(input => { input.value = String(valueFor(input.dataset.gravityGroup, input.dataset.gravityKey)); });
      [...navigationDescriptors, ...balanceDescriptors].forEach(descriptor => {
        const group = navigationDescriptors.includes(descriptor) ? "navigation" : "balance";
        const target = lab.querySelector(`[data-gravity-output="${group}.${descriptor.key}"]`);
        if (target) target.textContent = `${valueFor(group, descriptor.key)}${descriptor.unit ? ` ${descriptor.unit}` : ""}`;
      });
      output.value = configText();
    };
    syncGravityDevLab = syncControls;
    updateGravityDevActions = () => {
      const canEnd = Boolean(state?.running && !state?.ended);
      lab.querySelectorAll("[data-gravity-force]").forEach(button => { button.disabled = !canEnd; });
      const showResult = lab.querySelector("[data-gravity-show-result]");
      if (showResult) showResult.disabled = !Boolean(state?.ended && completedRun);
    };

    const activateTab = (tab, focus = false) => {
      tabButtons.forEach(candidate => {
        const selected = candidate === tab;
        candidate.setAttribute("aria-selected", String(selected));
        candidate.tabIndex = selected ? 0 : -1;
        lab.querySelector(`#${candidate.getAttribute("aria-controls")}`).hidden = !selected;
      });
      if (focus) tab.focus();
    };
    toggle.addEventListener("change", () => {
      drawer.hidden = !toggle.checked;
      try { localStorage.setItem(GRAVITY_DEBUG_ENABLED_KEY, String(toggle.checked)); } catch { /* Current-page toggle remains usable. */ }
      if (toggle.checked) syncControls();
    });
    lab.querySelector(".showcase-dev-tabs").addEventListener("click", event => {
      const tab = event.target.closest("[role='tab']");
      if (tab) activateTab(tab);
    });
    lab.querySelector(".showcase-dev-tabs").addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = tabButtons.indexOf(document.activeElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? tabButtons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabButtons.length) % tabButtons.length;
      activateTab(tabButtons[index], true);
    });
    lab.addEventListener("input", event => {
      const input = event.target.closest("[data-gravity-group][data-gravity-key]");
      if (!input) return;
      const group = input.dataset.gravityGroup;
      const key = input.dataset.gravityKey;
      const descriptor = descriptorFor(group, key);
      const value = clamp(Number(input.value), descriptor.min, descriptor.max);
      if (!Number.isFinite(value)) return;
      if (group === "navigation") gravityDevSettings.navigation[key] = value;
      else {
        activeLevel()[key] = value;
        gravityDevSettings.levelOverrides[activeLevel().id] = { ...(gravityDevSettings.levelOverrides[activeLevel().id] || {}), [key]: value };
      }
      persist();
      syncControls();
      status.textContent = group === "navigation" ? "Scroll offset preview updated" : `Level ${activeLevel().id} runtime balance updated`;
    });
    lab.querySelectorAll("[data-gravity-force]").forEach(button => button.addEventListener("click", () => end(button.dataset.gravityForce)));
    lab.querySelector("[data-gravity-show-result]").addEventListener("click", () => { if (completedRun) showOutcomeOverlay(completedRun); });
    lab.querySelector("[data-gravity-reset-match]").addEventListener("click", () => { reset(); scrollGameIntoView(); });
    lab.querySelector("[data-gravity-copy]").addEventListener("click", async () => {
      output.hidden = false;
      output.value = configText();
      try { await navigator.clipboard.writeText(output.value); status.textContent = "Configuration copied"; }
      catch { output.select(); document.execCommand("copy"); status.textContent = "Configuration selected for copying"; }
    });
    lab.querySelector("[data-gravity-reset-settings]").addEventListener("click", () => {
      Object.assign(gravityDevSettings.navigation, GRAVITY_NAV_DEFAULTS);
      gravityDevSettings.levelOverrides = {};
      LEVELS.forEach(level => GRAVITY_BALANCE_KEYS.forEach(key => {
        const original = originalGravityBalance[level.id][key];
        if (original === null) delete level[key]; else level[key] = original;
      }));
      persist();
      syncControls();
      status.textContent = "Runtime defaults restored";
    });
    syncControls();
    updateGravityDevActions();
  }

  function addEvent(message) {
    state.events.unshift({ t: Math.round(state.elapsed), message });
    ui.feed.innerHTML = state.events.slice(0, 6).map(e => `<li>${e.t}s · ${e.message}</li>`).join("");
  }

  function spawnShip(owner, planet, amount = 1) {
    const ownedOrbiters = () => state.ships.filter(s => s.owner === owner && s.state === "orbiting" && s.planetId === planet.id).length;
    for (let i = 0; i < amount && state.ships.length < levelShipCap() && ownedOrbiters() < 58; i++) {
      state.ships.push({
        id: shipId++, owner, x: planet.x, y: planet.y, vx: 0, vy: 0, hp: 1, combatCooldown: Math.random() * .5,
        state: "orbiting", planetId: planet.id, orbitAngle: Math.random() * Math.PI * 2, orbitRadius: planet.radius + 11 + Math.random() * 13, trail: []
      });
    }
  }

  function reset(showOverlay = true) {
    window.clearTimeout(mobileShellTimer);
    mobileShellState = "idle";
    hideOutcomeOverlay();
    closeMobileTelemetryDrawer();
    completedRun = null;
    mobilePresentationDismissed = false;
    shipId = 1;
    state = makeState();
    const level = activeLevel();
    state.planets.forEach(p => {
      if (p.owner !== "neutral") spawnShip(p.owner, p, p.startingShips ?? level.startingShips?.[p.owner] ?? (p.owner === "player" ? 20 : 18));
    });
    if (level.neutralDefenders) {
      state.planets.filter(p => p.owner === "neutral").forEach(p => spawnShip("neutral", p, level.neutralDefenders));
    }
    pendingWorm = null;
    staticMapLayerLevel = null;
    setWormMode(false);
    ui.timer.textContent = "0:00";
    if (showOverlay) showStartOverlay();
    else hideGameOverlays();
    updateTelemetryBadgeVisibility();
    ui.feed.innerHTML = "<li>Fleet telemetry will stream here.</li>";
    commandDockSignature = "";
    updateHud(undefined, true);
    updateLiveTelemetry();
    syncMobilePresentation();
    if (ui.mobileShellStatus) ui.mobileShellStatus.hidden = true;
    draw();
  }

  function counts() {
    const byTeam = Object.fromEntries(activeTeamKeys.map(key => [key, { planets: 0, ships: 0, traveling: 0 }]));
    state.planets.forEach(p => { (byTeam[p.owner] ||= { planets: 0, ships: 0, traveling: 0 }).planets++; });
    state.ships.forEach(s => {
      const team = byTeam[s.owner] ||= { planets: 0, ships: 0, traveling: 0 };
      team.ships++;
      if (s.state === "traveling") team.traveling++;
    });
    return {
      teams: byTeam,
      playerPlanets: byTeam.player?.planets || 0,
      enemyPlanets: byTeam.enemy?.planets || 0,
      orangePlanets: byTeam.orange?.planets || 0,
      rivalPlanets: contestTeamKeys.filter(k => k !== "player").reduce((sum, k) => sum + (byTeam[k]?.planets || 0), 0),
      neutralPlanets: byTeam.neutral?.planets || 0,
      playerShips: byTeam.player?.ships || 0,
      enemyShips: byTeam.enemy?.ships || 0,
      orangeShips: byTeam.orange?.ships || 0,
      travelingShips: Object.values(byTeam).reduce((sum, t) => sum + t.traveling, 0)
    };
  }

  function updateHud(c = counts(), force = false) {
    const playerWormhole = playerWormholes()[0];
    const wormStatus = playerWormhole ? `Cyan Active · Entry ${playerWormhole.aEntryEnabled ? "A" : "-"}/${playerWormhole.bEntryEnabled ? "B" : "-"}` : "Ready";
    const signature = [Math.floor(state.elapsed), ...contestTeamKeys.flatMap(key => [c.teams[key]?.planets || 0, c.teams[key]?.ships || 0]), c.neutralPlanets, wormStatus].join("|");
    if (force || signature !== state.lastHudSignature) {
      state.lastHudSignature = signature;
      const teamRows = contestTeamKeys.map(key => {
        const team = c.teams[key] || { planets: 0, ships: 0 };
        return `<div class="faction-row faction-${key}" style="--team-color:${colors[key]}"><span class="team-dot" aria-hidden="true"></span><strong>${teamMeta[key].label}</strong><span><b>${team.planets}</b> planets</span><span><b>${team.ships}</b> ships</span></div>`;
      }).join("");
      const utility = `<div class="utility-row"><span>Neutral bodies <b>${c.neutralPlanets}</b></span><span>Wormhole <b>${wormStatus}</b></span></div>`;
      ui.readout.innerHTML = `${teamRows}${utility}`;
      setText(ui.timer, fmt(state.elapsed));
    }
    updateCommandDock(c);
    updateMobileHud(c, force);
  }

  function snapshot() {
    const c = counts();
    state.shipCountTimeline.push({ t: Math.round(state.elapsed), ...Object.fromEntries(activeTeamKeys.map(key => [key, c.teams[key]?.ships || 0])) });
    state.ownershipTimeline.push({ t: Math.round(state.elapsed), ...Object.fromEntries(activeTeamKeys.map(key => [key, c.teams[key]?.planets || 0])) });
    state.shipCountTimeline = state.shipCountTimeline.slice(-180);
    state.ownershipTimeline = state.ownershipTimeline.slice(-180);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function coarsePlanetHitRadius(planet) {
    const rect = canvas.getBoundingClientRect();
    const worldUnitsPerCssPixel = Math.max(canvas.width / Math.max(1, rect.width), canvas.height / Math.max(1, rect.height));
    return Math.max(planet.radius + 34, 22 * worldUnitsPerCssPixel);
  }

  function nearestPlanet(point, owner = null, coarse = false) {
    return state.planets
      .filter(p => (!owner || p.owner === owner) && dist(point, p) < (coarse ? coarsePlanetHitRadius(p) : p.radius + 34))
      .sort((a, b) => dist(point, a) - dist(point, b))[0];
  }

  function createLauncher(point, coarse = false) {
    const inside = state.planets.find(p => dist(point, p) < p.radius);
    const nearOwned = nearestPlanet(point, "player", coarse);
    if (coarse && !nearOwned) return false;
    state.launcher = {
      active: true, origin: point, pointer: point, lockedPointer: point, radius: levelLaunchRadius(),
      selectedShipIds: [], formationVersion: 0, aimVector: { x: 1, y: 0, len: 0 },
      nearPlanetId: nearOwned?.id || null, startedInsidePlanet: Boolean(inside), pullPulse: 0
    };
    updateCommandDock();
    return true;
  }

  function updateLauncher(point, dt) {
    const l = state.launcher;
    if (!l?.active) return;
    l.pointer = point;
    const v = norm(point.x - l.origin.x, point.y - l.origin.y);
    const lockedLen = Math.min(l.radius, v.len);
    l.lockedPointer = { x: l.origin.x + v.x * lockedLen, y: l.origin.y + v.y * lockedLen };
    l.aimVector = { x: v.x, y: v.y, len: lockedLen };
    l.pullPulse += dt;
    pullEligibleShips(dt);
    updatePointerOrbit(dt);
    updateCommandDock();
  }

  function selectedLauncherShips() {
    const l = state.launcher;
    return l ? state.ships.filter(s => l.selectedShipIds.includes(s.id)) : [];
  }

  function assignLauncherFormationSlots() {
    const l = state.launcher;
    if (!l) return;
    const ships = selectedLauncherShips().sort((a, b) => a.id - b.id);
    l.formationVersion++;
    const layerSizes = [10, 16, 22, 28];
    ships.forEach((ship, index) => {
      let slot = index;
      let layer = 0;
      while (layer < layerSizes.length - 1 && slot >= layerSizes[layer]) slot -= layerSizes[layer++];
      const layerSize = layerSizes[layer];
      const radius = 20 + layer * 11;
      const angle = slot / layerSize * TAU + (layer % 2 ? Math.PI / layerSize : 0);
      ship.formationSlot = slot;
      ship.formationLayer = layer;
      ship.formationAngle = angle;
      ship.formationRadius = radius;
      ship.formationSettled = false;
      ship.formationEase = 0;
      ship.pointerAngle = ship.pointerAngle ?? Math.atan2(ship.y - l.lockedPointer.y, ship.x - l.lockedPointer.x);
      ship.pointerRadius = ship.pointerRadius ?? radius;
    });
  }

  function selectShip(ship) {
    const l = state.launcher;
    if (!l || l.selectedShipIds.includes(ship.id)) return;
    const previousPlanetId = ship.planetId;
    ship.launchSourcePlanetId = previousPlanetId;
    ship.state = "pointerOrbit";
    ship.planetId = null;
    ship.pointerAngle = Math.atan2(ship.y - l.lockedPointer.y, ship.x - l.lockedPointer.x);
    ship.pointerRadius = dist(ship, l.lockedPointer);
    ship.vx = 0;
    ship.vy = 0;
    l.selectedShipIds.push(ship.id);
    assignLauncherFormationSlots();
    if (previousPlanetId) assignPlanetOrbitSlots(previousPlanetId, ship.owner);
    state.shipsPulled++;
  }

  function pullEligibleShips(dt) {
    const l = state.launcher;
    const pullCenter = l.lockedPointer;
    state.ships.forEach(ship => {
      if (ship.owner !== "player" || l.selectedShipIds.includes(ship.id)) return;
      const inPullField = dist(ship, pullCenter) < levelPullRadius();
      const planet = l.nearPlanetId ? state.planets.find(p => p.id === l.nearPlanetId) : null;
      const fromNearPlanet = planet && ship.planetId === planet.id && ship.state === "orbiting" && !l.startedInsidePlanet;
      const nearOrbitBand = planet && ship.planetId === planet.id && dist(pullCenter, planet) > planet.radius + 4;
      if (inPullField || fromNearPlanet || nearOrbitBand) selectShip(ship);
    });

    selectedLauncherShips().forEach(ship => {
      const targetAngle = (ship.formationAngle ?? ship.pointerAngle ?? 0) + l.pullPulse * (reduced ? .45 : 1.35);
      const targetRadius = ship.formationRadius || 24;
      const tx = pullCenter.x + Math.cos(targetAngle) * targetRadius;
      const ty = pullCenter.y + Math.sin(targetAngle) * targetRadius;
      const ease = Math.min(1, dt * (ship.formationSettled ? 9 : 13));
      ship.vx = (tx - ship.x) * (ship.formationSettled ? 5 : 8);
      ship.vy = (ty - ship.y) * (ship.formationSettled ? 5 : 8);
      ship.x += (tx - ship.x) * ease;
      ship.y += (ty - ship.y) * ease;
      ship.pointerAngle = targetAngle;
      ship.pointerRadius += (targetRadius - ship.pointerRadius) * ease;
      ship.formationEase = Math.min(1, (ship.formationEase || 0) + dt * 4.5);
      ship.formationSettled = dist(ship, { x: tx, y: ty }) < 4.5;
    });
  }

  function updatePointerOrbit(dt) {
    const l = state.launcher;
    selectedLauncherShips().forEach((ship, i) => {
      const orbitSpeed = (reduced ? .35 : 1.2) + (ship.formationLayer || 0) * .16 + (i % 3) * .04;
      ship.formationAngle = (ship.formationAngle ?? 0) + dt * orbitSpeed;
    });
  }

  function cancelLauncher() {
    const l = state.launcher;
    if (!l?.active) return;
    state.ships.filter(ship => l.selectedShipIds.includes(ship.id)).forEach(ship => {
      ship.state = "orbiting";
      ship.planetId = ship.launchSourcePlanetId || l.nearPlanetId;
      delete ship.launchSourcePlanetId;
      if (ship.planetId) assignPlanetOrbitSlots(ship.planetId, ship.owner);
    });
    state.launcher = null;
    updateCommandDock();
  }

  function releaseLauncher() {
    const l = state.launcher;
    if (!l?.active) return;
    const ships = state.ships.filter(s => l.selectedShipIds.includes(s.id));
    state.launcher = null;
    updateCommandDock();
    if (!ships.length) return;
    let aim = l.aimVector;
    const tinyDrag = aim.len < 14;
    if (tinyDrag) {
      const target = [...state.planets].filter(p => p.owner !== "player").sort((a, b) => dist(l.origin, a) - dist(l.origin, b))[0];
      aim = target ? norm(target.x - l.origin.x, target.y - l.origin.y) : { x: 1, y: 0, len: 1 };
    }
    const power = clamp(l.aimVector.len / l.radius, 0, 1);
    const launchSpeed = tinyDrag ? MIN_LAUNCH_SPEED : MIN_LAUNCH_SPEED + Math.pow(power, LAUNCH_POWER_CURVE) * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
    const perp = { x: -aim.y, y: aim.x };
    state.launches++;
    state.shipsLaunched += ships.length;
    recordLaunch({ t: Math.round(state.elapsed), team: "player", ships: ships.length, power: Number(power.toFixed(2)), fromX: Math.round(l.origin.x), fromY: Math.round(l.origin.y), aimX: Number(aim.x.toFixed(2)), aimY: Number(aim.y.toFixed(2)) });
    ships.forEach((ship, i) => {
      const offset = (i - (ships.length - 1) / 2) * 2.2;
      const variation = ((i % 5) - 2) * 2.2;
      ship.state = "traveling";
      ship.planetId = null;
      ship.vx = aim.x * (launchSpeed + variation) + perp.x * offset;
      ship.vy = aim.y * (launchSpeed + variation) + perp.y * offset;
      ship.trail = [];
      spawnEffect("burst", ship.x - aim.x * 6, ship.y - aim.y * 6, ship.x + aim.x * 12, ship.y + aim.y * 12, colors.player, .38);
    });
    addEvent(`${ships.length} ships launched in formation.`);
  }

  function clampedWormholeEndpoint(start, pointer) {
    const dx = pointer.x - start.x;
    const dy = pointer.y - start.y;
    const rawDistance = Math.hypot(dx, dy);
    if (rawDistance === 0) return { x: start.x, y: start.y, length: 0, exceededMax: false };
    const length = Math.min(rawDistance, levelWormMaxRange());
    const scale = length / rawDistance;
    return { x: start.x + dx * scale, y: start.y + dy * scale, length, exceededMax: rawDistance > levelWormMaxRange() };
  }

  function startWormDrag(point) {
    state.wormDrag = { active: true, start: point, current: point, endpoint: clampedWormholeEndpoint(point, point), maxRange: levelWormMaxRange(), valid: true };
    addEvent("Wormhole drag started; release to place exit.");
  }

  function updateWormDrag(point) {
    const drag = state.wormDrag;
    if (!drag?.active) return;
    drag.current = point;
    drag.endpoint = clampedWormholeEndpoint(drag.start, point);
    drag.valid = drag.endpoint.length >= 24;
  }

  function finalizeWormDrag() {
    const drag = state.wormDrag;
    if (!drag?.active) return;
    const endpoint = drag.endpoint || clampedWormholeEndpoint(drag.start, drag.current);
    if (endpoint.length < 24) {
      addEvent("Wormhole drag was too short to stabilize.");
      state.wormDrag = null;
      return;
    }
    createWormhole(drag.start, endpoint);
    state.wormDrag = null;
  }

  function placeWormFallback(point) {
    if (!pendingWorm) {
      pendingWorm = point;
      addEvent("Wormhole entrance set. Tap an exit point to stabilize it.");
      setWormMode(true);
      return;
    }
    const endpoint = clampedWormholeEndpoint(pendingWorm, point);
    if (endpoint.length < 24) {
      addEvent("Wormhole exit was too close to stabilize.");
      pendingWorm = null;
      updateCommandDock();
      return;
    }
    createWormhole(pendingWorm, endpoint);
    pendingWorm = null;
    setWormMode(false);
  }

  function createTeamWormhole(owner, start, exit, options = {}) {
    const ttl = options.ttl ?? (owner === "player" ? 30 : 18);
    if (owner === "player") state.wormholes = state.wormholes.filter(w => w.owner !== "player");
    else state.wormholes = state.wormholes.filter(w => w.owner !== owner);
    const wormhole = { id: `worm-${owner}-${Date.now()}-${Math.floor(Math.random() * 9999)}`, owner, a: { x: start.x, y: start.y }, b: { x: exit.x, y: exit.y }, aEntryEnabled: true, bEntryEnabled: false, ttl, spin: 0 };
    state.wormholes.push(wormhole);
    state.wormholesCreated++;
    if (owner === "player") state.playerWormholesCreated++;
    else state.aiWormholesCreated++;
    state.wormholeEvents.push({ t: Math.round(state.elapsed), owner });
    addEvent(owner === "player" ? "Cyan one-way wormhole stabilized; entry A enabled." : `${teamLabel(owner)} opened a tactical wormhole toward ${options.targetName || "the outer orbit"}.`);
    updateHud();
    return wormhole;
  }

  function createWormhole(start, exit) {
    return createTeamWormhole("player", start, exit, { ttl: 30 });
  }

  function releaseActivePointerCapture() {
    if (activePointerId !== null && canvas.hasPointerCapture(activePointerId)) canvas.releasePointerCapture(activePointerId);
    activePointerId = null;
  }

  function cancelActiveGesture({ cancelPending = false } = {}) {
    state.wormDrag = null;
    cancelLauncher();
    if (cancelPending) pendingWorm = null;
    releaseActivePointerCapture();
    updateCommandDock();
  }

  function setWormMode(value) {
    const changed = wormMode !== value;
    wormMode = value;
    if (!value && (changed || pendingWorm)) cancelActiveGesture({ cancelPending: true });
    ui.worm.setAttribute("aria-pressed", String(value));
    ui.worm.textContent = value ? (pendingWorm ? "Tap wormhole exit" : "Wormhole Mode: entrance") : "Wormhole Mode";
    ui.mobileModes.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.gameMode === (value ? "wormhole" : "launch"))));
    updateCommandDock();
    updateMobileHud(counts(), true);
  }

  function planetOrbiters(planetId, owner) {
    return state.ships.filter(s => s.owner === owner && s.state === "orbiting" && s.planetId === planetId).sort((a, b) => a.id - b.id);
  }

  function assignPlanetOrbitSlots(planetId, owner) {
    const planet = state.planets.find(p => p.id === planetId);
    if (!planet) return;
    const ships = planetOrbiters(planetId, owner);
    const layerSizes = [14, 20, 26, 32];
    ships.forEach((ship, index) => {
      let slot = index;
      let layer = 0;
      while (layer < layerSizes.length - 1 && slot >= layerSizes[layer]) slot -= layerSizes[layer++];
      const layerSize = layerSizes[layer];
      const directionOffset = owner === "player" ? Math.PI / layerSize : -Math.PI / layerSize;
      ship.orbitSlot = slot;
      ship.orbitLayer = layer;
      ship.targetOrbitRadius = planet.radius + 12 + layer * 7;
      ship.targetOrbitAngle = slot / layerSize * TAU + directionOffset * layer;
      ship.orbitNormalizeT = 0;
    });
  }

  function captureIntoOrbit(ship, planet, gravityCapture = false) {
    ship.state = "orbiting";
    ship.planetId = planet.id;
    ship.orbitRadius = Math.max(planet.radius + 12, dist(ship, planet));
    ship.orbitAngle = Math.atan2(ship.y - planet.y, ship.x - planet.x);
    ship.vx = 0;
    ship.vy = 0;
    ship.warpLock = Math.max(0, ship.warpLock || 0);
    assignPlanetOrbitSlots(planet.id, ship.owner);
    if (gravityCapture) state.gravityCaptures++;
  }

  function updateOrbitingShip(ship, dt) {
    const planet = state.planets.find(p => p.id === ship.planetId);
    if (!planet) { ship.state = "traveling"; return; }
    if (ship.targetOrbitRadius == null) assignPlanetOrbitSlots(planet.id, ship.owner);
    const direction = ship.owner === "player" ? 1 : -1;
    const speed = (reduced ? .45 : 1.2) * direction;
    ship.orbitNormalizeT = Math.min(1, (ship.orbitNormalizeT || 0) + dt * .95);
    const spacingEase = Math.min(1, dt * (1.8 + ship.orbitNormalizeT * 2.2));
    const desiredAngle = (ship.targetOrbitAngle ?? ship.orbitAngle) + state.elapsed * speed;
    let delta = Math.atan2(Math.sin(desiredAngle - ship.orbitAngle), Math.cos(desiredAngle - ship.orbitAngle));
    ship.orbitAngle += speed * dt + delta * spacingEase;
    ship.orbitRadius += ((ship.targetOrbitRadius || planet.radius + 14) - ship.orbitRadius) * Math.min(1, dt * 3.2);
    ship.x = planet.x + Math.cos(ship.orbitAngle) * ship.orbitRadius;
    ship.y = planet.y + Math.sin(ship.orbitAngle) * ship.orbitRadius;
  }

  function applyPlanetGravity(ship, dt) {
    for (const planet of state.planets) {
      const d = dist(ship, planet);
      const influence = bodyInfluence(planet);
      if (d > influence) continue;
      const to = norm(planet.x - ship.x, planet.y - ship.y);
      const strength = (1 - d / influence) * (planet.type === "home" || planet.type === "base" || planet.isStar ? 148 : 118);
      ship.vx += to.x * strength * dt;
      ship.vy += to.y * strength * dt;
      ship.vx *= .995;
      ship.vy *= .995;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (d < planet.radius + 12 || (d < planet.radius + 26 && speed < 118)) {
        captureIntoOrbit(ship, planet, true);
        return;
      }
    }
  }

  function playerWormholes() {
    return (state.wormholes || []).filter(w => w.owner === "player");
  }

  function wormholeEntrancesFor(ship) {
    return (state.wormholes || []).filter(w => w.owner === ship.owner).flatMap(w => [
      ...(w.aEntryEnabled ? [{ wormhole: w, entry: w.a, exit: w.b, key: "a" }] : []),
      ...(w.bEntryEnabled ? [{ wormhole: w, entry: w.b, exit: w.a, key: "b" }] : [])
    ]);
  }

  function hitPlayerWormholeEntrance(point, radius = 32) {
    for (const wormhole of playerWormholes()) {
      if (dist(point, wormhole.a) <= radius) return { wormhole, key: "a", point: wormhole.a };
      if (dist(point, wormhole.b) <= radius) return { wormhole, key: "b", point: wormhole.b };
    }
    return null;
  }

  function deletePlayerWormhole(wormhole) {
    state.wormholes = (state.wormholes || []).filter(w => w.id !== wormhole.id);
    addEvent(`${teamLabel(wormhole.owner)} wormhole collapsed.`);
    updateHud();
  }

  function toggleWormholeEntrance(hit) {
    const prop = hit.key === "a" ? "aEntryEnabled" : "bEntryEnabled";
    hit.wormhole[prop] = !hit.wormhole[prop];
    addEvent(`${teamLabel(hit.wormhole.owner)} wormhole entry ${hit.wormhole[prop] ? "enabled" : "disabled"}.`);
    updateHud();
  }

  function isWormholeBusy(ship) {
    return ship.state === "pointerOrbit" || ship.state === "wormholeOrbit" || ship.state === "wormholeTransit";
  }

  function assignWormholeOrbit(ship, entry, exit) {
    const previousPlanetId = ship.planetId;
    if (previousPlanetId) {
      ship.planetId = null;
      assignPlanetOrbitSlots(previousPlanetId, ship.owner);
    }
    const toEntry = norm(ship.x - entry.x, ship.y - entry.y);
    const line = norm(exit.x - entry.x, exit.y - entry.y);
    const orbitSeed = ship.id * .73 + (ship.owner === "player" ? 0 : Math.PI);
    ship.state = "wormholeOrbit";
    ship.wormholeEntry = entry;
    ship.wormholeExit = exit;
    ship.wormholeOrbitAngle = (toEntry.len > 1 ? Math.atan2(ship.y - entry.y, ship.x - entry.x) : orbitSeed) + orbitSeed % .9;
    ship.wormholeOrbitRadius = clamp(toEntry.len, 14, 24);
    ship.wormholeCharge = 0;
    ship.wormholeChargeDuration = .25 + (ship.id % 7) * .055;
    ship.wormholeTransitT = 0;
    ship.wormholeExitVelocity = { x: line.x * 210, y: line.y * 210 };
    ship.vx *= .35;
    ship.vy *= .35;
    state.wormholeOrbitCaptures++;
    if (!reduced) spawnEffect("spark", ship.x, ship.y, entry.x, entry.y, colors.worm, .22);
  }

  function applyWormholeGravity(ship, dt) {
    if (!(state.wormholes || []).length || isWormholeBusy(ship) || (ship.wormholeCooldown || ship.warpLock || 0) > 0) return;
    for (const { entry, exit } of wormholeEntrancesFor(ship)) {
      if (ship.state !== "traveling") return;
      const d = dist(ship, entry);
      if (d > levelWormInfluence()) continue;
      const to = norm(entry.x - ship.x, entry.y - ship.y);
      const strength = (1 - d / levelWormInfluence()) * 118;
      ship.vx += to.x * strength * dt;
      ship.vy += to.y * strength * dt;
      state.wormholePulls += dt;
      if (d < 24) assignWormholeOrbit(ship, entry, exit);
    }
  }

  function scanWormholePickup(dt) {
    if (!(state.wormholes || []).length) return;
    state.ships.forEach(ship => {
      if (!(ship.state === "traveling" || ship.state === "orbiting") || (ship.wormholeCooldown || ship.warpLock || 0) > 0) return;
      for (const { entry, exit } of wormholeEntrancesFor(ship)) {
        const d = dist(ship, entry);
        const captureRange = ship.state === "orbiting" ? levelWormInfluence() : 30;
        if (d <= captureRange) {
          assignWormholeOrbit(ship, entry, exit);
          return;
        }
      }
    });
  }

  function updateWormholeCooldowns(dt) {
    state.ships.forEach(ship => {
      ship.wormholeCooldown = Math.max(0, (ship.wormholeCooldown || 0) - dt);
      ship.warpLock = Math.max(0, (ship.warpLock || 0) - dt);
    });
  }

  function beginWormholeTransit(ship) {
    const entry = ship.wormholeEntry;
    const exit = ship.wormholeExit;
    const line = norm(exit.x - entry.x, exit.y - entry.y);
    ship.state = "wormholeTransit";
    ship.wormholeTransitT = 0;
    ship.wormholeTransitDuration = .16 + (ship.id % 5) * .035;
    ship.wormholeExitVelocity = { x: line.x * 220, y: line.y * 220 };
    state.wormholeTransitCount++;
    if (!reduced) spawnEffect("burst", entry.x, entry.y, exit.x, exit.y, colors.worm, .34);
  }

  function updateWormholeOrbitShip(ship, dt) {
    const entry = ship.wormholeEntry;
    const exit = ship.wormholeExit;
    if (!entry || !exit) {
      ship.state = "traveling";
      return;
    }
    const dir = ship.owner === "player" ? 1 : -1;
    ship.wormholeCharge = (ship.wormholeCharge || 0) + dt;
    ship.wormholeOrbitAngle += dir * dt * (reduced ? 4.2 : 8.5);
    const targetRadius = 12 + (ship.id % 6) * 2;
    ship.wormholeOrbitRadius += (targetRadius - ship.wormholeOrbitRadius) * Math.min(1, dt * 8);
    const tx = entry.x + Math.cos(ship.wormholeOrbitAngle) * ship.wormholeOrbitRadius;
    const ty = entry.y + Math.sin(ship.wormholeOrbitAngle) * ship.wormholeOrbitRadius;
    const ease = Math.min(1, dt * 9);
    ship.vx = (tx - ship.x) * 8;
    ship.vy = (ty - ship.y) * 8;
    ship.x += (tx - ship.x) * ease;
    ship.y += (ty - ship.y) * ease;
    if ((ship.wormholeCharge || 0) >= (ship.wormholeChargeDuration || .4)) beginWormholeTransit(ship);
  }

  function releaseFromWormholeExit(ship) {
    const exit = ship.wormholeExit || ship;
    const velocity = ship.wormholeExitVelocity || norm((ship.wormholeExit?.x || ship.x) - (ship.wormholeEntry?.x || ship.x - 1), (ship.wormholeExit?.y || ship.y) - (ship.wormholeEntry?.y || ship.y));
    const v = norm(velocity.x, velocity.y);
    const speed = clamp(Math.hypot(velocity.x, velocity.y) || 210, MIN_LAUNCH_SPEED, MAX_SPEED);
    ship.x = exit.x + v.x * 34;
    ship.y = exit.y + v.y * 34;
    ship.vx = v.x * speed;
    ship.vy = v.y * speed;
    ship.state = "traveling";
    ship.planetId = null;
    ship.wormholeCooldown = 1.25;
    ship.warpLock = 1.25;
    ship.wormholeEntry = null;
    ship.wormholeExit = null;
    ship.trail = [];
    state.wormholeUses++;
    state.shipTransits++;
    if (!reduced) spawnEffect("burst", ship.x - v.x * 16, ship.y - v.y * 16, ship.x + v.x * 18, ship.y + v.y * 18, colors.worm, .4);
  }

  function updateWormholeTransitShip(ship, dt) {
    if (!ship.wormholeEntry || !ship.wormholeExit) return releaseFromWormholeExit(ship);
    ship.wormholeTransitT = (ship.wormholeTransitT || 0) + dt / (ship.wormholeTransitDuration || .22);
    const t = clamp(ship.wormholeTransitT, 0, 1);
    const ease = t * t * (3 - 2 * t);
    ship.x = ship.wormholeEntry.x + (ship.wormholeExit.x - ship.wormholeEntry.x) * ease;
    ship.y = ship.wormholeEntry.y + (ship.wormholeExit.y - ship.wormholeEntry.y) * ease;
    if (allowsShipTrails()) ship.trail = [{ x: ship.x, y: ship.y }, ...(ship.trail || [])].slice(0, 10);
    if (t >= 1) releaseFromWormholeExit(ship);
  }

  function bounceWithinBounds(ship) {
    let bounced = false;
    const pad = 3;
    if (ship.x < levelWorldBounds().x + pad) { ship.x = levelWorldBounds().x + pad; ship.vx = Math.abs(ship.vx) * .94; bounced = true; }
    if (ship.x > levelWorldBounds().x + levelWorldBounds().width - pad) { ship.x = levelWorldBounds().x + levelWorldBounds().width - pad; ship.vx = -Math.abs(ship.vx) * .94; bounced = true; }
    if (ship.y < levelWorldBounds().y + pad) { ship.y = levelWorldBounds().y + pad; ship.vy = Math.abs(ship.vy) * .94; bounced = true; }
    if (ship.y > levelWorldBounds().y + levelWorldBounds().height - pad) { ship.y = levelWorldBounds().y + levelWorldBounds().height - pad; ship.vy = -Math.abs(ship.vy) * .94; bounced = true; }
    if (bounced) {
      state.wallBounces++;
      spawnEffect("spark", ship.x, ship.y, ship.x + ship.vx * .05, ship.y + ship.vy * .05, colors[ship.owner] || colors.neutral, .24);
    }
  }

  function updateTravelingShip(ship, dt) {
    applyWormholeGravity(ship, dt);
    if (ship.state !== "traveling") return;
    applyPlanetGravity(ship, dt);
    if (ship.state !== "traveling") return;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > MAX_SPEED) {
      ship.vx = ship.vx / speed * MAX_SPEED;
      ship.vy = ship.vy / speed * MAX_SPEED;
    }
    bounceWithinBounds(ship);
    if (allowsShipTrails()) ship.trail = [{ x: ship.x, y: ship.y }, ...(ship.trail || [])].slice(0, 8);
  }

  function rivalTeams(owner) {
    return contestTeamKeys.filter(key => key !== owner);
  }

  function teamLabel(key) {
    return teamMeta[key]?.label || key;
  }

  function planetName(planet) {
    return planet.isStar ? "the central star" : `${planet.type} ${planet.id}`;
  }

  function shipsFor(owner, stateName = null) {
    return state.ships.filter(s => s.owner === owner && (!stateName || s.state === stateName));
  }

  function orbitingCount(planet, owner = planet.owner) {
    return state.ships.filter(s => s.owner === owner && s.state === "orbiting" && s.planetId === planet.id).length;
  }

  function incomingCount(planet, owner) {
    return state.ships.filter(s => s.owner === owner && s.state === "traveling" && dist(s, planet) < bodyInfluence(planet) + 92).length;
  }

  function aiBoard(team) {
    const ownedPlanets = state.planets.filter(p => p.owner === team);
    const playerPlanets = state.planets.filter(p => p.owner === "player");
    const neutralPlanets = state.planets.filter(p => p.owner === "neutral");
    const totalShips = shipsFor(team).length;
    const playerShips = shipsFor("player").length;
    const frontline = ownedPlanets.map(p => ({ p, d: Math.min(...state.planets.filter(t => t.owner !== team).map(t => dist(p, t))) })).sort((a, b) => a.d - b.d)[0]?.p || ownedPlanets[0];
    const threatened = ownedPlanets.map(p => ({ p, hostile: rivalTeams(team).reduce((sum, key) => sum + incomingCount(p, key), 0), defenders: orbitingCount(p, team) })).filter(x => x.hostile >= Math.max(5, x.defenders * .45)).sort((a, b) => (b.hostile - b.defenders) - (a.hostile - a.defenders))[0]?.p;
    return { ownedPlanets, playerPlanets, neutralPlanets, totalShips, playerShips, frontline, threatened };
  }


  function isOpeningPhase(team, board, memory) {
    const neutralNonStar = board.neutralPlanets.filter(p => !p.isStar).length;
    const playerAttacked = memory.recentLosses.some(e => e.to === "player" && state.elapsed - e.t < 40);
    const inDanger = Boolean(board.threatened);
    const done = state.elapsed > 62 || board.ownedPlanets.length >= 3 || neutralNonStar <= 1 || playerAttacked || inDanger;
    memory.openingComplete = memory.openingComplete || done;
    return !memory.openingComplete;
  }

  function isAiPlayerHomeGraceTarget(team, target) {
    if (!teamMeta[team]?.ai || !target || target.id !== "player-home" || target.owner !== "player" || target.type !== "home") return false;
    const graceSeconds = Number(activeLevel()?.playerHomeGraceSeconds);
    if (!Number.isFinite(graceSeconds) || graceSeconds <= 0) return false;
    return Number.isFinite(state?.elapsed) && state.elapsed < graceSeconds;
  }

  function maybeCreateAiWormhole(team, sourcePlanet, target, mode, memory, opening) {
    if (opening || target.owner === "player" && target.type === "home") return null;
    if (state.elapsed - (memory.lastWormholeAt || -99) < 22 + Math.random() * 10) return null;
    if ((state.wormholes || []).some(w => w.owner === team)) return null;
    const d = dist(sourcePlanet, target);
    if (d < 330 || d > levelWormMaxRange() + 360) return null;
    if (Math.random() > (mode === "reinforce" ? .55 : mode === "assault" ? .42 : .28)) return null;
    const line = norm(target.x - sourcePlanet.x, target.y - sourcePlanet.y);
    const entry = { x: sourcePlanet.x + line.x * (sourcePlanet.radius + 38), y: sourcePlanet.y + line.y * (sourcePlanet.radius + 38) };
    const exitDistance = Math.min(levelWormMaxRange() - 20, Math.max(190, d - target.radius - 86));
    const exit = { x: entry.x + line.x * exitDistance, y: entry.y + line.y * exitDistance };
    if (dist(entry, exit) > levelWormMaxRange()) return null;
    memory.lastWormholeAt = state.elapsed;
    return createTeamWormhole(team, entry, exit, { ttl: 14 + Math.random() * 8, targetName: planetName(target) });
  }

  function chooseAiMode(team, memory, board) {
    const opening = isOpeningPhase(team, board, memory);
    if (board.threatened) return "reinforce";
    if (opening && board.neutralPlanets.length) return "expand";
    if (board.ownedPlanets.length <= 1 && state.elapsed > 35) return "recover";
    const playerReducedAfterOpening = board.playerPlanets.length && board.playerShips < board.totalShips * .5 && (state.elapsed > 70 || board.ownedPlanets.length >= 3);
    if (playerReducedAfterOpening || (board.playerPlanets.length <= 1 && state.elapsed > 85 && board.totalShips > board.playerShips * 1.25)) return "finish";
    const canAssault = board.totalShips > 58 && state.elapsed - memory.lastMajorLaunchTime > (team === "enemy" ? 21 : 26) && (state.elapsed > 55 || board.ownedPlanets.length >= 3);
    if (canAssault && Math.random() < (team === "enemy" ? .4 : .3)) return "assault";
    const weakPlayer = board.playerPlanets.some(p => p.type !== "home" && orbitingCount(p, "player") < 16 && incomingCount(p, team) < 14);
    if (weakPlayer && state.elapsed > 42 && Math.random() < (team === "enemy" ? .45 : .3)) return "raid";
    if (board.neutralPlanets.length && (state.elapsed < 90 || team === "orange")) return "expand";
    return canAssault ? "assault" : "raid";
  }

  function scoreAiTarget(team, sourcePlanets, target, mode, memory) {
    const sources = sourcePlanets.length ? sourcePlanets : state.planets.filter(p => p.owner === team);
    const avgDistance = sources.reduce((sum, p) => sum + dist(p, target), 0) / Math.max(1, sources.length);
    const defenders = target.owner === "neutral" ? Math.ceil(target.radius / 4) : orbitingCount(target, target.owner);
    const friendlyPressure = incomingCount(target, team);
    const playerConcentration = target.owner === "player" ? defenders : incomingCount(target, "player");
    const recentCapture = memory.recentCaptures.find(c => c.planetId === target.id && state.elapsed - c.t < 24);
    const opening = isOpeningPhase(team, aiBoard(team), memory);
    let score = target.rate * 42 - avgDistance * .105 - defenders * (mode === "expand" ? .45 : .8) + friendlyPressure * 1.2;
    if (target.isStar) score += (team === "orange" ? 44 : 30) + Math.min(34, Math.max(0, state.elapsed - 18) * .32);
    if (target.owner === "neutral") score += mode === "expand" ? (opening && !target.isStar ? 105 : 64) : -4;
    if (target.owner === "player") score += mode === "finish" ? 72 : mode === "assault" ? 38 : mode === "raid" ? 28 : -32;
    if (target.owner === "player" && opening) score -= target.type === "home" ? 220 : 90;
    if (target.type === "home") score += mode === "finish" ? 28 : (mode === "assault" && state.elapsed > 80 ? 8 : -78);
    if (mode === "raid" && target.owner === "player") score += Math.max(0, 28 - defenders) * 2.4 - playerConcentration * .35;
    if (mode === "expand" && target.owner !== "neutral") score -= opening ? 120 : 46;
    if (recentCapture) score += mode === "reinforce" ? 18 : 10;
    if (memory.preferredFrontPlanetId && sources.some(p => p.id === memory.preferredFrontPlanetId)) score += 8;
    return score + Math.random() * 10;
  }

  function chooseAiTarget(team, sourcesOrSource, mode = "raid", memory = state.aiTeams?.[team] || {}) {
    const sources = Array.isArray(sourcesOrSource) ? sourcesOrSource : [sourcesOrSource].filter(Boolean);
    return state.planets
      .filter(p => p.owner !== team && !isAiPlayerHomeGraceTarget(team, p))
      .map(target => ({ target, score: scoreAiTarget(team, sources, target, mode, memory) }))
      .sort((a, b) => b.score - a.score)[0]?.target;
  }


  function desiredAiWaveSize(team, sourcePlanet, target, mode, availableCount, defenders, opening, memory = {}) {
    const reserve = sourcePlanet.type === "home"
      ? (mode === "finish" ? 8 : opening ? 17 : mode === "assault" ? 12 : 13)
      : (mode === "finish" ? 5 : opening ? 10 : mode === "assault" ? 8 : 9);
    const sendable = Math.max(0, availableCount - reserve);
    if (!sendable) return { desired: 0, reserve };
    const friendlyIncoming = incomingCount(target, team);
    const netDefenders = Math.max(0, defenders - Math.floor(friendlyIncoming * .75));
    const aggression = memory.aggression ?? (team === "enemy" ? .55 : .5);
    let low = .35, high = .55, tacticalNeed = netDefenders + 9;
    if (mode === "expand") {
      low = opening ? .30 : .35; high = opening ? .45 : .55; tacticalNeed = netDefenders + (opening ? 7 : 11);
    } else if (mode === "reinforce") {
      low = .30; high = .45; tacticalNeed = Math.max(10, netDefenders * .35 + 8);
    } else if (mode === "raid") {
      low = .40; high = .60; tacticalNeed = Math.max(12, Math.min(netDefenders + 8, availableCount * .62));
    } else if (mode === "assault") {
      low = .55; high = .75; tacticalNeed = netDefenders + 14;
    } else if (mode === "finish") {
      low = .65; high = .85; tacticalNeed = netDefenders + 18;
    }
    const intentRatio = low + (high - low) * clamp((aggression - .3) / .56, 0, 1);
    const ratioWave = sendable * intentRatio;
    const need = target.owner === "neutral" || mode === "expand" ? tacticalNeed : Math.max(tacticalNeed, ratioWave * .8);
    const desired = clamp(Math.max(ratioWave, need), Math.min(sendable, mode === "expand" && opening ? 8 : 10), sendable);
    return { desired, reserve };
  }

  function launchAiWave(team, sourcePlanet, target, count, options = {}) {
    if (isAiPlayerHomeGraceTarget(team, target)) return 0;
    const available = planetOrbiters(sourcePlanet.id, team);
    const reserve = options.reserve ?? 8;
    const sendCount = clamp(Math.floor(count), 0, Math.max(0, available.length - reserve));
    const ships = available.slice(0, sendCount);
    if (!ships.length) return 0;
    const opening = options.opening ?? isOpeningPhase(team, aiBoard(team), state.aiTeams?.[team] || {});
    const memory = state.aiTeams?.[team];
    const wormhole = options.allowWorm ? maybeCreateAiWormhole(team, sourcePlanet, target, options.mode || "raid", memory || {}, opening) : null;
    const aimTarget = wormhole?.a || target;
    const aim = norm(aimTarget.x - sourcePlanet.x, aimTarget.y - sourcePlanet.y);
    const origin = { x: sourcePlanet.x + aim.x * (sourcePlanet.radius + 24), y: sourcePlanet.y + aim.y * (sourcePlanet.radius + 24) };
    ships.forEach((ship, i) => {
      ship.state = "aiLaunchField";
      ship.planetId = null;
      ship.aiLaunchFieldId = `ai-field-${state.elapsed}-${team}-${sourcePlanet.id}-${target.id}`;
      ship.aiSlot = i;
      ship.vx = ship.vy = 0;
      ship.trail = [];
    });
    const sizeBonus = clamp((ships.length - 12) / 36, 0, .75);
    const field = { id: ships[0].aiLaunchFieldId, team, sourcePlanetId: sourcePlanet.id, targetPlanetId: target.id, selectedShipIds: ships.map(s => s.id), origin, aimTarget: { x: aimTarget.x, y: aimTarget.y }, finalTarget: { x: target.x, y: target.y }, charge: 0, chargeDuration: (options.major ? 1.25 : .8 + Math.random() * .35) + sizeBonus, mode: options.mode || "raid", speed: options.speed || (options.major ? 190 : 170), major: Boolean(options.major), useWormholeEntry: Boolean(wormhole), createdAt: state.elapsed };
    state.aiLaunchFields.push(field);
    assignPlanetOrbitSlots(sourcePlanet.id, team);
    recordLaunch({ t: Math.round(state.elapsed), team, ships: ships.length, targetPlanetId: target.id, sourcePlanetId: sourcePlanet.id, major: Boolean(options.major), mode: options.mode, staged: true });
    if (target.owner === "player" && target.type === "home" && memory) memory.lastPlayerHomeTargetAt = state.elapsed;
    if (!reduced) spawnEffect("spark", sourcePlanet.x, sourcePlanet.y, origin.x, origin.y, colors[team], .24);
    return ships.length;
  }

  function updateAiLaunchFields(dt) {
    (state.aiLaunchFields || []).forEach(field => {
      field.charge += dt;
      const aim = norm(field.aimTarget.x - field.origin.x, field.aimTarget.y - field.origin.y);
      const perp = { x: -aim.y, y: aim.x };
      const ships = field.selectedShipIds.map(id => state.ships.find(s => s.id === id)).filter(Boolean);
      ships.forEach((ship, i) => {
        if (ship.state !== "aiLaunchField") return;
        const layer = Math.floor(i / 10);
        const ring = 10 + (i % 4) * 4 + layer * 7;
        const layerCount = Math.min(10, ships.length - layer * 10);
        const angle = ((i % 10) / Math.max(1, layerCount)) * TAU + field.charge * (field.team === "orange" ? -3 : 3) * (1 - layer * .08);
        const slot = { x: field.origin.x - aim.x * (10 + layer * 2) + Math.cos(angle) * ring + perp.x * ((i % 5) - 2) * 1.2, y: field.origin.y - aim.y * (10 + layer * 2) + Math.sin(angle) * ring + perp.y * ((i % 5) - 2) * 1.2 };
        ship.x += (slot.x - ship.x) * Math.min(1, dt * 7.5);
        ship.y += (slot.y - ship.y) * Math.min(1, dt * 7.5);
      });
      if (field.charge < field.chargeDuration) return;
      ships.forEach((ship, i) => {
        const direct = norm(field.finalTarget.x - ship.x, field.finalTarget.y - ship.y);
        const spread = ((i % 9) - 4) * 2.5;
        ship.state = "traveling";
        ship.aiLaunchFieldId = null;
        ship.vx = aim.x * (field.speed + Math.random() * 22) + perp.x * spread + direct.x * (field.useWormholeEntry ? 22 : 0);
        ship.vy = aim.y * (field.speed + Math.random() * 22) + perp.y * spread + direct.y * (field.useWormholeEntry ? 22 : 0);
      });
      if (!reduced) spawnEffect(field.major ? "burst" : "spark", field.origin.x, field.origin.y, field.aimTarget.x, field.aimTarget.y, colors[field.team], field.major ? .5 : .28);
      field.done = true;
    });
    state.aiLaunchFields = (state.aiLaunchFields || []).filter(f => !f.done);
  }

  function launchCoordinatedAiAssault(team, target, sources, memory, mode = "assault") {
    let sent = 0;
    const chosen = sources.slice(0, mode === "finish" ? 3 : 2 + (state.elapsed > 100 ? 1 : 0));
    chosen.forEach(source => {
      const reserve = source.planet.type === "home" && mode !== "finish" ? 12 : 8;
      const defenders = target.owner === "neutral" ? Math.ceil(target.radius / 4) : orbitingCount(target, target.owner);
      const wave = desiredAiWaveSize(team, source.planet, target, mode, source.ships.length, defenders, false, memory);
      sent += launchAiWave(team, source.planet, target, Math.max(12, wave.desired), { reserve: Math.min(reserve, wave.reserve), major: true, mode, allowWorm: true, speed: mode === "finish" ? 205 : 192 });
    });
    if (sent >= 18) {
      state.enemyMajorLaunches++;
      memory.lastMajorLaunchTime = state.elapsed;
      memory.targetPlanetId = target.id;
      addEvent(`${teamLabel(team)} coordinated assault on ${target.id.toUpperCase()} from ${chosen.length} worlds.`);
    }
    return sent;
  }

  function planAiAssault(team, target, mode, memory) {
    const sources = state.planets.filter(p => p.owner === team).map(p => ({ planet: p, ships: planetOrbiters(p.id, team) })).filter(s => s.ships.length >= 16).sort((a, b) => dist(a.planet, target) - dist(b.planet, target));
    return launchCoordinatedAiAssault(team, target, sources, memory, mode);
  }

  function aiLaunchForTeam(team, memory = state.aiTeams?.[team]) {
    if (!memory) return;
    thinkAiTeam(team, 0, true);
  }

  function thinkAiTeam(team, dt = 0, force = false) {
    const memory = state.aiTeams?.[team];
    if (!memory || state.ended || (!force && state.elapsed < memory.nextThinkAt)) return;
    const board = aiBoard(team);
    if (!board.ownedPlanets.length) return;
    memory.recentLosses = memory.recentLosses.filter(e => state.elapsed - e.t < 35);
    memory.recentCaptures = memory.recentCaptures.filter(e => state.elapsed - e.t < 35);
    memory.preferredFrontPlanetId = board.frontline?.id || memory.preferredFrontPlanetId;
    const tuning = activeLevel().aiTuning?.[team] || {};
    memory.aggression = clamp((team === "enemy" ? .5 : .42) + (tuning.aggressionBase || 0) + state.elapsed / 260 + board.ownedPlanets.length * .035 - (memory.recentLosses.length * .06), .3, .9);
    const mode = memory.modeUntil > state.elapsed ? memory.mode : chooseAiMode(team, memory, board);
    memory.mode = mode;
    memory.modeUntil = state.elapsed + (mode === "recover" ? 6 : 10 + Math.random() * 7);
    const delay = mode === "finish" ? 2.6 : mode === "assault" ? 4.8 : mode === "recover" ? 5.5 : 3.6;
    memory.nextThinkAt = state.elapsed + Math.max(1.8, delay + (activeLevel().aiTuning?.[team]?.thinkOffset || 0)) + Math.random() * 1.8;
    if (mode === "recover") return;
    if (mode === "reinforce" && board.threatened) {
      const sources = board.ownedPlanets.filter(p => p.id !== board.threatened.id).map(p => ({ planet: p, ships: planetOrbiters(p.id, team) })).filter(s => s.ships.length > 14).sort((a, b) => dist(a.planet, board.threatened) - dist(b.planet, board.threatened)).slice(0, 2);
      let sent = 0;
      sources.forEach(source => { const defenders = orbitingCount(board.threatened, board.threatened.owner); const wave = desiredAiWaveSize(team, source.planet, board.threatened, mode, source.ships.length, defenders, false, memory); sent += launchAiWave(team, source.planet, board.threatened, wave.desired, { reserve: wave.reserve, mode, speed: 160 }); });
      if (sent) addEvent(`${teamLabel(team)} reinforced its front near ${board.threatened.id.toUpperCase()}.`);
      return;
    }
    const target = chooseAiTarget(team, board.ownedPlanets, mode, memory);
    if (!target) return;
    memory.targetPlanetId = target.id;
    if (mode === "assault" || mode === "finish") {
      if (planAiAssault(team, target, mode, memory)) return;
    }
    const source = board.ownedPlanets.map(p => ({ planet: p, ships: planetOrbiters(p.id, team), score: orbitingCount(p, team) - dist(p, target) / 45 })).filter(s => s.ships.length > (mode === "expand" ? 11 : 14)).sort((a, b) => b.score - a.score)[0];
    if (!source) return;
    const defenders = target.owner === "neutral" ? 8 : orbitingCount(target, target.owner);
    const opening = isOpeningPhase(team, board, memory);
    const wave = desiredAiWaveSize(team, source.planet, target, mode, source.ships.length, defenders, opening, memory);
    if (mode === "raid" && defenders > source.ships.length * .75) return;
    const sent = launchAiWave(team, source.planet, target, wave.desired, { reserve: wave.reserve, mode, major: mode === "assault" || mode === "finish", allowWorm: true, speed: mode === "raid" ? 190 : 170, opening });
    if (!sent) return;
    const sizeText = sent >= 24 ? "committed a major wave toward" : `charged a ${sent}-ship launch toward`;
    const kind = mode === "expand" ? `expanded with ${sent} ships toward` : mode === "raid" ? sizeText : sizeText;
    addEvent(`${teamLabel(team)} ${kind} ${planetName(target)}.`);
  }

  function aiLaunch() {
    if (state.ended) return;
    contestTeamKeys.filter(key => teamMeta[key].ai).forEach(team => thinkAiTeam(team, 0, true));
  }

  function recordLaunch(event) {
    state.launchEvents.push(event);
    state.launchEvents = state.launchEvents.slice(-80);
    state.largestLaunch = Math.max(state.largestLaunch, event.ships || 0);
    if (event.team === "player") {
      state.liveSpikeUntil = state.elapsed + (reduced ? .4 : 1.2);
      if (ui.launchPulse) ui.launchPulse.textContent = `+${event.ships} launch`;
      if ((event.ships || 0) >= 18) addEvent(`Major player launch spike: ${event.ships} ships.`);
    }
  }

  function spawnEffect(type, x1, y1, x2, y2, color, ttl = .25) {
    if (usesMobilePresentation() || (reduced && type !== "blast")) return;
    state.effects.push({ type, x1, y1, x2, y2, color, ttl, maxTtl: ttl });
  }

  function spawnBlast(from, to) {
    state.blasterHits++;
    recordHeatPoint("combat", (from.x + to.x) / 2, (from.y + to.y) / 2, 1);
    from.combatCooldown = .28 + Math.random() * .3;
    spawnEffect("blast", from.x, from.y, to.x, to.y, colors[from.owner] || colors.neutral, .18);
    if (!reduced) spawnEffect("spark", to.x, to.y, to.x + (Math.random() - .5) * 18, to.y + (Math.random() - .5) * 18, colors.gold, .25);
  }

  function destroyShip(ship, destroyedBy = null) {
    if (!state.ships.includes(ship)) return;
    state.ships = state.ships.filter(s => s !== ship);
    if (ship.owner === "player") state.shipsLost++;
    if (destroyedBy === "player") state.shipsDestroyed++;
    spawnEffect("spark", ship.x, ship.y, ship.x + 1, ship.y + 1, colors[ship.owner] || colors.neutral, .3);
  }

  function teamBuckets(ships) {
    return activeTeamKeys.map(team => [team, ships.filter(s => s.owner === team)]).filter(([, ships]) => ships.length);
  }

  function resolvePlanetCombat(dt) {
    state.planets.forEach(planet => {
      const near = state.ships.filter(s => dist(s, planet) < planet.radius + 42 && !["pointerOrbit", "aiLaunchField", "wormholeOrbit", "wormholeTransit"].includes(s.state));
      const buckets = teamBuckets(near);
      if (buckets.length > 1) {
        const shots = Math.min(10, Math.max(1, Math.floor(dt * 16 + Math.random() * 2)));
        for (let i = 0; i < shots; i++) {
          const active = teamBuckets(near).filter(([, ships]) => ships.some(s => state.ships.includes(s)));
          if (active.length < 2) break;
          const [teamA, shipsA] = active[Math.floor(Math.random() * active.length)];
          const rivals = active.filter(([team]) => team !== teamA);
          const [, shipsB] = rivals[Math.floor(Math.random() * rivals.length)];
          const a = shipsA[Math.floor(Math.random() * shipsA.length)];
          const b = shipsB[Math.floor(Math.random() * shipsB.length)];
          if (!a || !b || !state.ships.includes(a) || !state.ships.includes(b)) continue;
          spawnBlast(a, b); spawnBlast(b, a);
          if (Math.random() < .34) destroyShip(a, b.owner);
          if (Math.random() < .38) destroyShip(b, a.owner);
          state.combat++;
        }
      } else if (buckets.length === 1) {
        const [team, ships] = buckets[0];
        if (team !== "neutral" && planet.owner !== team) capturePlanet(planet, team, dt, ships.length);
        contestTeamKeys.filter(key => key !== team).forEach(key => { planet.capture[key] = Math.max(0, (planet.capture[key] || 0) - dt * 12); });
      } else {
        contestTeamKeys.forEach(key => { planet.capture[key] = Math.max(0, (planet.capture[key] || 0) - dt * 4); });
      }
    });
  }

  function resolveDeepSpaceCombat(dt) {
    const travelers = state.ships.filter(s => s.state === "traveling");
    travelers.forEach(s => { s.combatCooldown = Math.max(0, (s.combatCooldown || 0) - dt); });
    const grid = new Map();
    const cellSize = 42;
    const keyFor = s => `${Math.floor(s.x / cellSize)},${Math.floor(s.y / cellSize)}`;
    travelers.filter(s => s.combatCooldown <= 0).forEach(s => {
      const key = keyFor(s);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(s);
    });
    let checks = 0;
    for (const ship of travelers) {
      if (checks > 160 || ship.combatCooldown > 0 || !state.ships.includes(ship)) continue;
      const cx = Math.floor(ship.x / cellSize), cy = Math.floor(ship.y / cellSize);
      let rival = null;
      for (let gx = cx - 1; gx <= cx + 1 && !rival; gx++) for (let gy = cy - 1; gy <= cy + 1 && !rival; gy++) {
        const candidates = grid.get(`${gx},${gy}`) || [];
        rival = candidates.find(other => other.owner !== ship.owner && other.combatCooldown <= 0 && dist(ship, other) < 34);
      }
      checks++;
      if (!rival) continue;
      spawnBlast(ship, rival); spawnBlast(rival, ship);
      state.combat++; state.deepSpaceCombats++;
      if (Math.random() < .18) destroyShip(ship, rival.owner);
      if (Math.random() < .2) destroyShip(rival, ship.owner);
      if (Math.random() < .08) addEvent(`${teamLabel(ship.owner)} and ${teamLabel(rival.owner)} fleets clashed in deep space.`);
    }
  }

  function resolveCombat(dt) {
    resolvePlanetCombat(dt);
    resolveDeepSpaceCombat(dt);
  }

  function capturePlanet(planet, owner, dt, shipPressure) {
    planet.capture[owner] = (planet.capture[owner] || 0) + dt * (10 + Math.min(12, shipPressure * .35));
    const threshold = planet.owner === "neutral" ? (planet.isStar ? 58 : 42) : 55;
    if (planet.capture[owner] < threshold) return;
    const old = planet.owner;
    planet.owner = owner;
    planet.capture = createCaptureState();
    state.captures.push({ t: Math.round(state.elapsed), planet: planet.id, owner });
    if (state.aiTeams) {
      Object.values(state.aiTeams).forEach(memory => {
        if (memory.team === owner) {
          memory.recentCaptures.push({ planetId: planet.id, t: state.elapsed, from: old });
          if (old === "neutral" && state.elapsed < 70) memory.earlyNeutralCaptures++;
          if (memory.firstExpansionAt == null && old === "neutral") memory.firstExpansionAt = state.elapsed;
        }
        else if (old === memory.team) memory.recentLosses.push({ planetId: planet.id, t: state.elapsed, to: owner });
      });
    }
    addEvent(`${teamLabel(owner)} captured ${planetName(planet)}.`);
    if (old !== owner) spawnShip(owner, planet, 4);
    assignPlanetOrbitSlots(planet.id, owner);
  }

  function updateEffects(dt) {
    state.effects.forEach(e => { e.ttl -= dt; });
    state.effects = state.effects.filter(e => e.ttl > 0);
  }

  function recordHeatPoint(mode, x, y, weight) {
    const heatmap = state.heatmap;
    const layer = heatmap?.[mode];
    if (!Array.isArray(layer)) return;
    const bounds = levelWorldBounds();
    const nx = clamp((x - bounds.x) / bounds.width, 0, .999999);
    const ny = clamp((y - bounds.y) / bounds.height, 0, .999999);
    const gx = Math.floor(nx * heatmap.width);
    const gy = Math.floor(ny * heatmap.height);
    layer[gy * heatmap.width + gx] += weight;
  }

  function updateHeat(ship, dt) {
    recordHeatPoint("movement", ship.x, ship.y, dt);
  }

  function buildRunMapSnapshot(levelConfig = activeLevel(), planets = state.planets) {
    const bounds = levelConfig.worldBounds || BASE_WORLD_BOUNDS;
    const paths = makeOrbitPaths(levelConfig);
    return {
      width: bounds.width,
      height: bounds.height,
      aspectRatio: bounds.width / bounds.height,
      orbits: Object.values(paths).map(path => ({
        id: path.id,
        cx: (path.cx - bounds.x) / bounds.width,
        cy: (path.cy - bounds.y) / bounds.height,
        rx: path.semiMajor / bounds.width,
        ry: path.semiMajor * (path.projectionScale || 1) / bounds.height
      })),
      planets: planets.map(planet => ({
        id: planet.id,
        type: planet.type,
        owner: planet.owner,
        isStar: Boolean(planet.isStar),
        x: (planet.x - bounds.x) / bounds.width,
        y: (planet.y - bounds.y) / bounds.height,
        radius: planet.radius / bounds.width
      }))
    };
  }

  function setupTutorialCanvas(canvas) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const sceneCtx = canvas.getContext("2d");
    sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { sceneCtx, width, height };
  }

  function clearTutorialScene(sceneCtx, width, height) {
    sceneCtx.clearRect(0, 0, width, height);
    const gradient = sceneCtx.createRadialGradient(width * .5, height * .45, 10, width * .5, height * .45, width * .58);
    gradient.addColorStop(0, "rgba(111,248,255,.05)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    sceneCtx.fillStyle = gradient;
    sceneCtx.fillRect(0, 0, width, height);
  }

  function tutorialGlowDot(sceneCtx, x, y, radius, color, alpha = 1) {
    sceneCtx.save();
    sceneCtx.globalAlpha = alpha;
    sceneCtx.fillStyle = color;
    sceneCtx.shadowColor = color;
    sceneCtx.shadowBlur = 10;
    sceneCtx.beginPath();
    sceneCtx.arc(x, y, radius, 0, TAU);
    sceneCtx.fill();
    sceneCtx.restore();
  }

  function tutorialCircle(sceneCtx, x, y, radius, color, alpha = 1, dash = null) {
    sceneCtx.save();
    sceneCtx.globalAlpha = alpha;
    sceneCtx.strokeStyle = color;
    sceneCtx.lineWidth = 1.4;
    if (dash) sceneCtx.setLineDash(dash);
    sceneCtx.beginPath();
    sceneCtx.arc(x, y, radius, 0, TAU);
    sceneCtx.stroke();
    sceneCtx.restore();
  }

  function tutorialArrow(sceneCtx, ax, ay, bx, by, color, alpha = 1) {
    const angle = Math.atan2(by - ay, bx - ax);
    sceneCtx.save();
    sceneCtx.globalAlpha = alpha;
    sceneCtx.strokeStyle = color;
    sceneCtx.fillStyle = color;
    sceneCtx.lineWidth = 1.4;
    sceneCtx.beginPath();
    sceneCtx.moveTo(ax, ay);
    sceneCtx.lineTo(bx, by);
    sceneCtx.stroke();
    sceneCtx.beginPath();
    sceneCtx.moveTo(bx, by);
    sceneCtx.lineTo(bx - Math.cos(angle - .45) * 9, by - Math.sin(angle - .45) * 9);
    sceneCtx.lineTo(bx - Math.cos(angle + .45) * 9, by - Math.sin(angle + .45) * 9);
    sceneCtx.closePath();
    sceneCtx.fill();
    sceneCtx.restore();
  }

  function drawTutorialPlanet(sceneCtx, x, y, radius) {
    const gradient = sceneCtx.createRadialGradient(x - radius * .35, y - radius * .35, 2, x, y, radius * 1.2);
    gradient.addColorStop(0, "#efffff");
    gradient.addColorStop(.45, colors.player);
    gradient.addColorStop(1, "#15566c");
    sceneCtx.save();
    sceneCtx.shadowColor = colors.player;
    sceneCtx.shadowBlur = 22;
    sceneCtx.fillStyle = gradient;
    sceneCtx.beginPath();
    sceneCtx.arc(x, y, radius, 0, TAU);
    sceneCtx.fill();
    sceneCtx.restore();
    tutorialCircle(sceneCtx, x, y, radius + 18, colors.player, .25, [2, 4]);
  }

  function drawTutorialLaunch(canvas, time) {
    const { sceneCtx, width, height } = setupTutorialCanvas(canvas);
    clearTutorialScene(sceneCtx, width, height);
    const planet = { x: width * .2, y: height * .52 };
    const field = { x: width * .58, y: height * .53 };
    const target = { x: width * .82, y: height * .31 };
    const cycle = 5.2;
    const progress = reduced ? .48 : (time % cycle) / cycle;
    drawTutorialPlanet(sceneCtx, planet.x, planet.y, 18);

    const fieldIn = smooth(clamp((progress - .18) / .12, 0, 1));
    const release = smooth(clamp((progress - .7) / .16, 0, 1));
    const aimAlpha = clamp((progress - .42) / .14, 0, 1) * (1 - clamp((progress - .86) / .08, 0, 1));
    const fieldAlpha = fieldIn * (1 - clamp((progress - .83) / .08, 0, 1));
    if (fieldAlpha > 0) {
      sceneCtx.save();
      sceneCtx.globalAlpha = .13 * fieldAlpha;
      sceneCtx.fillStyle = colors.player;
      sceneCtx.shadowColor = colors.player;
      sceneCtx.shadowBlur = 22;
      sceneCtx.beginPath();
      sceneCtx.arc(field.x, field.y, 38, 0, TAU);
      sceneCtx.fill();
      sceneCtx.restore();
      tutorialCircle(sceneCtx, field.x, field.y, 38, colors.player, .62 * fieldAlpha);
      tutorialCircle(sceneCtx, field.x, field.y, 25, colors.player, .35 * fieldAlpha, [2, 5]);
      tutorialGlowDot(sceneCtx, field.x, field.y, 4, "#dffcff", fieldAlpha);
    }
    if (aimAlpha > 0) tutorialArrow(sceneCtx, field.x + 14, field.y - 3, mix(field.x + 18, target.x, aimAlpha), mix(field.y - 5, target.y, aimAlpha), colors.player, aimAlpha);

    for (let i = 0; i < 9; i++) {
      const orbitAngle = i / 9 * TAU + time * (1.4 + (i % 3) * .08);
      const orbit = { x: planet.x + Math.cos(orbitAngle) * 33, y: planet.y + Math.sin(orbitAngle) * 24 };
      const gather = smooth(clamp((progress - .22 - i * .012) / .24, 0, 1));
      const heldAngle = i / 9 * TAU + time * 2.2;
      const heldRadius = 15 + (i % 3) * 5;
      const held = { x: field.x + Math.cos(heldAngle) * heldRadius, y: field.y + Math.sin(heldAngle) * heldRadius };
      const launched = { x: held.x + (target.x - field.x) * 1.18, y: held.y + (target.y - field.y) * 1.18 };
      const gathered = { x: mix(orbit.x, held.x, gather), y: mix(orbit.y, held.y, gather) };
      tutorialGlowDot(sceneCtx, mix(gathered.x, launched.x, release), mix(gathered.y, launched.y, release), 3.2, colors.player, 1 - clamp((progress - .88) / .06, 0, 1));
    }
  }

  function drawTutorialPortal(sceneCtx, x, y, radius, label, entry, spin, alpha = 1) {
    sceneCtx.save();
    sceneCtx.globalAlpha = alpha;
    sceneCtx.strokeStyle = entry ? colors.worm : "rgba(199,125,255,.65)";
    sceneCtx.lineWidth = entry ? 2 : 1.8;
    sceneCtx.setLineDash(entry ? [] : [5, 5]);
    sceneCtx.shadowColor = colors.worm;
    sceneCtx.shadowBlur = entry ? 20 : 12;
    sceneCtx.beginPath();
    sceneCtx.arc(x, y, radius + Math.sin(spin) * 1.5, 0, TAU);
    sceneCtx.stroke();
    sceneCtx.setLineDash([2, 5]);
    sceneCtx.beginPath();
    sceneCtx.arc(x, y, radius - 7, spin, spin + TAU * .74);
    sceneCtx.stroke();
    sceneCtx.setLineDash([]);
    sceneCtx.font = "900 9px Inter, sans-serif";
    sceneCtx.textAlign = "center";
    sceneCtx.fillStyle = entry ? colors.worm : "rgba(223,232,255,.68)";
    sceneCtx.fillText(label, x, y + radius + 18);
    sceneCtx.restore();
  }

  function drawTutorialWormhole(canvas, time) {
    const { sceneCtx, width, height } = setupTutorialCanvas(canvas);
    clearTutorialScene(sceneCtx, width, height);
    const entry = { x: width * .23, y: height * .6 };
    const exit = { x: width * .78, y: height * .31 };
    const dx = exit.x - entry.x;
    const dy = exit.y - entry.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const cycle = 3.9;
    sceneCtx.save();
    const gradient = sceneCtx.createLinearGradient(entry.x, entry.y, exit.x, exit.y);
    gradient.addColorStop(0, "rgba(199,125,255,.88)");
    gradient.addColorStop(.62, "rgba(199,125,255,.34)");
    gradient.addColorStop(1, "rgba(111,248,255,.18)");
    sceneCtx.strokeStyle = gradient;
    sceneCtx.lineWidth = 2;
    sceneCtx.beginPath();
    sceneCtx.moveTo(entry.x, entry.y);
    sceneCtx.lineTo(exit.x, exit.y);
    sceneCtx.stroke();
    sceneCtx.restore();
    tutorialArrow(sceneCtx, entry.x + ux * 82, entry.y + uy * 82, entry.x + ux * 136, entry.y + uy * 136, colors.worm, .9);
    drawTutorialPortal(sceneCtx, entry.x, entry.y, 18, "ENTRY", true, time * 3.4);
    drawTutorialPortal(sceneCtx, exit.x, exit.y, 18, "EXIT", false, -time * 2.2, .75);

    for (let i = 0; i < 4; i++) {
      const progress = reduced ? (.18 + i * .18) % 1 : ((time + i * .55) % cycle) / cycle;
      let x, y, alpha = 1, radius = 3.3;
      if (progress < .32) {
        const q = smooth(progress / .32);
        const startX = entry.x - ux * (62 + i * 7) + Math.sin(time * 1.7 + i) * 6;
        const startY = entry.y - uy * (62 + i * 7) + Math.cos(time * 1.4 + i) * 5;
        x = mix(startX, entry.x + Math.cos(time * 4 + i) * 20, q);
        y = mix(startY, entry.y + Math.sin(time * 4 + i) * 16, q);
      } else if (progress < .52) {
        const q = (progress - .32) / .2;
        x = entry.x + Math.cos(time * 8 + i * 1.7) * mix(20, 11, q);
        y = entry.y + Math.sin(time * 8 + i * 1.7) * mix(16, 9, q);
        radius = 3.5 + q * 1.5;
      } else if (progress < .64) {
        const q = smooth((progress - .52) / .12);
        x = mix(entry.x, exit.x, q);
        y = mix(entry.y, exit.y, q);
        radius = 4.8;
      } else {
        const q = smooth((progress - .64) / .28);
        x = exit.x + ux * mix(22, 92, q) + Math.sin(time * 3 + i) * 2;
        y = exit.y + uy * mix(22, 92, q) + Math.cos(time * 3 + i) * 2;
        alpha = 1 - clamp((progress - .84) / .12, 0, 1);
      }
      tutorialGlowDot(sceneCtx, x, y, radius, "#dca8ff", alpha);
    }
  }

  function drawTutorialCanvases(time) {
    if (ui.tutorial?.hidden || activeModal !== ui.tutorial) return;
    ui.tutorialCanvases.forEach(tutorialCanvas => {
      if (tutorialCanvas.dataset.tutorialDemo === "launch") drawTutorialLaunch(tutorialCanvas, time);
      if (tutorialCanvas.dataset.tutorialDemo === "wormhole") drawTutorialWormhole(tutorialCanvas, time);
    });
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) {
      state.lastTick = now;
      lastProcessedFrameAt = now;
      return;
    }
    const targetFps = state.ended ? 12 : (usesMobilePresentation() ? 30 : 60);
    const minimumFrameMs = 1000 / targetFps;
    if (lastProcessedFrameAt && now - lastProcessedFrameAt < minimumFrameMs * .8) return;
    lastProcessedFrameAt = now;
    frameWindowCount++;
    if (now - frameWindowStartedAt >= 1000) {
      observedFps = Math.round(frameWindowCount * 1000 / Math.max(1, now - frameWindowStartedAt));
      frameWindowCount = 0;
      frameWindowStartedAt = now;
      mobileHudSignature = "";
    }
    const dt = Math.min(.06, (now - state.lastTick) / 1000);
    state.lastTick = now;
    if (state.running) {
      state.elapsed += state.ended ? 0 : dt;
      updatePlanetOrbits(dt);
      state.planets.forEach(p => {
        p.pulse += dt;
        if (!state.ended && p.owner !== "neutral") {
          p.prod += dt * p.rate;
          const cap = state.ships.filter(s => s.owner === p.owner && s.state === "orbiting" && s.planetId === p.id).length < 58;
          if (p.prod >= 1 && cap) { spawnShip(p.owner, p, 1); p.prod = 0; }
        }
      });
      if (!state.ended) contestTeamKeys.filter(key => teamMeta[key].ai).forEach(team => thinkAiTeam(team, dt));
      updateAiLaunchFields(dt);
      state.wormholes = (state.wormholes || []).filter(w => {
        w.spin += dt * 2.8;
        w.ttl -= dt;
        return w.ttl > 0;
      });
      if (state.launcher?.active) updateLauncher(state.launcher.pointer, dt);
      updateWormholeCooldowns(dt);
      scanWormholePickup(dt);

      state.ships.forEach(ship => {
        if (ship.state === "orbiting") {
          updateOrbitingShip(ship, dt);
        } else if (ship.state === "traveling") {
          updateTravelingShip(ship, dt);
        } else if (ship.state === "aiLaunchField") {
          // AI launch fields position their ships as a staged command cluster.
        } else if (ship.state === "wormholeOrbit") {
          updateWormholeOrbitShip(ship, dt);
        } else if (ship.state === "wormholeTransit") {
          updateWormholeTransitShip(ship, dt);
        }
        updateHeat(ship, dt);
      });
      resolveCombat(dt);
      updateEffects(dt);
      lastSuccessfulSimulationAt = performance.now();
      if (!state.ended && Math.floor(state.elapsed / 4) > state.lastSnap) { state.lastSnap = Math.floor(state.elapsed / 4); snapshot(); }
      const c = counts();
      state.peakPlayerShips = Math.max(state.peakPlayerShips, c.playerShips);
      state.peakFleetAdvantage = Math.max(state.peakFleetAdvantage, c.playerShips - Math.max(0, ...contestTeamKeys.filter(k => k !== "player").map(k => c.teams[k]?.ships || 0)));
      if (!state.ended && (c.rivalPlanets === 0 || state.planets.filter(p => p.owner !== "neutral").every(p => p.owner === "player"))) end("Victory");
      if (!state.ended && c.playerPlanets === 0) end("Defeat");
      const hudInterval = usesMobilePresentation() ? 250 : 100;
      if (now - lastHudUpdateAt >= hudInterval || state.ended) {
        lastHudUpdateAt = now;
        updateHud(c);
      }
    }
    const tutorialInterval = usesMobilePresentation() ? 1000 / 20 : 1000 / 30;
    if (!reduced && now - lastTutorialFrameAt >= tutorialInterval) {
      lastTutorialFrameAt = now;
      drawTutorialCanvases(now / 1000);
    } else if (reduced && !lastTutorialFrameAt) {
      lastTutorialFrameAt = now;
      drawTutorialCanvases(now / 1000);
    }
    if (state.running) draw();
  }

  function end(outcome) {
    if (state.ended) return;
    state.ended = true;
    state.acceptingInput = false;
    state.outcome = outcome;
    state.endedAt = new Date();
    cancelActiveGesture({ cancelPending: true });
    setWormMode(false);
    snapshot();
    updateLiveTelemetry(counts(), true);
    addEvent(outcome === "Victory" ? "Victory: all Red and Orange planets captured." : "Defeat: all player planets were lost.");
    const duration = Math.round(state.elapsed);
    const playerCaptures = state.captures.filter(c => c.owner === "player").length;
    const averageLaunchSize = state.launches ? Math.round(state.shipsLaunched / state.launches) : 0;
    // Portal deployment is a bounded strategic decision; per-ship transits remain raw analytics, not score fuel.
    const portalDeploymentScore = Math.min(4, state.playerWormholesCreated) * 12;
    const score = (outcome === "Victory" ? 100 : 0) + playerCaptures * 30 + state.shipsDestroyed + portalDeploymentScore - state.shipsLost + Math.max(0, 150 - duration) + state.gravityCaptures + state.deepSpaceCombats;
    state.outcomeScore = score;
    const run = {
      runId: crypto.randomUUID(), outcome, durationSeconds: duration, score, levelId: state.levelId, levelName: state.levelName, levelDifficulty: state.levelDifficulty, captures: state.captures, planetsCaptured: playerCaptures,
      launchEvents: state.launches, launchEventLog: state.launchEvents, largestLaunch: state.largestLaunch, peakFleetAdvantage: state.peakFleetAdvantage, shipsLaunched: state.shipsLaunched, averageLaunchSize, shipsPulled: state.shipsPulled, shipsLost: state.shipsLost,
      shipsDestroyed: state.shipsDestroyed, wormholesCreated: state.wormholesCreated, playerWormholesCreated: state.playerWormholesCreated, aiWormholesCreated: state.aiWormholesCreated, shipTransits: state.shipTransits, wormholeUses: state.wormholeUses, wormholeEvents: state.wormholeEvents, wormholePulls: Math.round(state.wormholePulls),
      peakPlayerShipCount: state.peakPlayerShips, gravityCaptures: state.gravityCaptures, blasterHits: state.blasterHits, deepSpaceCombats: state.deepSpaceCombats,
      wallBounces: state.wallBounces, enemyMajorLaunches: state.enemyMajorLaunches, shipCountTimeline: state.shipCountTimeline, ownershipTimeline: state.ownershipTimeline,
      heatmap: state.heatmap, mapSnapshot: buildRunMapSnapshot(), endedAt: state.endedAt.toISOString()
    };
    try {
      localStorage.setItem("gravityFleetRuns", JSON.stringify([run, ...loadLocalRuns()].slice(0, 5)));
    } catch {
      // The completed run remains available for this session if storage is unavailable or full.
    }
    ensureDashboardRendered(run);
    updateTelemetryBadgeVisibility();
    updateCommandDock();
    showOutcomeOverlay(run);
  }

  function lineChart(canvasEl, series, keys, pad = 28) {
    if (!canvasEl) return;
    const x = canvasEl.getContext("2d");
    x.clearRect(0, 0, canvasEl.width, canvasEl.height);
    x.strokeStyle = "rgba(255,255,255,.12)";
    x.strokeRect(pad, pad, canvasEl.width - pad * 1.5, canvasEl.height - pad * 1.7);
    const max = Math.max(1, ...series.flatMap(p => keys.map(k => p[k] || 0)));
    keys.forEach(k => {
      x.strokeStyle = colors[k] || colors.worm;
      x.lineWidth = 2;
      x.beginPath();
      (series.length ? series : [{ t: 0 }]).forEach((p, idx, arr) => {
        const px = pad + idx / Math.max(1, arr.length - 1) * (canvasEl.width - pad * 1.8);
        const py = canvasEl.height - pad - ((p[k] || 0) / max) * (canvasEl.height - pad * 2);
        x[idx ? "lineTo" : "moveTo"](px, py);
      });
      x.stroke();
    });
  }

  function barChart(canvasEl, events, keys) {
    if (!canvasEl) return;
    const x = canvasEl.getContext("2d");
    x.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const items = events.slice(-24);
    const max = Math.max(1, ...items.map(e => e.ships || 0));
    const gap = 3;
    const w = (canvasEl.width - gap * Math.max(0, items.length - 1)) / Math.max(1, items.length);
    items.forEach((e, i) => {
      const h = (e.ships || 0) / max * (canvasEl.height - 12);
      x.fillStyle = colors[e.team] || colors.gold;
      x.globalAlpha = keys.includes(e.team) ? .9 : .35;
      x.fillRect(i * (w + gap), canvasEl.height - h - 4, Math.max(2, w), h);
    });
    x.globalAlpha = 1;
  }

  function donutChart(canvasEl, planetValues, shipValues, keys) {
    if (!canvasEl) return;
    const x = canvasEl.getContext("2d");
    x.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const cx = canvasEl.width / 2;
    const cy = canvasEl.height / 2 + 2;
    const base = Math.min(canvasEl.width, canvasEl.height);
    const outerRadius = base * .39;
    const innerRadius = base * .25;
    const ringWidth = Math.max(8, base * .08);
    const gap = .035;
    const drawRing = (values, ringKeys, radius, alpha) => {
      const total = ringKeys.reduce((sum, key) => sum + (values[key] || 0), 0);
      x.lineWidth = ringWidth;
      x.lineCap = "round";
      x.strokeStyle = "rgba(255,255,255,.07)";
      x.beginPath();
      x.arc(cx, cy, radius, 0, TAU);
      x.stroke();
      if (!total) return;
      let angle = -Math.PI / 2;
      ringKeys.forEach(key => {
        const slice = (values[key] || 0) / total * TAU;
        if (slice <= 0) return;
        x.globalAlpha = alpha;
        x.strokeStyle = colors[key] || colors.neutral;
        x.beginPath();
        x.arc(cx, cy, radius, angle + gap, angle + Math.max(gap, slice - gap));
        x.stroke();
        angle += slice;
      });
      x.globalAlpha = 1;
    };
    drawRing(planetValues, keys, outerRadius, .92);
    drawRing(shipValues, contestTeamKeys, innerRadius, .82);
    const leading = keys.map(key => ({ key, value: planetValues[key] || 0 })).sort((a, b) => b.value - a.value)[0];
    const totalPlanets = Math.max(1, keys.reduce((sum, key) => sum + (planetValues[key] || 0), 0));
    x.fillStyle = "#f6f7ff";
    x.textAlign = "center";
    x.font = "900 10px sans-serif";
    x.fillText("SYSTEM", cx, cy - 2);
    x.fillStyle = colors[leading?.key] || colors.neutral;
    x.font = "800 9px sans-serif";
    x.fillText(`${Math.round((leading?.value || 0) / totalPlanets * 100)}%`, cx, cy + 11);
  }

  function liveTelemetrySignature(c) {
    const lastShipSnapshot = state.shipCountTimeline.at(-1) || {};
    const recentLaunch = state.launchEvents.at(-1) || {};
    const star = state.planets.find(p => p.isStar);
    return JSON.stringify([
      ...activeTeamKeys.flatMap(key => [c.teams[key]?.planets || 0, c.teams[key]?.ships || 0]),
      c.travelingShips, state.deepSpaceCombats, state.wormholesCreated, state.playerWormholesCreated, state.aiWormholesCreated, state.shipTransits, state.largestLaunch,
      state.shipCountTimeline.length, ...contestTeamKeys.map(key => lastShipSnapshot[key] || 0),
      state.launchEvents.length, recentLaunch.team || "", recentLaunch.ships || 0,
      star?.owner || "neutral", state.elapsed < state.liveSpikeUntil
    ]);
  }

  function updateLiveTelemetry(c = counts(), force = false) {
    const signature = liveTelemetrySignature(c);
    if (!force && signature === state.lastLiveSignature) return false;
    state.lastLiveSignature = signature;
    const deferCharts = usesMobilePresentation() && state.running && !state.ended && !state.dashboardRendered;
    if (!deferCharts) {
      const keys = contestTeamKeys;
      lineChart(ui.liveFleetChart, state.shipCountTimeline.slice(-40), keys, 8);
      barChart(ui.liveLaunchChart, state.launchEvents, keys);
      donutChart(ui.liveSystemDonut, Object.fromEntries(activeTeamKeys.map(key => [key, c.teams[key]?.planets || 0])), Object.fromEntries(contestTeamKeys.map(key => [key, c.teams[key]?.ships || 0])), activeTeamKeys);
    }
    const recentPlayerLaunch = [...state.launchEvents].reverse().find(e => e.team === "player")?.ships || 0;
    const star = state.planets.find(p => p.isStar);
    const starOwnerLabel = star ? teamLabel(star.owner) : "Neutral";
    if (ui.pressure) ui.pressure.innerHTML = [
      ["In flight", c.travelingShips], ["Last launch", recentPlayerLaunch], ["Fights", state.deepSpaceCombats],
      ["Star", starOwnerLabel], ["Portals deployed", `${state.wormholesCreated} total · ${state.playerWormholesCreated} Cyan / ${state.aiWormholesCreated} AI`], ["Ship transits", state.shipTransits], ["Max wave", state.largestLaunch]
    ].map(([label, value]) => `<div class="pressure-chip"><span>${label}</span><strong>${value}</strong></div>`).join("");
    if (ui.liveTelemetry) ui.liveTelemetry.classList.toggle("spike", state.elapsed < state.liveSpikeUntil);
    if (ui.launchPulse && state.elapsed >= state.liveSpikeUntil) ui.launchPulse.textContent = state.ended ? "Recorded" : "Streaming";
    return true;
  }

  let liveTelemetryTimer = 0;
  function scheduleLiveTelemetryUpdate() {
    window.clearTimeout(liveTelemetryTimer);
    const interval = usesMobilePresentation() ? liveTelemetryConfig.mobileIntervalMs : liveTelemetryConfig.desktopIntervalMs;
    liveTelemetryTimer = window.setTimeout(() => {
      if (!document.hidden && state?.running && !state.ended) updateLiveTelemetry();
      scheduleLiveTelemetryUpdate();
    }, interval);
  }

  function captureLabel(planetId) {
    return planetId === "star" ? "the central star" : String(planetId || "unknown body").toUpperCase();
  }

  function largestRecordedTurningPoint(run) {
    const ships = Array.isArray(run.shipCountTimeline) ? run.shipCountTimeline : [];
    const ownership = Array.isArray(run.ownershipTimeline) ? run.ownershipTimeline : [];
    let largest = null;
    for (let index = 1; index < Math.min(ships.length, ownership.length); index++) {
      const previousFleetMargin = (ships[index - 1].player || 0) - Math.max(ships[index - 1].enemy || 0, ships[index - 1].orange || 0);
      const fleetMargin = (ships[index].player || 0) - Math.max(ships[index].enemy || 0, ships[index].orange || 0);
      const previousOwnershipMargin = (ownership[index - 1].player || 0) - ((ownership[index - 1].enemy || 0) + (ownership[index - 1].orange || 0));
      const ownershipMargin = (ownership[index].player || 0) - ((ownership[index].enemy || 0) + (ownership[index].orange || 0));
      const fleetDelta = fleetMargin - previousFleetMargin;
      const ownershipDelta = ownershipMargin - previousOwnershipMargin;
      const magnitude = Math.abs(fleetDelta) + Math.abs(ownershipDelta) * 12;
      if (!largest || magnitude > largest.magnitude) largest = { t: ships[index].t, fleetDelta, ownershipDelta, magnitude };
    }
    if (!largest?.magnitude) return "Turning point: the sampled fleet and ownership margins stayed nearly level throughout the run.";
    const direction = largest.fleetDelta >= 0 ? "improved" : "fell";
    const ownershipNote = largest.ownershipDelta
      ? `; the ownership margin ${largest.ownershipDelta > 0 ? "improved" : "fell"} by ${Math.abs(largest.ownershipDelta)}`
      : "";
    return `Largest recorded swing: near ${fmt(largest.t)}, Cyan's fleet margin ${direction} by ${Math.abs(largest.fleetDelta)} ships between telemetry samples${ownershipNote}.`;
  }

  function replaySuggestion(run) {
    const playerCaptures = (run.captures || []).filter(capture => capture.owner === "player");
    const capturedStar = playerCaptures.some(capture => capture.planet === "star");
    if (run.levelId === 2) {
      return shipTransitCount(run)
        ? "Replay idea for Wide Periapsis: place the first wormhole toward an outer neutral route, then compare whether the first Cyan capture arrives sooner."
        : "Replay idea for Wide Periapsis: test one early wormhole toward a distant neutral body and compare the opening capture time with this run.";
    }
    if (run.levelId === 3) {
      return run.shipsLost > run.shipsDestroyed
        ? "Replay idea for Broken Helix: consolidate the first two gains before committing across another long lane, then compare the ship-loss exchange."
        : "Replay idea for Broken Helix: protect the stronger exchange by staging the next push from two nearby Cyan planets instead of one long route.";
    }
    return capturedStar
      ? "Replay idea for First Orbit: repeat the central-star capture, then test a smaller follow-up wave to see whether Cyan retains more ships."
      : "Replay idea for First Orbit: secure a nearby neutral body first, then contest the central star and compare the opening capture time.";
  }

  function buildRunInsights(run) {
    const captures = (run.captures || []).filter(capture => capture.owner === "player").sort((a, b) => a.t - b.t);
    const playerLaunches = (run.launchEventLog || []).filter(event => event.team === "player").sort((a, b) => a.t - b.t);
    const firstCapture = captures[0];
    const firstLaunch = playerLaunches[0];
    const opening = firstCapture
      ? `Opening pace: Cyan's first capture was ${captureLabel(firstCapture.planet)} at ${fmt(firstCapture.t)}, after ${playerLaunches.filter(event => event.t <= firstCapture.t).length} recorded launch actions.`
      : firstLaunch
        ? `Opening pace: the first Cyan launch was recorded at ${fmt(firstLaunch.t)}, but no Cyan capture followed before the match ended.`
        : "Opening pace: no Cyan launch or capture was recorded before the match ended.";
    const exchangeRecord = run.shipsLost
      ? `${run.shipsDestroyed || 0} ships destroyed for ${run.shipsLost} lost (${(run.shipsDestroyed / run.shipsLost).toFixed(2)} exchange ratio)`
      : `${run.shipsDestroyed || 0} ships destroyed with no Cyan losses recorded`;
    const efficiency = `Fleet efficiency: ${exchangeRecord}, with an average Cyan launch of ${run.averageLaunchSize || 0} ships.`;
    const sequence = captures.length
      ? `Capture sequence: ${captures.slice(0, 4).map(capture => `${captureLabel(capture.planet)} at ${fmt(capture.t)}`).join(", ")}${captures.length > 4 ? `, plus ${captures.length - 4} later capture${captures.length - 4 === 1 ? "" : "s"}` : ""}.`
      : "Capture sequence: Cyan recorded no completed captures in this run.";
    const combat = `Combat record: ${run.deepSpaceCombats || 0} deep-space fights, ${run.blasterHits || 0} blaster hits, and ${run.enemyMajorLaunches || 0} major AI assaults were recorded; the final outcome was ${run.outcome}.`;
    const playerPortals = playerPortalCount(run);
    const aiPortals = aiPortalCount(run);
    const transits = shipTransitCount(run);
    const portalDetail = `${playerPortals} Cyan portal${playerPortals === 1 ? "" : "s"} deployed${aiPortals ? ` and ${aiPortals} AI portal${aiPortals === 1 ? "" : "s"} deployed` : ""}`;
    const wormholes = transits
      ? `Wormhole telemetry: ${portalDetail}; ${transits} ship transit${transits === 1 ? "" : "s"} and ${run.wormholePulls || 0} ship pulls were recorded.`
      : `Wormhole telemetry: ${portalDetail}; no ship transits were recorded.`;
    return [opening, efficiency, sequence, combat, wormholes, largestRecordedTurningPoint(run), replaySuggestion(run)];
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function loadLocalRuns() {
    try {
      const runs = JSON.parse(localStorage.getItem("gravityFleetRuns") || "[]");
      return Array.isArray(runs) ? runs.filter(run => run && typeof run === "object") : [];
    } catch {
      return [];
    }
  }

  function runIdentity(run, index = 0) {
    return String(run?.runId || run?.endedAt || `legacy-run-${index}`);
  }

  function formatRunTimestamp(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "Timestamp unavailable";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function runFacts(run) {
    return [
      ["Level", run.levelName || `Level ${run.levelId || "?"}`],
      ["Outcome", run.outcome || "Unknown"],
      ["Score", run.score ?? 0],
      ["Duration", fmt(run.durationSeconds || 0)],
      ["Time", formatRunTimestamp(run.endedAt)]
    ];
  }

  function runCardMarkup(run, { source, name, rank = null, selected = false, button = false, runId = "" } = {}) {
    const tag = button ? "button" : "article";
    const attributes = button ? ` type="button" data-run-id="${escapeHtml(runId)}" aria-pressed="${selected}"` : "";
    return `<${tag} class="run-card${selected ? " is-selected" : ""}"${attributes}>
      <span class="run-card-head">${rank == null ? "" : `<span class="run-rank">#${rank}</span>`}<strong>${escapeHtml(name || run.levelName || "Recorded run")}</strong><span class="run-source">${escapeHtml(source)}</span></span>
      <span class="run-card-facts">${runFacts(run).map(([label, value]) => `<span><small>${label}</small><b>${escapeHtml(value)}</b></span>`).join("")}</span>
    </${tag}>`;
  }

  function loadBenchmarkRuns() {
    if (!benchmarkRunsPromise) {
      benchmarkRunsPromise = fetch("/data/gravity-fleet-sample-runs.json")
        .then(response => {
          if (!response.ok) throw new Error(`Benchmark request failed: ${response.status}`);
          return response.json();
        })
        .then(runs => Array.isArray(runs) ? runs : [])
        .catch(() => null);
    }
    return benchmarkRunsPromise;
  }

  function normalizeRunHeatmap(run) {
    const candidate = run?.heatmap;
    const validDimensions = candidate
      && Number.isInteger(candidate.width) && candidate.width > 0 && candidate.width <= 64
      && Number.isInteger(candidate.height) && candidate.height > 0 && candidate.height <= 40
      && candidate.width * candidate.height <= 2560;
    if (validDimensions) {
      const size = candidate.width * candidate.height;
      const movement = Array.isArray(candidate.movement) ? candidate.movement.slice(0, size) : [];
      const combat = Array.isArray(candidate.combat) ? candidate.combat.slice(0, size) : [];
      while (movement.length < size) movement.push(0);
      while (combat.length < size) combat.push(0);
      return { width: candidate.width, height: candidate.height, movement, combat };
    }
    if (Array.isArray(run?.heat) && run.heat.length) {
      const width = 12;
      const height = Math.ceil(run.heat.length / width);
      return { width, height, movement: run.heat.slice(), combat: Array(width * height).fill(0) };
    }
    return { width: HEATMAP_WIDTH, height: HEATMAP_HEIGHT, movement: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0), combat: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0) };
  }

  function mapSnapshotForRun(run) {
    if (run?.mapSnapshot?.planets?.length) return run.mapSnapshot;
    const level = LEVELS.find(candidate => candidate.id === Number(run?.levelId)) || LEVELS[0];
    return buildRunMapSnapshot(level, generatePlanets(level));
  }

  function heatRegionLabel(index, width, height) {
    const x = index % width;
    const y = Math.floor(index / width);
    const horizontal = x < width / 3 ? "left" : x >= width * 2 / 3 ? "right" : "center";
    const vertical = y < height / 3 ? "upper" : y >= height * 2 / 3 ? "lower" : "middle";
    return horizontal === "center" && vertical === "middle" ? "center" : `${vertical}-${horizontal}`;
  }

  function describeHeatmap(run, mode, heatmap, mapSnapshot) {
    const layer = heatmap[mode] || [];
    const ranked = layer.map((value, index) => ({ value: Number(value) || 0, index })).filter(point => point.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
    if (!ranked.length) return `No ${mode} intensity was recorded for this run.`;
    const descriptions = [...new Set(ranked.map(point => {
      const nx = (point.index % heatmap.width + .5) / heatmap.width;
      const ny = (Math.floor(point.index / heatmap.width) + .5) / heatmap.height;
      const nearest = (mapSnapshot.planets || []).map(planet => ({ planet, distance: Math.hypot(planet.x - nx, planet.y - ny) })).sort((a, b) => a.distance - b.distance)[0];
      const near = nearest && nearest.distance < .2 ? ` near ${nearest.planet.isStar ? "the central star" : nearest.planet.id.toUpperCase()}` : "";
      return `${heatRegionLabel(point.index, heatmap.width, heatmap.height)}${near}`;
    }))];
    const label = mode === "combat" ? "Combat" : "Movement";
    return `${label} activity was hottest in ${descriptions.join(", ")}.`;
  }

  function drawRunHeatmap(run) {
    if (!ui.heatmap) return;
    const heatmap = normalizeRunHeatmap(run);
    const mapSnapshot = mapSnapshotForRun(run);
    const layer = heatmap[heatmapMode] || [];
    const drawing = ui.heatmap.getContext("2d");
    const width = ui.heatmap.width;
    const height = ui.heatmap.height;
    drawing.clearRect(0, 0, width, height);
    const background = drawing.createRadialGradient(width * .5, height * .46, 12, width * .5, height * .46, width * .62);
    background.addColorStop(0, "rgba(20,34,62,.98)");
    background.addColorStop(1, "rgba(4,7,18,.99)");
    drawing.fillStyle = background;
    drawing.fillRect(0, 0, width, height);
    drawing.save();
    drawing.setLineDash([5, 7]);
    drawing.strokeStyle = "rgba(159,180,255,.2)";
    drawing.lineWidth = 1;
    (mapSnapshot.orbits || []).forEach(orbit => {
      drawing.beginPath();
      drawing.ellipse(orbit.cx * width, orbit.cy * height, orbit.rx * width, orbit.ry * height, 0, 0, TAU);
      drawing.stroke();
    });
    drawing.restore();
    const max = Math.max(0, ...layer.map(value => Number(value) || 0));
    if (max > 0) {
      const cellWidth = width / heatmap.width;
      const cellHeight = height / heatmap.height;
      layer.forEach((value, index) => {
        const intensity = clamp((Number(value) || 0) / max, 0, 1);
        if (intensity <= 0) return;
        const x = (index % heatmap.width + .5) * cellWidth;
        const y = (Math.floor(index / heatmap.width) + .5) * cellHeight;
        const radius = Math.max(cellWidth, cellHeight) * (1.15 + intensity * 1.25);
        const glow = drawing.createRadialGradient(x, y, 0, x, y, radius);
        const rgb = heatmapMode === "combat" ? "255,93,158" : "111,248,255";
        glow.addColorStop(0, `rgba(${rgb},${.18 + intensity * .68})`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        drawing.fillStyle = glow;
        drawing.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });
    }
    (mapSnapshot.planets || []).forEach(planet => {
      const x = planet.x * width;
      const y = planet.y * height;
      const radius = Math.max(4, planet.radius * width);
      drawing.fillStyle = alphaColor(colors[planet.owner] || colors.neutral, planet.isStar ? .92 : .72);
      drawing.strokeStyle = planet.isStar ? colors.gold : colors[planet.owner] || colors.neutral;
      drawing.lineWidth = planet.isStar ? 2.5 : 1.4;
      drawing.beginPath();
      drawing.arc(x, y, radius, 0, TAU);
      drawing.fill();
      drawing.stroke();
      drawing.fillStyle = "#f6f7ff";
      drawing.font = "800 9px sans-serif";
      drawing.textAlign = "center";
      drawing.fillText(planet.isStar ? "STAR" : String(planet.id).toUpperCase(), x, y + radius + 11);
    });
    ui.heatmap.setAttribute("aria-label", `${heatmapMode === "combat" ? "Combat" : "Movement"} minimap heatmap for ${run.levelName || "the selected level"}`);
    setText(ui.heatmapSummary, describeHeatmap(run, heatmapMode, heatmap, mapSnapshot));
    ui.heatmapControls?.querySelectorAll("[data-heatmap-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.heatmapMode === heatmapMode)));
  }

  function renderRecentRuns(selectedRunId) {
    const runs = loadLocalRuns();
    if (ui.clearRecent) ui.clearRecent.hidden = runs.length === 0;
    if (!runs.length) {
      ui.recent.innerHTML = '<p class="dashboard-empty-state">No local runs yet. Complete a match to save one in this browser.</p>';
      return;
    }
    ui.recent.innerHTML = runs.map((run, index) => {
      const id = runIdentity(run, index);
      return runCardMarkup(run, { source: "Local run", selected: id === selectedRunId, button: true, runId: id });
    }).join("");
  }

  function renderBenchmarkRuns(samples, run) {
    if (samples === null) {
      ui.leaderboard.innerHTML = '<p class="dashboard-empty-state">Mock benchmark data could not be loaded.</p>';
      return;
    }
    if (!samples.length) {
      ui.leaderboard.innerHTML = '<p class="dashboard-empty-state">No mock benchmark runs are available yet.</p>';
      return;
    }
    const percentile = Math.round(samples.filter(sample => Number(sample.score) <= Number(run.score)).length / samples.length * 100);
    const ranked = [...samples.map(sample => ({ ...sample, benchmark: true })), { name: "Selected run", ...run, current: true }].sort((a, b) => Number(b.score) - Number(a.score));
    const rank = ranked.findIndex(candidate => candidate.current) + 1;
    ui.leaderboard.innerHTML = `<p class="benchmark-context">Selected run ranks #${rank} of ${ranked.length} and scores at the ${percentile}th percentile of the ${samples.length}-run mock benchmark.</p>${ranked.map((candidate, index) => runCardMarkup(candidate, { source: candidate.current ? "Selected local run" : "Mock benchmark", name: candidate.name, rank: index + 1, selected: candidate.current })).join("")}`;
  }

  function ensureDashboardRendered(run) {
    if (!run) return Promise.resolve();
    const runId = runIdentity(run);
    if (dashboardRunId === runId && dashboardRenderPromise) return dashboardRenderPromise;
    dashboardRunId = runId;
    dashboardRun = run;
    state.dashboardRendered = true;
    dashboardRenderPromise = renderDashboard(run);
    return dashboardRenderPromise;
  }

  async function renderDashboard(run) {
    ui.empty.hidden = true;
    ui.dashboard.hidden = false;
    ui.kpis.innerHTML = [
      ["Level", run.levelName || "Classic"], ["Outcome", run.outcome], ["Final score", run.score], ["Duration", fmt(run.durationSeconds)], ["Planets captured", run.planetsCaptured],
      ["Launch actions", run.launchEvents], ["Largest launch", run.largestLaunch || 0], ["Avg launch", run.averageLaunchSize], ["Peak advantage", run.peakFleetAdvantage || 0], ["Ships destroyed", run.shipsDestroyed], ["Deep-space fights", run.deepSpaceCombats], ["Cyan portals deployed", playerPortalCount(run)], ["AI portals deployed", aiPortalCount(run)], ["Ship transits", shipTransitCount(run)]
    ].map(([a, b]) => `<article class="kpi-card"><span>${a}</span><strong>${b}</strong></article>`).join("");
    lineChart(ui.shipChart, run.shipCountTimeline || [], contestTeamKeys);
    lineChart(ui.ownerChart, run.ownershipTimeline || [], activeTeamKeys);
    drawRunHeatmap(run);
    const matchEvents = [
      ...(run.captures || []).map(c => ({ t: c.t, label: `${teamMeta[c.owner]?.label || c.owner} capture`, detail: c.planet })),
      ...(run.launchEventLog || []).filter(e => e.major || e.team === "player").map(e => ({ t: e.t, label: `${teamMeta[e.team]?.label || e.team} launch`, detail: `${e.ships} ships${e.targetPlanetId ? ` → ${e.targetPlanetId}` : ""}` })),
      ...(run.wormholeEvents || []).map(event => ({ t: event.t, label: `${teamMeta[event.owner]?.label || event.owner} portal deployed`, detail: "one-way wormhole stabilized" }))
    ].sort((a, b) => a.t - b.t).slice(0, 12);
    ui.captures.innerHTML = (matchEvents.length ? matchEvents : [{ t: 0, label: "No major events", detail: "Keep pressuring the map" }]).map((e, i) => `<div class="board-row"><span>${i + 1}</span><strong>${e.label}</strong><span>${e.t}s · ${e.detail}</span></div>`).join("");
    ui.insights.innerHTML = buildRunInsights(run).map(insight => `<li>${insight}</li>`).join("");
    renderRecentRuns(dashboardRunId);
    const samples = await loadBenchmarkRuns();
    if (dashboardRunId !== runIdentity(run)) return;
    renderBenchmarkRuns(samples, run);
  }

  function drawEffects() {
    state.effects.forEach(e => {
      const alpha = clamp(e.ttl / e.maxTtl, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = e.color;
      ctx.fillStyle = e.color;
      if (e.type === "blast" || e.type === "burst") {
        ctx.lineWidth = e.type === "blast" ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(e.x1, e.y1, 2 + (1 - alpha) * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawLauncherOverlay() {
    const l = state.launcher;
    if (!l?.active) return;
    const strength = clamp(l.aimVector.len / l.radius, .08, 1);
    const selected = selectedLauncherShips();
    const layers = [...new Set(selected.map(s => s.formationLayer || 0))];
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(0,8,18,${.42 + strength * .18})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(l.origin.x, l.origin.y, l.radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(111,248,255,${.24 + strength * .22})`;
    ctx.fillStyle = `rgba(111,248,255,${.035 + strength * .045})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(l.origin.x, l.origin.y, l.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();

    layers.forEach(layer => {
      ctx.strokeStyle = `rgba(111,248,255,${.18 - Math.min(.1, layer * .025)})`;
      ctx.beginPath();
      ctx.arc(l.lockedPointer.x, l.lockedPointer.y, 20 + layer * 11, 0, TAU);
      ctx.stroke();
    });
    ctx.strokeStyle = `rgba(199,125,255,${.24 + strength * .32})`;
    ctx.beginPath();
    ctx.arc(l.lockedPointer.x, l.lockedPointer.y, levelPullRadius(), 0, TAU);
    ctx.stroke();

    const end = l.lockedPointer;
    const a = Math.atan2(end.y - l.origin.y, end.x - l.origin.x);
    ctx.strokeStyle = "rgba(0,8,18,.78)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(l.origin.x, l.origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(111,248,255,${.52 + strength * .48})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(l.origin.x, l.origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      if (i / 4 > strength + .06) continue;
      const t = i / 4;
      const px = l.origin.x + (end.x - l.origin.x) * t;
      const py = l.origin.y + (end.y - l.origin.y) * t;
      ctx.strokeStyle = "rgba(0,8,18,.72)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a + Math.PI / 2) * 4, py + Math.sin(a + Math.PI / 2) * 4);
      ctx.lineTo(px + Math.cos(a - Math.PI / 2) * 4, py + Math.sin(a - Math.PI / 2) * 4);
      ctx.stroke();
      ctx.strokeStyle = colors.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,8,18,.82)";
    ctx.beginPath();
    ctx.arc(l.origin.x, l.origin.y, 5, 0, TAU);
    ctx.arc(end.x, end.y, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(l.origin.x, l.origin.y, 5, 0, TAU);
    ctx.arc(end.x, end.y, 8, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x + Math.cos(a) * 2, end.y + Math.sin(a) * 2);
    ctx.lineTo(end.x - Math.cos(a - .5) * 17, end.y - Math.sin(a - .5) * 17);
    ctx.lineTo(end.x - Math.cos(a + .5) * 17, end.y - Math.sin(a + .5) * 17);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,8,18,.82)";
    ctx.fill();
    ctx.strokeStyle = colors.player;
    ctx.stroke();
    ctx.restore();
  }

  function drawWormDrag() {
    const drag = state.wormDrag;
    if (!drag?.active) return;
    const end = drag.endpoint || clampedWormholeEndpoint(drag.start, drag.current);
    const validLength = end.length >= 24;
    const color = validLength ? colors.worm : colors.danger;
    ctx.save();
    ctx.strokeStyle = validLength ? "rgba(199,125,255,.25)" : "rgba(255,109,122,.22)";
    ctx.beginPath();
    ctx.arc(drag.start.x, drag.start.y, drag.maxRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drag.start.x, drag.start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    [drag.start, end].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke(); });
    ctx.restore();
  }

  function drawOutcomeOverlay() {
    if (!state.ended) return;
    const pulse = reduced ? .5 : (Math.sin(performance.now() / 320) + 1) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(5,8,20,.46)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = state.outcome === "Victory" ? colors.player : colors.enemy;
    ctx.globalAlpha = .28 + pulse * .26;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 94 + pulse * 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f6f7ff";
    ctx.textAlign = "center";
    ctx.font = "700 34px sans-serif";
    ctx.fillText(state.outcome === "Victory" ? "SYSTEM CLAIMED" : "FLEET LOST", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "15px sans-serif";
    ctx.fillText(`${fmt(state.elapsed)} · Score ${state.outcomeScore}`, canvas.width / 2, canvas.height / 2 + 24);
    ctx.restore();
  }

  function drawWormholes() {
    (state.wormholes || []).forEach(wormhole => {
      const teamColor = colors[wormhole.owner] || colors.player;
      const endpoints = [
        { point: wormhole.a, enabled: wormhole.aEntryEnabled, exit: wormhole.b, offset: 0 },
        { point: wormhole.b, enabled: wormhole.bEntryEnabled, exit: wormhole.a, offset: Math.PI }
      ];
      endpoints.forEach(({ point, enabled, exit, offset }) => {
        const swirl = (wormhole.spin + offset) % TAU;
        ctx.save();
        ctx.globalAlpha = enabled ? 1 : .42;
        if (enabled) {
          ctx.strokeStyle = alphaColor(teamColor, .16);
          ctx.shadowColor = teamColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(point.x, point.y, levelWormInfluence(), 0, TAU);
          ctx.stroke();
        }
        ctx.setLineDash(enabled ? [] : [5, 6]);
        ctx.strokeStyle = colors.worm;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 24, swirl, swirl + Math.PI * 1.45);
        ctx.stroke();
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = enabled ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 14, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        if (enabled) {
          const dir = norm(exit.x - point.x, exit.y - point.y);
          ctx.strokeStyle = teamColor;
          ctx.globalAlpha = .58;
          ctx.beginPath();
          ctx.moveTo(point.x + dir.x * 31, point.y + dir.y * 31);
          ctx.lineTo(point.x + dir.x * 52, point.y + dir.y * 52);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(point.x + dir.x * 56, point.y + dir.y * 56);
          ctx.lineTo(point.x + dir.x * 45 - dir.y * 5, point.y + dir.y * 45 + dir.x * 5);
          ctx.lineTo(point.x + dir.x * 45 + dir.y * 5, point.y + dir.y * 45 - dir.x * 5);
          ctx.closePath();
          ctx.fillStyle = teamColor;
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(223,232,255,.5)";
          ctx.beginPath();
          ctx.moveTo(point.x - 8, point.y + 8);
          ctx.lineTo(point.x + 8, point.y - 8);
          ctx.stroke();
        }
        ctx.restore();
      });
    });
  }


  function drawOrbitPaths(drawing = ctx) {
    const paths = Object.values(makeOrbitPaths());
    drawing.save();
    paths.forEach((path, index) => {
      drawing.strokeStyle = index === 1 ? "rgba(111,248,255,.115)" : "rgba(223,232,255,.075)";
      drawing.lineWidth = index === 1 ? 1.25 : 1;
      drawing.setLineDash(index === 1 ? [3, 9] : [2, 12]);
      drawing.beginPath();
      const steps = 160;
      for (let i = 0; i <= steps; i++) {
        const point = positionOnOrbit(path, i / steps * TAU);
        drawing[i ? "lineTo" : "moveTo"](point.x, point.y);
      }
      drawing.closePath();
      drawing.stroke();
      drawing.setLineDash([]);
      for (let i = 0; i < 12; i++) {
        const point = positionOnOrbit(path, i / 12 * TAU + path.phase * .35);
        drawing.fillStyle = index === 1 ? "rgba(111,248,255,.16)" : "rgba(223,232,255,.1)";
        drawing.beginPath();
        drawing.arc(point.x, point.y, index === 1 ? 1.7 : 1.25, 0, TAU);
        drawing.fill();
      }
    });
    drawing.restore();
  }

  function ensureStaticMapLayer() {
    const levelKey = `${activeLevel().id}:${canvas.width}x${canvas.height}`;
    if (staticMapLayer && staticMapLayerLevel === levelKey) return staticMapLayer;
    staticMapLayer ||= document.createElement("canvas");
    staticMapLayer.width = canvas.width;
    staticMapLayer.height = canvas.height;
    const drawing = staticMapLayer.getContext("2d");
    drawing.clearRect(0, 0, staticMapLayer.width, staticMapLayer.height);
    drawing.strokeStyle = "rgba(111,248,255,.08)";
    for (let x = 0; x < staticMapLayer.width; x += 60) { drawing.beginPath(); drawing.moveTo(x, 0); drawing.lineTo(x, staticMapLayer.height); drawing.stroke(); }
    for (let y = 0; y < staticMapLayer.height; y += 60) { drawing.beginPath(); drawing.moveTo(0, y); drawing.lineTo(staticMapLayer.width, y); drawing.stroke(); }
    drawing.strokeStyle = "rgba(111,248,255,.22)";
    drawing.strokeRect(levelWorldBounds().x + 1, levelWorldBounds().y + 1, levelWorldBounds().width - 2, levelWorldBounds().height - 2);
    drawOrbitPaths(drawing);
    staticMapLayerLevel = levelKey;
    return staticMapLayer;
  }

  function drawAiLaunchFields() {
    (state.aiLaunchFields || []).forEach(field => {
      const color = colors[field.team] || colors.enemy;
      const t = clamp(field.charge / Math.max(.1, field.chargeDuration), 0, 1);
      const aim = norm(field.aimTarget.x - field.origin.x, field.aimTarget.y - field.origin.y);
      ctx.save();
      ctx.globalAlpha = .35 + t * .35;
      ctx.strokeStyle = alphaColor(color, .85);
      ctx.fillStyle = alphaColor(color, .12);
      ctx.lineWidth = 1.5 + t;
      ctx.beginPath();
      ctx.arc(field.origin.x, field.origin.y, 18 + t * 8, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(field.origin.x, field.origin.y);
      ctx.lineTo(field.aimTarget.x, field.aimTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(field.aimTarget.x, field.aimTarget.y);
      ctx.lineTo(field.aimTarget.x - aim.x * 16 - aim.y * 6, field.aimTarget.y - aim.y * 16 + aim.x * 6);
      ctx.lineTo(field.aimTarget.x - aim.x * 16 + aim.y * 6, field.aimTarget.y - aim.y * 16 - aim.x * 6);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(ensureStaticMapLayer(), 0, 0);

    state.planets.forEach(p => {
      const influence = bodyInfluence(p);
      ctx.strokeStyle = "rgba(255,255,255,.055)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, influence, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (pendingWorm) { ctx.strokeStyle = colors.worm; ctx.beginPath(); ctx.arc(pendingWorm.x, pendingWorm.y, 18, 0, Math.PI * 2); ctx.stroke(); }
    drawWormholes();
    drawAiLaunchFields();
    drawWormDrag();

    state.planets.forEach(p => {
      const ownerColor = colors[p.owner] || colors.neutral;
      if (p.isStar) {
        const glow = 18 + Math.sin(p.pulse * 2.6) * 4;
        ctx.save();
        ctx.shadowColor = colors.gold;
        ctx.shadowBlur = 24;
        ctx.fillStyle = "rgba(255,229,138,.2)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = p.isStar ? colors.gold : ownerColor;
      ctx.fillStyle = p.isStar ? "rgba(255,229,138,.16)" : ownerColor;
      ctx.globalAlpha = p.isStar ? .72 : .18;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 14 + Math.sin(p.pulse * 3) * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      if (p.isStar && p.owner !== "neutral") {
        ctx.strokeStyle = ownerColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      contestTeamKeys.forEach(owner => {
        if ((p.capture[owner] || 0) > 0) {
          ctx.strokeStyle = colors[owner];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + 7, -Math.PI / 2, -Math.PI / 2 + (p.capture[owner] || 0) / (p.isStar ? 58 : 55) * Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      });
      ctx.fillStyle = "#f6f7ff";
      ctx.font = "12px sans-serif";
      ctx.fillText(p.id.toUpperCase(), p.x - 10, p.y + 4);
    });

    drawLauncherOverlay();

    state.ships.forEach(s => {
      if (allowsShipTrails() && s.trail?.length > 1) {
        ctx.strokeStyle = colors[s.owner] + "2b";
        ctx.beginPath();
        s.trail.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y));
        ctx.stroke();
      }
      if (s.state === "pointerOrbit" && state.launcher) {
        ctx.strokeStyle = "rgba(111,248,255,.16)";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(state.launcher.lockedPointer.x, state.launcher.lockedPointer.y);
        ctx.stroke();
      }
      if (!reduced && s.state === "wormholeOrbit" && s.wormholeEntry) {
        ctx.strokeStyle = "rgba(199,125,255,.26)";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.wormholeEntry.x, s.wormholeEntry.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s.wormholeEntry.x, s.wormholeEntry.y, s.wormholeOrbitRadius || 16, 0, TAU);
        ctx.stroke();
      }
      if (!reduced && s.state === "wormholeTransit" && s.wormholeEntry && s.wormholeExit) {
        ctx.strokeStyle = "rgba(199,125,255,.34)";
        ctx.beginPath();
        ctx.moveTo(s.wormholeEntry.x, s.wormholeEntry.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.fillStyle = colors[s.owner];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.state === "pointerOrbit" || s.state === "wormholeOrbit" ? 4.6 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    drawEffects();
    drawOutcomeOverlay();
    lastSuccessfulDrawAt = performance.now();
  }

  canvas.addEventListener("contextmenu", event => event.preventDefault());
  canvas.addEventListener("pointerdown", event => {
    if (!state.acceptingInput || mobileDrawerOpen) return;
    const point = canvasPoint(event);
    const coarse = usesCoarseTargets(event);
    if (event.button === 2) {
      const hit = hitPlayerWormholeEntrance(point);
      if (hit) { deletePlayerWormhole(hit.wormhole); return; }
      startWormDrag(point);
      activePointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    const wormHit = hitPlayerWormholeEntrance(point);
    if (wormHit) { toggleWormholeEntrance(wormHit); return; }
    if (wormMode) { placeWormFallback(point); return; }
    if (!createLauncher(point, coarse)) return;
    activePointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    if (coarse) event.preventDefault();
  });
  canvas.addEventListener("pointermove", event => {
    const point = canvasPoint(event);
    if (state.wormDrag?.active) { updateWormDrag(point); event.preventDefault(); return; }
    if (state.launcher?.active) { updateLauncher(point, 0); event.preventDefault(); }
  });
  canvas.addEventListener("pointerup", event => {
    const point = canvasPoint(event);
    if (state.wormDrag?.active) { updateWormDrag(point); finalizeWormDrag(); releaseActivePointerCapture(); return; }
    if (!state.launcher?.active) return;
    updateLauncher(point, 0);
    releaseLauncher();
    releaseActivePointerCapture();
  });
  canvas.addEventListener("pointercancel", () => cancelActiveGesture());
  canvas.addEventListener("lostpointercapture", () => { activePointerId = null; });

  function beginMatch() {
    hideOutcomeOverlay();
    if (state.running) return;
    state.running = true;
    state.acceptingInput = false;
    state.startedAt = new Date();
    state.lastTick = performance.now();
    lastProcessedFrameAt = 0;
    mobilePresentationDismissed = false;
    hideGameOverlays();
    snapshot();
    updateLiveTelemetry();
    addEvent("Match started. Hold left click to form a launch field; right-click drag to place a wormhole.");
    addEvent("The neutral central star is capturable and anchors the system.");
    updateTelemetryBadgeVisibility();
    updateHud(undefined, true);
    if (usesMobilePresentation()) {
      beginMobileShell();
      return;
    }
    mobileShellState = "idle";
    state.acceptingInput = true;
    syncMobilePresentation();
    scrollGameIntoView();
  }

  ui.liveTelemetryBadge?.addEventListener("click", scrollLiveTelemetryIntoView);
  ui.heatmapControls?.addEventListener("click", event => {
    const button = event.target.closest("[data-heatmap-mode]");
    if (!button || !dashboardRun) return;
    heatmapMode = button.dataset.heatmapMode === "combat" ? "combat" : "movement";
    drawRunHeatmap(dashboardRun);
  });
  ui.recent?.addEventListener("click", event => {
    const button = event.target.closest("[data-run-id]");
    if (!button) return;
    const run = loadLocalRuns().find((candidate, index) => runIdentity(candidate, index) === button.dataset.runId);
    if (!run) {
      setText(ui.recentStatus, "That local run is no longer available.");
      renderRecentRuns(dashboardRunId);
      return;
    }
    setText(ui.recentStatus, `Showing ${run.levelName || "recorded run"} from ${formatRunTimestamp(run.endedAt)}.`);
    ensureDashboardRendered(run);
  });
  ui.clearRecent?.addEventListener("click", () => {
    if (!loadLocalRuns().length) return;
    if (!window.confirm("Clear all Gravity Fleet runs saved in this browser? This cannot be undone.")) return;
    localStorage.removeItem("gravityFleetRuns");
    renderRecentRuns(dashboardRunId);
    setText(ui.recentStatus, "Local run history cleared.");
    ui.recent?.focus({ preventScroll: true });
  });
  ui.backToGame?.addEventListener("click", () => {
    scrollGameIntoView();
    if (state?.ended && completedRun) showOutcomeOverlay(completedRun);
    else canvas.focus({ preventScroll: true });
    setBackToGameVisible(false);
  });

  function startSelectedLevel() {
    reset();
    showTutorialOverlay();
    updateCommandDock();
  }

  async function viewMatchAnalysisAction() {
    const run = completedRun;
    await ensureDashboardRendered(run);
    hideOutcomeOverlay();
    mobilePresentationDismissed = true;
    closeMobileTelemetryDrawer();
    restoreGameStage();
    syncMobilePresentation();
    updateLiveTelemetry(counts(), true);
    if (ui.analyticsTitle && !ui.analyticsTitle.hasAttribute("tabindex")) ui.analyticsTitle.setAttribute("tabindex", "-1");
    scrollElementWithOffset(ui.analytics, gravityDevSettings.navigation.matchAnalysisOffset);
    ui.analyticsTitle?.focus({ preventScroll: true });
  }

  function returnToMissionSetupAction() {
    scrollGameIntoView();
    const selectedButton = ui.levelPicker?.querySelector(`[data-level-id="${selectedLevelId}"]`);
    (selectedButton || ui.start)?.focus({ preventScroll: true });
  }

  function playAgainAction() {
    const levelId = selectedLevelId;
    hideOutcomeOverlay();
    selectedLevelId = levelId;
    reset(false);
    beginMatch();
    canvas.focus({ preventScroll: true });
  }

  function chooseLevelAction() {
    const levelId = selectedLevelId;
    hideOutcomeOverlay();
    selectedLevelId = levelId;
    reset(true);
    setOverlayVisible(ui.tutorial, false);
    scrollGameIntoView();
    updateCommandDock();
    const selectedButton = ui.levelPicker?.querySelector(`[data-level-id="${selectedLevelId}"]`);
    const fallback = ui.levelPicker?.querySelector("[data-level-id]") || ui.start;
    (selectedButton || fallback)?.focus({ preventScroll: true });
  }

  ui.start.addEventListener("click", startSelectedLevel);
  ui.dockMissionSetup?.addEventListener("click", returnToMissionSetupAction);
  ui.tutorialGo?.addEventListener("click", beginMatch);
  ui.viewAnalysis?.addEventListener("click", viewMatchAnalysisAction);
  ui.dockViewAnalysis?.addEventListener("click", viewMatchAnalysisAction);
  ui.playAgain?.addEventListener("click", playAgainAction);
  ui.dockPlayAgain?.addEventListener("click", playAgainAction);
  ui.chooseLevel?.addEventListener("click", chooseLevelAction);
  ui.levelPicker?.addEventListener("click", event => {
    const button = event.target.closest("[data-level-id]");
    if (!button || state?.running) return;
    selectedLevelId = Number(button.dataset.levelId) || 1;
    reset();
  });
  ui.reset.addEventListener("click", () => {
    reset();
    scrollGameIntoView();
  });
  ui.worm.addEventListener("click", () => setWormMode(!wormMode));
  ui.mobileModes.forEach(button => button.addEventListener("click", () => setWormMode(button.dataset.gameMode === "wormhole")));
  ui.mobileTelemetryToggle?.addEventListener("click", () => mobileDrawerOpen ? closeMobileTelemetryDrawer({ restoreFocus: true }) : openMobileTelemetryDrawer());
  ui.mobileTelemetryClose?.addEventListener("click", () => closeMobileTelemetryDrawer({ restoreFocus: true }));
  ui.mobileTelemetryDrawer?.addEventListener("keydown", event => {
    if (event.key !== "Tab" || !mobileDrawerOpen) return;
    const controls = focusableModalControls(ui.mobileTelemetryDrawer);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  ui.mobileDrawerBackdrop?.addEventListener("click", () => closeMobileTelemetryDrawer({ restoreFocus: true }));
  ui.mobileReset?.addEventListener("click", () => {
    closeMobileTelemetryDrawer();
    reset(false);
    beginMatch();
  });
  ui.mobileChooseLevel?.addEventListener("click", () => {
    closeMobileTelemetryDrawer();
    chooseLevelAction();
  });
  ui.mobileShellRetry?.addEventListener("click", () => {
    reset(false);
    beginMatch();
  });
  ui.mobileShellReturn?.addEventListener("click", () => {
    setMobileShellStatus("idle", "", "");
    reset(true);
    scrollGameIntoView();
  });
  ui.mobileMatchExit?.addEventListener("click", () => {
    window.clearTimeout(mobileShellTimer);
    setMobileShellStatus("idle", "", "");
    reset(true);
    scrollGameIntoView();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mobileDrawerOpen) {
      event.preventDefault();
      closeMobileTelemetryDrawer({ restoreFocus: true });
    }
  });
  coarsePointerQuery.addEventListener("change", syncInputCapability);
  finePointerQuery.addEventListener("change", syncInputCapability);
  mobileViewportQuery.addEventListener("change", syncMobilePresentation);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state) {
      state.lastTick = performance.now();
      lastProcessedFrameAt = 0;
    }
  });

  initBackToGameObserver();
  initGravityDevLab();
  initMobileDiagnostics();
  syncInputCapability();
  reset();
  scheduleLiveTelemetryUpdate();
  requestAnimationFrame(tick);
})();
