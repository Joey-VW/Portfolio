import {
  LEVELS, teamMeta, activeTeamKeys, contestTeamKeys, colors,
  BASE_WORLD_BOUNDS, BASE_LAUNCH_RADIUS, BASE_PULL_RADIUS,
  MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, LAUNCH_POWER_CURVE, MAX_SPEED,
  BASE_WORM_MAX_RANGE, BASE_WORM_INFLUENCE, BASE_TOTAL_SHIP_CAP,
  PLANET_MOTION_MULTIPLIER, TAU, HEATMAP_WIDTH, HEATMAP_HEIGHT
} from "./levels.mjs";

export const GRAVITY_FLEET_STORAGE_KEY = "gravityFleetRuns";
export const WORMHOLE_LIFESPAN_PROFILES = Object.freeze({
  desktopClassic: Object.freeze({
    id: "desktop-classic",
    preparationSeconds: 0,
    activeSeconds: 30,
    absoluteMaxSeconds: 30,
    activationOnUse: false
  }),
  mobileTactical: Object.freeze({
    id: "mobile-tactical",
    preparationSeconds: .75,
    activeSeconds: 2.5,
    absoluteMaxSeconds: 10,
    activationOnUse: true
  })
});
export const GRAVITY_FLEET_RUN_SCHEMA = Object.freeze([
  "runId", "outcome", "durationSeconds", "score", "levelId", "levelName",
  "levelDifficulty", "captures", "planetsCaptured", "launchEvents",
  "launchEventLog", "largestLaunch", "peakFleetAdvantage", "shipsLaunched",
  "averageLaunchSize", "shipsPulled", "shipsLost", "shipsDestroyed",
  "wormholesCreated", "playerWormholesCreated", "aiWormholesCreated",
  "shipTransits", "wormholeUses", "wormholeEvents", "wormholePulls",
  "peakPlayerShipCount", "gravityCaptures", "blasterHits",
  "deepSpaceCombats", "wallBounces", "enemyMajorLaunches",
  "shipCountTimeline", "ownershipTimeline", "heatmap", "mapSnapshot", "endedAt"
]);

