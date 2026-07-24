export const teamMeta = {
  player: { label: "Cyan", color: "#6ff8ff", ai: false },
  enemy: { label: "Red", color: "#ff5d9e", ai: true },
  orange: { label: "Orange", color: "#ff9f43", ai: true },
  neutral: { label: "Neutral", color: "#dfe8ff", ai: false },
};
export const activeTeamKeys = Object.keys(teamMeta);
export const contestTeamKeys = activeTeamKeys.filter(key => key !== "neutral");
export const colors = { ...Object.fromEntries(activeTeamKeys.map(key => [key, teamMeta[key].color])), worm: "#c77dff", gold: "#ffe58a", danger: "#ff6d7a" };
export const BASE_WORLD_BOUNDS = { x: 0, y: 0, width: 1280, height: 800 };
export const BASE_LAUNCH_RADIUS = 98;
export const BASE_PULL_RADIUS = 78;
export const MIN_LAUNCH_SPEED = 112;
export const MAX_LAUNCH_SPEED = 236;
export const LAUNCH_POWER_CURVE = 1.25;
export const MAX_SPEED = 255;
export const BASE_WORM_MAX_RANGE = 285;
export const BASE_WORM_INFLUENCE = 88;
export const BASE_TOTAL_SHIP_CAP = 420;
export const PLANET_MOTION_MULTIPLIER = 1.26;
export const TAU = Math.PI * 2;
export const HEATMAP_WIDTH = 24;
export const HEATMAP_HEIGHT = 15;
const liveTelemetryConfig = { desktopIntervalMs: 200, mobileIntervalMs: 1000 };


export const LEVELS = [
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
    orbitSpeedMultiplier: 1.10,
    homeProduction: { player: 1.32, enemy: 1.34, orange: 1.3 },
    aiTuning: { enemy: { thinkOffset: -.45, aggressionBase: .04 }, orange: { thinkOffset: -.3, aggressionBase: .035 } },
    orbitPaths: {
      inner: { id: "inner", label: "Inner slingshot", semiMajor: 285, eccentricity: 0.02, phase: -0.34, projectionScale: 0.61, speed: 0.0064 },
      middle: { id: "middle", label: "Home braid", semiMajor: 535, eccentricity: 0.03, phase: 0.08, projectionScale: 0.56, speed: 0.0031 },
      outer: { id: "outer", label: "Outer picket", semiMajor: 610, eccentricity: 0.035, phase: 0.23, projectionScale: 0.53, speed: 0.0051 }
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
    orbitSpeedMultiplier: 1.21,
    homeProduction: { player: 1.34, enemy: 1.46, orange: 1.42 },
    playerHomeGraceSeconds: 10,
    aiTuning: { enemy: { thinkOffset: -.75, aggressionBase: .075 }, orange: { thinkOffset: -.6, aggressionBase: .065 } },
    orbitPaths: {
      inner: { id: "inner", label: "Inner knife-edge", semiMajor: 305, eccentricity: 0.018, phase: -0.48, projectionScale: 0.59, speed: 0.0064 },
      middle: { id: "middle", label: "Home helix", semiMajor: 560, eccentricity: 0.04, phase: -0.05, projectionScale: 0.53, speed: 0.0031 },
      outer: { id: "outer", label: "Outer siege ring", semiMajor: 635, eccentricity: 0.045, phase: 0.31, projectionScale: 0.50, speed: 0.0051 }
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
export function levelById(levelId) {
  return LEVELS.find(level => level.id === Number(levelId)) || LEVELS[0];
}