export function createSeededRandom(seed = 1) {
  let value = Number(seed) >>> 0 || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

export function readSavedRuns(storage) {
  if (!storage || typeof storage.getItem !== "function") return [];
  try {
    const parsed = JSON.parse(storage.getItem(GRAVITY_FLEET_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSavedRun(storage, run, limit = 5) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(GRAVITY_FLEET_STORAGE_KEY, JSON.stringify([run, ...readSavedRuns(storage)].slice(0, limit)));
    return true;
  } catch {
    return false;
  }
}

export function validateSavedRun(run) {
  return Boolean(run && typeof run === "object" && typeof run.outcome === "string" &&
    Number.isFinite(run.durationSeconds) && Number.isFinite(run.score) &&
    Array.isArray(run.captures) && Array.isArray(run.launchEventLog) &&
    Array.isArray(run.shipCountTimeline) && Array.isArray(run.ownershipTimeline));
}

export function createGravityFleetEngine(options = {}) {
  const random = options.randomSource || Math.random;
  const clockNow = options.now || (() => Date.now());
  const createId = options.createId || (() => `gravity-${Math.floor(clockNow())}-${Math.floor(random() * 1e9)}`);
  const reduced = Boolean(options.reducedMotion);
  let effectsEnabled = options.effectsEnabled !== false;
  let trailsEnabled = options.trailsEnabled !== false && !reduced;
  const monitor = options.monitor || { measure: (_name, work) => work(), setGauge: () => {} };
  const listeners = new Set();
  let selectedLevelId = Number(options.levelId) || 1;
  let state;
  let shipId = 1;
  let wormMode = false;
  let pendingWorm = null;
  let playerWormholeLifespan = normalizeWormholeLifespan(options.playerWormholeLifespan);

  function normalizeWormholeLifespan(policy = WORMHOLE_LIFESPAN_PROFILES.desktopClassic) {
    const fallback = WORMHOLE_LIFESPAN_PROFILES.desktopClassic;
    const finiteNumber = (value, fallbackValue) => Number.isFinite(Number(value)) ? Number(value) : fallbackValue;
    const preparationSeconds = Math.max(0, finiteNumber(policy?.preparationSeconds, fallback.preparationSeconds));
    const activeSeconds = Math.max(.1, finiteNumber(policy?.activeSeconds, fallback.activeSeconds));
    const absoluteMaxSeconds = Math.max(activeSeconds, finiteNumber(policy?.absoluteMaxSeconds, fallback.absoluteMaxSeconds));
    return Object.freeze({
      id: String(policy?.id || fallback.id),
      preparationSeconds,
      activeSeconds,
      absoluteMaxSeconds,
      activationOnUse: Boolean(policy?.activationOnUse)
    });
  }

  function setPlayerWormholeLifespan(policy) {
    playerWormholeLifespan = normalizeWormholeLifespan(policy);
    return playerWormholeLifespan;
  }

  function emit(type, detail) {
    listeners.forEach(listener => listener({ type, detail, state }));
  }
function rand(min, max) { return min + random() * (max - min); }

function createCaptureState() {
  return Object.fromEntries(contestTeamKeys.map(key => [key, 0]));
}

function bodyInfluence(body) {
  if (body.isStar) return body.radius + 128;
  return body.radius + (body.type === "home" || body.type === "base" ? 115 : 84);
}

function hydratePlanet(body) {
  return { ...body, capture: createCaptureState(), prod: 0, pulse: random() * 7 };
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
    team, mode: "expand", targetPlanetId: null, modeUntil: 0, nextThinkAt: (team === "enemy" ? 2.2 : 3.8) + (tuning.thinkOffset || 0) + random() * 2.4, aggression: (team === "enemy" ? .58 : .48) + (tuning.aggressionBase || 0),
    lastMajorLaunchTime: -99, lastWormholeAt: -99, lastPlayerHomeTargetAt: -99, openingComplete: false, firstExpansionAt: null, earlyNeutralCaptures: 0, recentLosses: [], recentCaptures: [], preferredFrontPlanetId: null
  };
}

function makeState() {
  const level = activeLevel();
  return {
    levelId: level.id, levelName: level.name, levelDifficulty: level.difficulty, levelSubtitle: level.subtitle,
    running: false, paused: false, ended: false, acceptingInput: false, dashboardRendered: false, outcome: null, outcomeScore: 0, startedAt: null, endedAt: null,
    elapsed: 0, lastTick: clockNow(), planets: generatePlanets(level),
    ships: [], launcher: null, aiLaunchFields: [], wormholes: [], wormDrag: null, wormholesCreated: 0, playerWormholesCreated: 0, aiWormholesCreated: 0, wormholeUses: 0, shipTransits: 0, wormholeEvents: [], wormholePulls: 0,
    wormholeOrbitCaptures: 0, wormholeTransitCount: 0,
    events: [], effects: [], launchEvents: [], launches: 0, shipsLaunched: 0, largestLaunch: 0, captures: [], combat: 0, shipsLost: 0, shipsDestroyed: 0,
    shipsPulled: 0, gravityCaptures: 0, blasterHits: 0, deepSpaceCombats: 0, wallBounces: 0, enemyMajorLaunches: 0,
    heatmap: { width: HEATMAP_WIDTH, height: HEATMAP_HEIGHT, movement: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0), combat: Array(HEATMAP_WIDTH * HEATMAP_HEIGHT).fill(0) }, shipCountTimeline: [], ownershipTimeline: [], lastSnap: 0, lastLiveSignature: "", lastHudSignature: "", liveSpikeUntil: 0, aiClock: 2.5, peakPlayerShips: 0, peakFleetAdvantage: 0,
    aiTeams: Object.fromEntries(contestTeamKeys.filter(key => teamMeta[key].ai).map(key => [key, createAiTeamState(key)]))
  };
}


function addEvent(message) {
  state.events.unshift({ t: Math.round(state.elapsed), message });
  emit("events", state.events.slice(0, 6));
}

function spawnShip(owner, planet, amount = 1) {
  const ownedOrbiters = () => state.ships.filter(s => s.owner === owner && s.state === "orbiting" && s.planetId === planet.id).length;
  for (let i = 0; i < amount && state.ships.length < levelShipCap() && ownedOrbiters() < 58; i++) {
    state.ships.push({
      id: shipId++, owner, x: planet.x, y: planet.y, vx: 0, vy: 0, hp: 1, combatCooldown: random() * .5,
      state: "orbiting", planetId: planet.id, orbitAngle: random() * Math.PI * 2, orbitRadius: planet.radius + 11 + random() * 13, trail: []
    });
  }
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


function snapshot() {
  const c = counts();
  state.shipCountTimeline.push({ t: Math.round(state.elapsed), ...Object.fromEntries(activeTeamKeys.map(key => [key, c.teams[key]?.ships || 0])) });
  state.ownershipTimeline.push({ t: Math.round(state.elapsed), ...Object.fromEntries(activeTeamKeys.map(key => [key, c.teams[key]?.planets || 0])) });
  state.shipCountTimeline = state.shipCountTimeline.slice(-180);
  state.ownershipTimeline = state.ownershipTimeline.slice(-180);
}


function nearestPlanet(point, owner = null, coarse = false, coarseWorldUnitsPerCssPixel = 0) {
  return state.planets
    .filter(p => {
      const radius = coarse ? Math.max(p.radius + 34, 22 * coarseWorldUnitsPerCssPixel) : p.radius + 34;
      return (!owner || p.owner === owner) && dist(point, p) < radius;
    })
    .sort((a, b) => dist(point, a) - dist(point, b))[0];
}

function createLauncher(point, coarse = false, coarseWorldUnitsPerCssPixel = 0) {
  const inside = state.planets.find(p => dist(point, p) < p.radius);
  const nearOwned = nearestPlanet(point, "player", coarse, coarseWorldUnitsPerCssPixel);
  if (coarse && !nearOwned) return false;
  state.launcher = {
    active: true, origin: point, pointer: point, lockedPointer: point, radius: levelLaunchRadius(),
    selectedShipIds: [], formationVersion: 0, aimVector: { x: 1, y: 0, len: 0 },
    nearPlanetId: nearOwned?.id || null, startedInsidePlanet: Boolean(inside), pullPulse: 0
  };

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

}

function releaseLauncher() {
  const l = state.launcher;
  if (!l?.active) return;
  const ships = state.ships.filter(s => l.selectedShipIds.includes(s.id));
  state.launcher = null;

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

    return;
  }
  createWormhole(pendingWorm, endpoint);
  pendingWorm = null;
  setWormMode(false);
}

function setWormMode(value) {
  wormMode = Boolean(value);
  if (!wormMode) pendingWorm = null;
}

function createTeamWormhole(owner, start, exit, options = {}) {
  const lifespan = owner === "player" ? normalizeWormholeLifespan(options.lifespan || playerWormholeLifespan) : null;
  const ttl = options.ttl ?? (lifespan?.absoluteMaxSeconds || 18);
  if (owner === "player") state.wormholes = state.wormholes.filter(w => w.owner !== "player");
  else state.wormholes = state.wormholes.filter(w => w.owner !== owner);
  const wormhole = {
    id: `worm-${owner}-${clockNow()}-${Math.floor(random() * 9999)}`,
    owner,
    a: { x: start.x, y: start.y },
    b: { x: exit.x, y: exit.y },
    aEntryEnabled: true,
    bEntryEnabled: false,
    ttl,
    maxTtl: ttl,
    spin: 0,
    ...(lifespan ? {
      lifespan,
      age: 0,
      activeElapsed: 0,
      activationPending: false,
      phase: lifespan.activationOnUse ? "preparing" : "active",
      remainingSeconds: ttl,
      lifeRatio: 1
    } : {})
  };
  state.wormholes.push(wormhole);
  state.wormholesCreated++;
  if (owner === "player") state.playerWormholesCreated++;
  else state.aiWormholesCreated++;
  state.wormholeEvents.push({ t: Math.round(state.elapsed), owner });
  addEvent(owner === "player" ? "Cyan one-way wormhole stabilized; entry A enabled." : `${teamLabel(owner)} opened a tactical wormhole toward ${options.targetName || "the outer orbit"}.`);

  return wormhole;
}

function createWormhole(start, exit) {
  return createTeamWormhole("player", start, exit, { lifespan: playerWormholeLifespan });
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

}

function toggleWormholeEntrance(hit) {
  const prop = hit.key === "a" ? "aEntryEnabled" : "bEntryEnabled";
  hit.wormhole[prop] = !hit.wormhole[prop];
  addEvent(`${teamLabel(hit.wormhole.owner)} wormhole entry ${hit.wormhole[prop] ? "enabled" : "disabled"}.`);

}

function isWormholeBusy(ship) {
  return ship.state === "pointerOrbit" || ship.state === "wormholeOrbit" || ship.state === "wormholeTransit";
}

function activatePlayerWormhole(wormhole) {
  if (!wormhole?.lifespan?.activationOnUse || wormhole.phase === "active") return;
  wormhole.activationPending = true;
  if ((wormhole.age || 0) < wormhole.lifespan.preparationSeconds) return;
  wormhole.phase = "active";
  wormhole.activeElapsed = 0;
  wormhole.activationPending = false;
  addEvent(`Cyan wormhole activated - ${wormhole.lifespan.activeSeconds.toFixed(1)} seconds remaining.`);
}

function assignWormholeOrbit(ship, entry, exit, wormhole = null) {
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
  if (ship.owner === "player") activatePlayerWormhole(wormhole);
  if (!reduced) spawnEffect("spark", ship.x, ship.y, entry.x, entry.y, colors.worm, .22);
}

function applyWormholeGravity(ship, dt) {
  if (!(state.wormholes || []).length || isWormholeBusy(ship) || (ship.wormholeCooldown || ship.warpLock || 0) > 0) return;
  for (const { wormhole, entry, exit } of wormholeEntrancesFor(ship)) {
    if (ship.state !== "traveling") return;
    const d = dist(ship, entry);
    if (d > levelWormInfluence()) continue;
    const to = norm(entry.x - ship.x, entry.y - ship.y);
    const strength = (1 - d / levelWormInfluence()) * 118;
    ship.vx += to.x * strength * dt;
    ship.vy += to.y * strength * dt;
    state.wormholePulls += dt;
    if (d < 24) assignWormholeOrbit(ship, entry, exit, wormhole);
  }
}

function scanWormholePickup(dt) {
  if (!(state.wormholes || []).length) return;
  state.ships.forEach(ship => {
    if (!(ship.state === "traveling" || ship.state === "orbiting") || (ship.wormholeCooldown || ship.warpLock || 0) > 0) return;
    for (const { wormhole, entry, exit } of wormholeEntrancesFor(ship)) {
      const d = dist(ship, entry);
      const captureRange = ship.state === "orbiting" ? levelWormInfluence() : 30;
      if (d <= captureRange) {
        assignWormholeOrbit(ship, entry, exit, wormhole);
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
  if (trailsEnabled) ship.trail = [{ x: ship.x, y: ship.y }, ...(ship.trail || [])].slice(0, 10);
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
  if (trailsEnabled) ship.trail = [{ x: ship.x, y: ship.y }, ...(ship.trail || [])].slice(0, 8);
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
  if (state.elapsed - (memory.lastWormholeAt || -99) < 22 + random() * 10) return null;
  if ((state.wormholes || []).some(w => w.owner === team)) return null;
  const d = dist(sourcePlanet, target);
  if (d < 330 || d > levelWormMaxRange() + 360) return null;
  if (random() > (mode === "reinforce" ? .55 : mode === "assault" ? .42 : .28)) return null;
  const line = norm(target.x - sourcePlanet.x, target.y - sourcePlanet.y);
  const entry = { x: sourcePlanet.x + line.x * (sourcePlanet.radius + 38), y: sourcePlanet.y + line.y * (sourcePlanet.radius + 38) };
  const exitDistance = Math.min(levelWormMaxRange() - 20, Math.max(190, d - target.radius - 86));
  const exit = { x: entry.x + line.x * exitDistance, y: entry.y + line.y * exitDistance };
  if (dist(entry, exit) > levelWormMaxRange()) return null;
  memory.lastWormholeAt = state.elapsed;
  return createTeamWormhole(team, entry, exit, { ttl: 14 + random() * 8, targetName: planetName(target) });
}

function chooseAiMode(team, memory, board) {
  const opening = isOpeningPhase(team, board, memory);
  if (board.threatened) return "reinforce";
  if (opening && board.neutralPlanets.length) return "expand";
  if (board.ownedPlanets.length <= 1 && state.elapsed > 35) return "recover";
  const playerReducedAfterOpening = board.playerPlanets.length && board.playerShips < board.totalShips * .5 && (state.elapsed > 70 || board.ownedPlanets.length >= 3);
  if (playerReducedAfterOpening || (board.playerPlanets.length <= 1 && state.elapsed > 85 && board.totalShips > board.playerShips * 1.25)) return "finish";
  const canAssault = board.totalShips > 58 && state.elapsed - memory.lastMajorLaunchTime > (team === "enemy" ? 21 : 26) && (state.elapsed > 55 || board.ownedPlanets.length >= 3);
  if (canAssault && random() < (team === "enemy" ? .4 : .3)) return "assault";
  const weakPlayer = board.playerPlanets.some(p => p.type !== "home" && orbitingCount(p, "player") < 16 && incomingCount(p, team) < 14);
  if (weakPlayer && state.elapsed > 42 && random() < (team === "enemy" ? .45 : .3)) return "raid";
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
  return score + random() * 10;
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
  const field = { id: ships[0].aiLaunchFieldId, team, sourcePlanetId: sourcePlanet.id, targetPlanetId: target.id, selectedShipIds: ships.map(s => s.id), origin, aimTarget: { x: aimTarget.x, y: aimTarget.y }, finalTarget: { x: target.x, y: target.y }, charge: 0, chargeDuration: (options.major ? 1.25 : .8 + random() * .35) + sizeBonus, mode: options.mode || "raid", speed: options.speed || (options.major ? 190 : 170), major: Boolean(options.major), useWormholeEntry: Boolean(wormhole), createdAt: state.elapsed };
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
      ship.vx = aim.x * (field.speed + random() * 22) + perp.x * spread + direct.x * (field.useWormholeEntry ? 22 : 0);
      ship.vy = aim.y * (field.speed + random() * 22) + perp.y * spread + direct.y * (field.useWormholeEntry ? 22 : 0);
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
  memory.modeUntil = state.elapsed + (mode === "recover" ? 6 : 10 + random() * 7);
  const delay = mode === "finish" ? 2.6 : mode === "assault" ? 4.8 : mode === "recover" ? 5.5 : 3.6;
  memory.nextThinkAt = state.elapsed + Math.max(1.8, delay + (activeLevel().aiTuning?.[team]?.thinkOffset || 0)) + random() * 1.8;
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
    emit("launchPulse", event.ships);
    if ((event.ships || 0) >= 18) addEvent(`Major player launch spike: ${event.ships} ships.`);
  }
}

function spawnEffect(type, x1, y1, x2, y2, color, ttl = .25) {
  if (!effectsEnabled || (reduced && type !== "blast")) return;
  state.effects.push({ type, x1, y1, x2, y2, color, ttl, maxTtl: ttl });
}

function spawnBlast(from, to) {
  state.blasterHits++;
  recordHeatPoint("combat", (from.x + to.x) / 2, (from.y + to.y) / 2, 1);
  from.combatCooldown = .28 + random() * .3;
  spawnEffect("blast", from.x, from.y, to.x, to.y, colors[from.owner] || colors.neutral, .18);
  if (!reduced) spawnEffect("spark", to.x, to.y, to.x + (random() - .5) * 18, to.y + (random() - .5) * 18, colors.gold, .25);
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
      const shots = Math.min(10, Math.max(1, Math.floor(dt * 16 + random() * 2)));
      for (let i = 0; i < shots; i++) {
        const active = teamBuckets(near).filter(([, ships]) => ships.some(s => state.ships.includes(s)));
        if (active.length < 2) break;
        const [teamA, shipsA] = active[Math.floor(random() * active.length)];
        const rivals = active.filter(([team]) => team !== teamA);
        const [, shipsB] = rivals[Math.floor(random() * rivals.length)];
        const a = shipsA[Math.floor(random() * shipsA.length)];
        const b = shipsB[Math.floor(random() * shipsB.length)];
        if (!a || !b || !state.ships.includes(a) || !state.ships.includes(b)) continue;
        spawnBlast(a, b); spawnBlast(b, a);
        if (random() < .34) destroyShip(a, b.owner);
        if (random() < .38) destroyShip(b, a.owner);
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
    if (random() < .18) destroyShip(ship, rival.owner);
    if (random() < .2) destroyShip(rival, ship.owner);
    if (random() < .08) addEvent(`${teamLabel(ship.owner)} and ${teamLabel(rival.owner)} fleets clashed in deep space.`);
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


  function reset(levelId = selectedLevelId) {
    selectedLevelId = Number(levelId) || 1;
    shipId = 1;
    pendingWorm = null;
    wormMode = false;
    state = makeState();
    const level = activeLevel();
    state.planets.forEach(planet => {
      if (planet.owner !== "neutral") {
        spawnShip(planet.owner, planet, planet.startingShips ?? level.startingShips?.[planet.owner] ?? (planet.owner === "player" ? 20 : 18));
      }
    });
    if (level.neutralDefenders) {
      state.planets.filter(planet => planet.owner === "neutral").forEach(planet => spawnShip("neutral", planet, level.neutralDefenders));
    }
    emit("reset", { levelId: state.levelId });
    return state;
  }

  function begin() {
    if (state.ended) reset(selectedLevelId);
    state.running = true;
    state.paused = false;
    state.acceptingInput = true;
    state.startedAt = new Date(clockNow());
    addEvent(`${state.levelName} match started.`);
    snapshot();
    return state;
  }

  function pause() {
    cancelLauncher();
    state.wormDrag = null;
    pendingWorm = null;
    wormMode = false;
    state.running = false;
    state.paused = true;
    state.acceptingInput = false;
  }

  function resume() {
    if (state.ended) return false;
    state.running = true;
    state.paused = false;
    state.acceptingInput = true;
    return true;
  }

  function clearWormhole() {
    const player = playerWormholes()[0];
    if (!player) return false;
    deletePlayerWormhole(player);
    return true;
  }

  function cancelLaunch() {
    cancelLauncher();
    return true;
  }

  function cancelWormhole() {
    state.wormDrag = null;
    pendingWorm = null;
    wormMode = false;
    return true;
  }

  function command(name, payload = {}) {
    if (!state.acceptingInput && !["pause", "resume", "reset", "cancelLaunch", "cancelWormhole"].includes(name)) return false;
    switch (name) {
      case "beginLaunch": return createLauncher(payload.point, Boolean(payload.coarse), Number(payload.coarseWorldUnitsPerCssPixel) || 0);
      case "updateLaunch": updateLauncher(payload.point, Number(payload.dt) || 0); return true;
      case "commitLaunch": releaseLauncher(); return true;
      case "cancelLaunch": return cancelLaunch();
      case "beginWormhole": wormMode = true; startWormDrag(payload.point); return true;
      case "updateWormhole": updateWormDrag(payload.point); return true;
      case "commitWormhole": finalizeWormDrag(); wormMode = false; return true;
      case "tapWormhole": wormMode = true; placeWormFallback(payload.point); return true;
      case "cancelWormhole": return cancelWormhole();
      case "clearWormhole": return clearWormhole();
      case "toggleWormholeEntrance": {
        const hit = hitPlayerWormholeEntrance(payload.point, payload.radius);
        if (!hit) return false;
        toggleWormholeEntrance(hit);
        return true;
      }
      case "pause": pause(); return true;
      case "resume": return resume();
      case "reset": reset(payload.levelId ?? selectedLevelId); return true;
      default: return false;
    }
  }

  function step(dt) {
    const delta = Math.max(0, Math.min(.06, Number(dt) || 0));
    if (!state.running || !delta) return null;
    return monitor.measure("simulation", () => {
      state.elapsed += state.ended ? 0 : delta;
      updatePlanetOrbits(delta);
      state.planets.forEach(planet => {
        planet.pulse += delta;
        if (!state.ended && planet.owner !== "neutral") {
          planet.prod += delta * planet.rate;
          const underOrbitCap = state.ships.filter(ship => ship.owner === planet.owner && ship.state === "orbiting" && ship.planetId === planet.id).length < 58;
          if (planet.prod >= 1 && underOrbitCap) {
            spawnShip(planet.owner, planet, 1);
            planet.prod = 0;
          }
        }
      });
      if (!state.ended) {
        monitor.measure("ai", () => contestTeamKeys.filter(key => teamMeta[key].ai).forEach(team => thinkAiTeam(team, delta)));
      }
      updateAiLaunchFields(delta);
      state.wormholes = state.wormholes.filter(wormhole => {
        wormhole.spin += delta * 2.8;
        if (!wormhole.lifespan) {
          wormhole.ttl -= delta;
          return wormhole.ttl > 0;
        }
        wormhole.age += delta;
        const absoluteRemaining = Math.max(0, wormhole.lifespan.absoluteMaxSeconds - wormhole.age);
        if (wormhole.activationPending) activatePlayerWormhole(wormhole);
        if (!wormhole.activationPending && wormhole.phase === "preparing" && wormhole.age >= wormhole.lifespan.preparationSeconds) wormhole.phase = "armed";
        if (wormhole.phase === "active") wormhole.activeElapsed += delta;
        const activeRemaining = wormhole.phase === "active" ? Math.max(0, wormhole.lifespan.activeSeconds - wormhole.activeElapsed) : absoluteRemaining;
        wormhole.remainingSeconds = Math.min(absoluteRemaining, activeRemaining);
        wormhole.ttl = wormhole.remainingSeconds;
        const lifeWindow = wormhole.phase === "active" ? wormhole.lifespan.activeSeconds : wormhole.lifespan.absoluteMaxSeconds;
        wormhole.lifeRatio = Math.max(0, Math.min(1, wormhole.remainingSeconds / lifeWindow));
        const alive = absoluteRemaining > 0 && (wormhole.phase !== "active" || activeRemaining > 0);
        if (!alive && wormhole.owner === "player") addEvent("Cyan wormhole lifespan expired.");
        return alive;
      });
      if (state.launcher?.active) updateLauncher(state.launcher.pointer, delta);
      updateWormholeCooldowns(delta);
      scanWormholePickup(delta);
      state.ships.forEach(ship => {
        if (ship.state === "orbiting") updateOrbitingShip(ship, delta);
        else if (ship.state === "traveling") updateTravelingShip(ship, delta);
        else if (ship.state === "wormholeOrbit") updateWormholeOrbitShip(ship, delta);
        else if (ship.state === "wormholeTransit") updateWormholeTransitShip(ship, delta);
        updateHeat(ship, delta);
      });
      monitor.measure("combat", () => resolveCombat(delta));
      updateEffects(delta);
      if (!state.ended && Math.floor(state.elapsed / 4) > state.lastSnap) {
        state.lastSnap = Math.floor(state.elapsed / 4);
        snapshot();
      }
      const currentCounts = counts();
      state.peakPlayerShips = Math.max(state.peakPlayerShips, currentCounts.playerShips);
      state.peakFleetAdvantage = Math.max(state.peakFleetAdvantage, currentCounts.playerShips - Math.max(0, ...contestTeamKeys.filter(key => key !== "player").map(key => currentCounts.teams[key]?.ships || 0)));
      monitor.setGauge("activeShips", state.ships.length);
      monitor.setGauge("effects", state.effects.length);
      let outcome = null;
      if (!state.ended && (currentCounts.rivalPlanets === 0 || state.planets.filter(planet => planet.owner !== "neutral").every(planet => planet.owner === "player"))) outcome = "Victory";
      if (!state.ended && currentCounts.playerPlanets === 0) outcome = "Defeat";
      if (outcome) finish(outcome);
      return { counts: currentCounts, outcome };
    });
  }

  function finish(outcome) {
    if (state.ended) return state.completedRun || null;
    state.ended = true;
    state.paused = false;
    state.acceptingInput = false;
    state.outcome = outcome;
    state.endedAt = new Date(clockNow());
    state.wormDrag = null;
    cancelLauncher();
    pendingWorm = null;
    wormMode = false;
    snapshot();
    addEvent(outcome === "Victory" ? "Victory: all Red and Orange planets captured." : "Defeat: all player planets were lost.");
    const duration = Math.round(state.elapsed);
    const playerCaptures = state.captures.filter(capture => capture.owner === "player").length;
    const averageLaunchSize = state.launches ? Math.round(state.shipsLaunched / state.launches) : 0;
    const portalDeploymentScore = Math.min(4, state.playerWormholesCreated) * 12;
    const score = (outcome === "Victory" ? 100 : 0) + playerCaptures * 30 + state.shipsDestroyed + portalDeploymentScore - state.shipsLost + Math.max(0, 150 - duration) + state.gravityCaptures + state.deepSpaceCombats;
    state.outcomeScore = score;
    const run = {
      runId: createId(), outcome, durationSeconds: duration, score,
      levelId: state.levelId, levelName: state.levelName, levelDifficulty: state.levelDifficulty,
      captures: state.captures, planetsCaptured: playerCaptures,
      launchEvents: state.launches, launchEventLog: state.launchEvents,
      largestLaunch: state.largestLaunch, peakFleetAdvantage: state.peakFleetAdvantage,
      shipsLaunched: state.shipsLaunched, averageLaunchSize, shipsPulled: state.shipsPulled,
      shipsLost: state.shipsLost, shipsDestroyed: state.shipsDestroyed,
      wormholesCreated: state.wormholesCreated, playerWormholesCreated: state.playerWormholesCreated,
      aiWormholesCreated: state.aiWormholesCreated, shipTransits: state.shipTransits,
      wormholeUses: state.wormholeUses, wormholeEvents: state.wormholeEvents,
      wormholePulls: Math.round(state.wormholePulls), peakPlayerShipCount: state.peakPlayerShips,
      gravityCaptures: state.gravityCaptures, blasterHits: state.blasterHits,
      deepSpaceCombats: state.deepSpaceCombats, wallBounces: state.wallBounces,
      enemyMajorLaunches: state.enemyMajorLaunches, shipCountTimeline: state.shipCountTimeline,
      ownershipTimeline: state.ownershipTimeline, heatmap: state.heatmap,
      mapSnapshot: buildRunMapSnapshot(), endedAt: state.endedAt.toISOString()
    };
    state.completedRun = run;
    emit("outcome", run);
    return run;
  }

  function checkpoint() {
    return {
      levelId: state.levelId,
      elapsed: Number(state.elapsed.toFixed(6)),
      outcome: state.outcome,
      planets: state.planets.map(planet => ({
        id: planet.id, owner: planet.owner,
        x: Number(planet.x.toFixed(4)), y: Number(planet.y.toFixed(4)),
        capture: Object.fromEntries(Object.entries(planet.capture).map(([key, value]) => [key, Number(value.toFixed(4))]))
      })),
      ships: state.ships.map(ship => ({
        id: ship.id, owner: ship.owner, state: ship.state, planetId: ship.planetId || null,
        x: Number(ship.x.toFixed(4)), y: Number(ship.y.toFixed(4)),
        vx: Number((ship.vx || 0).toFixed(4)), vy: Number((ship.vy || 0).toFixed(4))
      })),
      telemetry: {
        launches: state.launches, shipsLaunched: state.shipsLaunched,
        largestLaunch: state.largestLaunch, wormholesCreated: state.wormholesCreated,
        shipTransits: state.shipTransits, wormholeUses: state.wormholeUses,
        captures: state.captures.length, combat: state.combat
      }
    };
  }

  function forceOutcomeForValidation(outcome) {
    if (!options.validationMode) throw new Error("Controlled outcomes require validationMode.");
    if (outcome === "Victory") {
      state.planets.forEach(planet => { if (planet.owner !== "neutral") planet.owner = "player"; });
    } else if (outcome === "Defeat") {
      state.planets.filter(planet => planet.owner === "player").forEach(planet => { planet.owner = "enemy"; });
    } else {
      throw new Error("Outcome must be Victory or Defeat.");
    }
    return step(.001)?.outcome || state.outcome;
  }

  function setPresentationPolicy(policy = {}) {
    if (Object.hasOwn(policy, "effectsEnabled")) effectsEnabled = Boolean(policy.effectsEnabled);
    if (Object.hasOwn(policy, "trailsEnabled")) trailsEnabled = Boolean(policy.trailsEnabled) && !reduced;
  }

  reset(selectedLevelId);

  return {
    get state() { return state; },
    get level() { return activeLevel(); },
    get wormMode() { return wormMode; },
    get pendingWorm() { return pendingWorm; },
    levels: LEVELS,
    begin, pause, resume, reset, step, command, counts, checkpoint, finish, setPlayerWormholeLifespan,
    forceOutcomeForValidation, buildRunMapSnapshot, addEvent, setPresentationPolicy,
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}
