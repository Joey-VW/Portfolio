#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const corePath = path.join(root, "games", "gravity-fleet", "core.mjs");
const cameraPath = path.join(root, "games", "gravity-fleet", "camera.mjs");
const levelsPath = path.join(root, "games", "gravity-fleet", "levels.mjs");
const performancePath = path.join(root, "games", "gravity-fleet", "performance.mjs");
const runtimePath = path.join(root, "games", "gravity-fleet", "runtime.mjs");
const telemetryPath = path.join(root, "games", "gravity-fleet", "telemetry.mjs");
const fixtureRoot = path.join(__dirname, "fixtures", "gravity-fleet");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), "utf8"));
}

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    value(key) { return values.get(key); }
  };
}

function validateModuleFailureWatchdog(source) {
  function createTarget(initial = {}) {
    const listeners = new Map();
    return {
      hidden: initial.hidden ?? false,
      addEventListener(type, listener) { listeners.set(type, listener); },
      dispatch(type, event = {}) { listeners.get(type)?.(event); }
    };
  }

  function createHarness() {
    const canvas = createTarget();
    const fallback = createTarget({ hidden: true });
    const setup = createTarget();
    const moduleScript = createTarget();
    const retry = createTarget();
    const windowTarget = createTarget();
    const timers = new Map();
    let nextTimer = 1;
    const window = {
      location: { reload() {} },
      addEventListener: windowTarget.addEventListener,
      setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); }
    };
    const elements = new Map([
      ["#gravityCanvas", canvas], ["#gameCanvasFallback", fallback],
      ["#gameStartOverlay", setup], ["#gravityFleetModuleScript", moduleScript],
      ["#gameCanvasRetry", retry]
    ]);
    const document = {
      documentElement: { dataset: {} },
      querySelector: selector => elements.get(selector) || (selector.includes('src*="gravity-fleet-lab"') ? moduleScript : null)
    };
    vm.runInNewContext(source, { document, window });
    return { canvas, fallback, setup, moduleScript, timers, dispatchReady: detail => windowTarget.dispatch("gravityfleet:ready", { detail }) };
  }

  const delayed = createHarness();
  [...delayed.timers.values()][0]();
  assert.equal(delayed.fallback.hidden, false, "watchdog timeout must expose the fallback when initialization stalls");
  delayed.dispatchReady({ restoreSetup: true, simulatedCanvasFailure: false });
  assert.equal(delayed.fallback.hidden, true, "delayed successful initialization must hide a watchdog fallback");
  assert.equal(delayed.canvas.hidden, false, "delayed successful initialization must restore the canvas");
  assert.equal(delayed.setup.hidden, false, "delayed successful initialization must restore mission setup");
  assert.equal(delayed.timers.size, 0, "successful initialization must clear the watchdog timeout");

  const failed = createHarness();
  failed.moduleScript.dispatch("error");
  assert.equal(failed.fallback.hidden, false, "a genuine module-script load error must expose the fallback immediately");
  assert.equal(failed.canvas.hidden, true, "a genuine module-script load error must hide the unusable canvas");
}

function runCommands(api, fixture) {
  const engine = api.createGravityFleetEngine({
    levelId: fixture.levelId,
    randomSource: api.createSeededRandom(fixture.seed),
    now: () => Date.parse("2026-01-01T00:00:00.000Z"),
    createId: () => "deterministic-run",
    validationMode: true,
    effectsEnabled: false,
    trailsEnabled: false
  });
  for (const item of fixture.commands) {
    if (item.command === "begin") engine.begin();
    else if (item.command === "advance") {
      for (let step = 0; step < item.steps; step++) engine.step(item.dt);
    } else {
      const accepted = engine.command(item.command, item);
      assert.equal(accepted, true, `command ${item.command} should be accepted`);
    }
  }
  return { engine, checkpoint: engine.checkpoint() };
}

(async () => {
  const api = await import(pathToFileURL(corePath));
  const { CAMERA_ORIENTATIONS, createGravityFleetCamera } = await import(pathToFileURL(cameraPath));
  const { LEVELS, PLANET_MOTION_MULTIPLIER } = await import(pathToFileURL(levelsPath));
  const { createPerformanceMonitor } = await import(pathToFileURL(performancePath));
  const { createFixedStepRuntime, selectPresentationProfile, FIXED_SIMULATION_STEP_SECONDS } = await import(pathToFileURL(runtimePath));
  const { createTelemetryChartScheduler, createTelemetryProjection } = await import(pathToFileURL(telemetryPath));
  const commandFixture = readJson("level-1-command-sequence.json");
  const savedFixture = readJson("saved-run-v1.json");

  assert.equal(LEVELS.length, 3, "the existing three levels must remain registered");
  assert.equal(PLANET_MOTION_MULTIPLIER, 1.26, "base planet motion multiplier must remain unchanged");

  assert.equal(
    LEVELS[0].orbitSpeedMultiplier,
    1,
    "Level 1 must remain the orbit-speed baseline"
  );

  assert.equal(
    LEVELS[1].orbitSpeedMultiplier,
    2,
    "Level 2 must retain its approved orbit-speed multiplier"
  );

  assert.equal(
    LEVELS[2].orbitSpeedMultiplier,
    3.5,
    "Level 3 must retain its approved orbit-speed multiplier"
  );

  const orbitPathIds = ["inner", "middle", "outer"];

  const configuredOrbitSpeed = (level, pathId) =>
    level.orbitPaths[pathId].speed *
    PLANET_MOTION_MULTIPLIER *
    level.orbitSpeedMultiplier;

  for (const pathId of orbitPathIds) {
    const levelOneSpeed = configuredOrbitSpeed(LEVELS[0], pathId);
    const levelTwoSpeed = configuredOrbitSpeed(LEVELS[1], pathId);
    const levelThreeSpeed = configuredOrbitSpeed(LEVELS[2], pathId);

    assert.ok(
      levelTwoSpeed > levelOneSpeed,
      `Level 2 ${pathId} orbit must be faster than Level 1`
    );

    assert.ok(
      levelThreeSpeed > levelTwoSpeed,
      `Level 3 ${pathId} orbit must be faster than Level 2`
    );
  }

  for (const level of LEVELS) {
    const engine = api.createGravityFleetEngine({ levelId: level.id, randomSource: api.createSeededRandom(1000 + level.id) });
    assert.equal(engine.state.levelId, level.id);
    assert.equal(engine.state.planets.length, level.planetSeeds.length);
    assert.ok(engine.state.ships.length > 0, `level ${level.id} should initialize ships`);
    for (const pathId of orbitPathIds) {
      const planet = engine.state.planets.find(candidate => candidate.orbitPathId === pathId);
      assert.ok(planet, `level ${level.id} must initialize a planet on the ${pathId} orbit`);
      const expectedSpeed = configuredOrbitSpeed(level, pathId);
      assert.ok(Math.abs(planet.orbitSpeed - expectedSpeed) < 1e-12, `level ${level.id} ${pathId} planet must receive its configured effective orbit speed`);
      const initialAngle = planet.orbitAngle;
      engine.begin();
      engine.step(FIXED_SIMULATION_STEP_SECONDS);
      assert.ok(Math.abs(planet.orbitAngle - initialAngle - expectedSpeed * FIXED_SIMULATION_STEP_SECONDS) < 1e-12, `level ${level.id} ${pathId} planet must advance at its configured effective orbit speed`);
      engine.command("pause");
    }
  }

  const first = runCommands(api, commandFixture);
  const second = runCommands(api, commandFixture);
  assert.deepEqual(first.checkpoint, second.checkpoint, "fixed seed and commands must be repeatable");
  assert.ok(first.checkpoint.telemetry.launches >= 1, "fixture should produce a launch");
  assert.ok(first.checkpoint.telemetry.shipsLaunched > 0, "fixture should launch ships");
  assert.equal(first.checkpoint.telemetry.wormholesCreated, 1, "fixture should deploy one player wormhole");
  assert.ok(first.engine.state.launchEvents.every(event => event.ships > 0));
  assert.ok(first.engine.state.largestLaunch <= first.engine.state.launchEvents.reduce((max, event) => Math.max(max, event.ships), 0));
  assert.equal(first.engine.state.shipTransits, first.engine.state.wormholeUses, "transit counters must stay consistent");
  const liveProjection = createTelemetryProjection({
    state: first.engine.state,
    counts: first.engine.counts(),
    commandMode: "Launch"
  });
  assert.equal(liveProjection.factions.player.ships, first.engine.counts().playerShips, "live projection must preserve the canonical Cyan ship total");
  assert.equal(liveProjection.factions.player.worlds, first.engine.counts().playerPlanets, "live projection must preserve the canonical Cyan world total");
  assert.equal(liveProjection.rivals.worlds, first.engine.counts().rivalPlanets, "live projection must preserve the canonical rival world total");
  assert.equal(liveProjection.metrics.largestLaunch, first.engine.state.largestLaunch, "live projection must preserve the canonical largest launch");
  assert.equal(liveProjection.metrics.shipTransits, first.engine.state.shipTransits, "live projection must preserve the canonical transit total");
  assert.deepEqual(liveProjection.charts.fleetStrength, first.engine.state.shipCountTimeline, "live charts must use the engine timeline without recomputing totals");
  assert.deepEqual(liveProjection.charts.systemControl, first.engine.state.ownershipTimeline, "system-control charts must use the engine timeline");

  const commandEngine = api.createGravityFleetEngine({ randomSource: api.createSeededRandom(9) });
  commandEngine.begin();
  assert.equal(commandEngine.command("beginLaunch", { point: { x: 140, y: 400 } }), true);
  assert.equal(commandEngine.command("cancelLaunch"), true);
  assert.equal(commandEngine.state.launcher, null);
  assert.equal(commandEngine.command("beginWormhole", { point: { x: 250, y: 350 } }), true);
  assert.equal(commandEngine.command("cancelWormhole"), true);
  assert.equal(commandEngine.state.wormDrag, null);
  assert.equal(commandEngine.command("pause"), true);
  assert.equal(commandEngine.state.running, false);
  assert.equal(commandEngine.state.paused, true);
  const pausedCheckpoint = commandEngine.checkpoint();
  const pausedTimelineLength = commandEngine.state.shipCountTimeline.length;
  const pausedMotionState = JSON.stringify({
    elapsed: commandEngine.state.elapsed,
    planets: commandEngine.state.planets.map(({ id, x, y, angle }) => ({ id, x, y, angle })),
    ships: commandEngine.state.ships.map(({ id, x, y, vx, vy, state }) => ({ id, x, y, vx, vy, state })),
    effects: commandEngine.state.effects,
    events: commandEngine.state.events
  });
  for (let step = 0; step < 180; step++) assert.equal(commandEngine.step(FIXED_SIMULATION_STEP_SECONDS), null);
  assert.deepEqual(commandEngine.checkpoint(), pausedCheckpoint, "paused simulation state and telemetry must not advance");
  assert.equal(commandEngine.state.shipCountTimeline.length, pausedTimelineLength, "paused telemetry sampling must remain frozen");
  assert.equal(JSON.stringify({
    elapsed: commandEngine.state.elapsed,
    planets: commandEngine.state.planets.map(({ id, x, y, angle }) => ({ id, x, y, angle })),
    ships: commandEngine.state.ships.map(({ id, x, y, vx, vy, state }) => ({ id, x, y, vx, vy, state })),
    effects: commandEngine.state.effects,
    events: commandEngine.state.events
  }), pausedMotionState, "pause must freeze planets, ships, effects, events, and elapsed match time");
  assert.equal(commandEngine.command("resume"), true);
  assert.equal(commandEngine.state.running, true);
  assert.equal(commandEngine.state.paused, false);

  assert.equal(commandEngine.command("beginLaunch", { point: { x: 140, y: 400 } }), true);
  assert.ok(commandEngine.state.launcher, "launch gesture should begin before pause cancellation");
  assert.equal(commandEngine.command("pause"), true);
  assert.equal(commandEngine.state.launcher, null, "pause should cancel an incomplete launch gesture");
  assert.equal(commandEngine.command("resume"), true);
  assert.equal(commandEngine.command("beginWormhole", { point: { x: 280, y: 300 } }), true);
  assert.ok(commandEngine.state.wormDrag, "wormhole gesture should begin before pause cancellation");
  assert.equal(commandEngine.command("pause"), true);
  assert.equal(commandEngine.state.wormDrag, null, "pause should cancel an incomplete wormhole gesture");
  assert.equal(commandEngine.command("resume"), true);

  assert.equal(commandEngine.command("beginWormhole", { point: { x: 280, y: 300 } }), true);
  assert.equal(commandEngine.wormMode, true);
  assert.equal(commandEngine.command("cancelWormhole"), true);
  assert.equal(commandEngine.wormMode, false);
  assert.equal(commandEngine.command("beginLaunch", { point: { x: 140, y: 400 } }), true);
  assert.ok(commandEngine.state.launcher, "Launch mode should own the incomplete engine gesture");
  assert.equal(commandEngine.state.wormDrag, null, "Launch and Wormhole gestures must not both be active");
  assert.equal(commandEngine.command("cancelLaunch"), true);

  const lifespanEngine = api.createGravityFleetEngine({
    randomSource: api.createSeededRandom(91),
    playerWormholeLifespan: api.WORMHOLE_LIFESPAN_PROFILES.mobileTactical,
    effectsEnabled: false,
    trailsEnabled: false
  });
  lifespanEngine.begin();
  const cyanHome = lifespanEngine.state.planets.find(planet => planet.owner === "player" && planet.type === "home");
  assert.ok(cyanHome, "mobile lifespan fixture requires the Cyan home world");
  assert.equal(lifespanEngine.command("beginWormhole", { point: { x: cyanHome.x, y: cyanHome.y } }), true);
  assert.equal(lifespanEngine.command("updateWormhole", { point: { x: cyanHome.x + 120, y: cyanHome.y } }), true);
  assert.equal(lifespanEngine.command("commitWormhole"), true);
  assert.equal(lifespanEngine.state.wormholes.length, 1);
  assert.equal(lifespanEngine.state.wormholes[0].lifespan.id, "mobile-tactical");
  for (let step = 0; step < 30; step++) lifespanEngine.step(FIXED_SIMULATION_STEP_SECONDS);
  assert.equal(lifespanEngine.state.wormholes[0]?.phase, "preparing", "tactical wormhole should retain its short preparation window");
  for (let step = 0; step < 30; step++) lifespanEngine.step(FIXED_SIMULATION_STEP_SECONDS);
  assert.equal(lifespanEngine.state.wormholes[0]?.phase, "active", "first eligible Cyan transit should activate the tactical countdown after preparation");
  for (let step = 0; step < 180; step++) lifespanEngine.step(FIXED_SIMULATION_STEP_SECONDS);
  assert.equal(lifespanEngine.state.wormholes.length, 0, "mobile tactical wormhole should collapse roughly 2.5 seconds after activation");

  const unusedLifespanEngine = api.createGravityFleetEngine({
    randomSource: api.createSeededRandom(93),
    playerWormholeLifespan: api.WORMHOLE_LIFESPAN_PROFILES.mobileTactical,
    effectsEnabled: false,
    trailsEnabled: false
  });
  unusedLifespanEngine.begin();
  assert.equal(unusedLifespanEngine.command("beginWormhole", { point: { x: 610, y: 70 } }), true);
  assert.equal(unusedLifespanEngine.command("updateWormhole", { point: { x: 730, y: 70 } }), true);
  assert.equal(unusedLifespanEngine.command("commitWormhole"), true);
  for (let step = 0; step < 620; step++) unusedLifespanEngine.step(FIXED_SIMULATION_STEP_SECONDS);
  assert.equal(unusedLifespanEngine.state.wormholes.filter(wormhole => wormhole.owner === "player").length, 0, "unused tactical wormhole should respect its 10-second absolute maximum");

  const clearEngine = api.createGravityFleetEngine({ randomSource: api.createSeededRandom(92) });
  clearEngine.begin();
  assert.equal(clearEngine.command("beginWormhole", { point: { x: 320, y: 280 } }), true);
  assert.equal(clearEngine.command("updateWormhole", { point: { x: 440, y: 300 } }), true);
  assert.equal(clearEngine.command("commitWormhole"), true);
  assert.equal(clearEngine.state.wormholes.length, 1);
  assert.equal(clearEngine.command("clearWormhole"), true);
  assert.equal(clearEngine.state.wormholes.length, 0, "clear command should collapse the current Cyan wormhole immediately");
  assert.equal(clearEngine.command("clearWormhole"), false, "clear command should report no-op when no Cyan wormhole exists");
  assert.equal(commandEngine.command("reset", { levelId: 2 }), true);
  assert.equal(commandEngine.state.levelId, 2);

  for (const outcome of ["Victory", "Defeat"]) {
    const engine = api.createGravityFleetEngine({ randomSource: api.createSeededRandom(77), validationMode: true, createId: () => `fixture-${outcome}` });
    engine.begin();
    assert.equal(engine.forceOutcomeForValidation(outcome), outcome, `${outcome} path should remain reachable`);
    const run = engine.state.completedRun;
    assert.equal(run.outcome, outcome);
    assert.deepEqual(api.GRAVITY_FLEET_RUN_SCHEMA.filter(key => !(key in run)), [], "serialized run schema should retain all keys");
    assert.equal(run.shipTransits, run.wormholeUses);
    const runProjection = createTelemetryProjection({ run });
    const highlights = Object.fromEntries(runProjection.outcome.highlights.map(item => [item.key, item.value]));
    assert.equal(runProjection.outcome.result.score, run.score, "outcome summary and saved run must share the canonical score");
    assert.equal(runProjection.outcome.result.durationSeconds, run.durationSeconds, "outcome summary and saved run must share the canonical duration");
    assert.equal(highlights.captures, run.planetsCaptured, "post-match captures must preserve the saved-run total");
    assert.equal(highlights.destroyed, run.shipsDestroyed, "post-match destroyed ships must preserve the saved-run total");
    assert.equal(highlights.transits, run.shipTransits, "post-match transits must preserve the saved-run total");
    assert.deepEqual(runProjection.charts.fleetStrength, run.shipCountTimeline, "post-match fleet chart must use the saved timeline");
    assert.deepEqual(runProjection.charts.systemControl, run.ownershipTimeline, "post-match control chart must use the saved timeline");
  }

  assert.equal(savedFixture.storageKey, api.GRAVITY_FLEET_STORAGE_KEY);
  assert.ok(savedFixture.runs.every(api.validateSavedRun), "saved-run fixture should remain readable");
  assert.deepEqual(api.GRAVITY_FLEET_RUN_SCHEMA.filter(key => !(key in savedFixture.runs[0])), [], "compatibility fixture should retain the public schema");
  const storage = memoryStorage({ [api.GRAVITY_FLEET_STORAGE_KEY]: JSON.stringify(savedFixture.runs) });
  assert.equal(api.readSavedRuns(storage).length, savedFixture.runs.length);
  assert.equal(api.writeSavedRun(storage, savedFixture.runs[0]), true);
  assert.equal(JSON.parse(storage.value(api.GRAVITY_FLEET_STORAGE_KEY)).length, 2);
  const legacyRunBeforeProjection = JSON.stringify(savedFixture.runs[0]);
  const legacyProjection = createTelemetryProjection({ run: savedFixture.runs[0] });
  assert.equal(legacyProjection.outcome.result.score, savedFixture.runs[0].score, "legacy saved-run score must remain renderable");
  assert.equal(legacyProjection.outcome.result.durationSeconds, savedFixture.runs[0].durationSeconds, "legacy saved-run duration must remain renderable");
  assert.equal(legacyProjection.metrics.shipTransits, savedFixture.runs[0].shipTransits ?? savedFixture.runs[0].wormholeUses ?? 0, "legacy transit fallback must remain compatible");
  assert.equal(JSON.stringify(savedFixture.runs[0]), legacyRunBeforeProjection, "projection must not mutate saved-run records");

  let schedulerCanRun = true;
  let timerId = 0;
  const scheduled = new Map();
  const renderReasons = [];
  const chartScheduler = createTelemetryChartScheduler({
    render: event => renderReasons.push(event.reason),
    shouldRun: () => schedulerCanRun,
    schedule: callback => {
      const id = ++timerId;
      scheduled.set(id, callback);
      return id;
    },
    cancel: id => scheduled.delete(id)
  });
  chartScheduler.sync();
  assert.equal(renderReasons.length, 0, "closed charts must not render");
  assert.equal(scheduled.size, 0, "closed charts must not schedule continuous work");
  chartScheduler.open();
  assert.deepEqual(renderReasons, ["open"], "opening the drawer must draw immediately");
  assert.equal(scheduled.size, 1, "visible running charts must schedule one update");
  const firstChartTimer = scheduled.entries().next().value;
  scheduled.delete(firstChartTimer[0]);
  firstChartTimer[1]();
  assert.deepEqual(renderReasons, ["open", "interval"], "visible charts must render on their interval");
  assert.equal(scheduled.size, 1, "the visible scheduler must retain only one future update");
  schedulerCanRun = false;
  chartScheduler.sync();
  assert.equal(scheduled.size, 0, "paused or hidden charts must cancel future work");
  chartScheduler.close();
  assert.equal(scheduled.size, 0, "closing the drawer must leave no scheduled chart work");
  const rendersBeforeFinal = renderReasons.length;
  chartScheduler.final();
  assert.equal(renderReasons.length, rendersBeforeFinal + 1, "match end must render one final chart state");
  assert.equal(renderReasons.at(-1), "final");
  assert.equal(scheduled.size, 0, "final rendering must not restart chart scheduling");

  const combinedSource = [corePath, levelsPath, telemetryPath].map(file => fs.readFileSync(file, "utf8")).join("\n");
  const forbidden = ["document", "window", "matchMedia", "localStorage", "getBoundingClientRect", "devicePixelRatio", "screen.orientation"];
  assert.deepEqual(forbidden.filter(token => combinedSource.includes(token)), [], "engine modules must be presentation-neutral");
  const labSource = fs.readFileSync(path.join(root, "games", "gravity-fleet-lab.js"), "utf8");
  const labMarkup = fs.readFileSync(path.join(root, "games", "gravity-fleet-lab.html"), "utf8");
  const fallbackSource = fs.readFileSync(path.join(root, "games", "gravity-fleet-fallback.js"), "utf8");
  assert.match(labSource, /createTelemetryProjection/, "browser surfaces must consume the shared telemetry projection");
  assert.match(labSource, /createTelemetryChartScheduler/, "mobile charts must use the visibility-aware scheduler");
  assert.match(labSource, /showOutcomeOverlay\(run\);\s*updateTelemetryBadgeVisibility\(\);\s*updateCommandDock\(\);\s*try \{\s*mobileChartScheduler\.final\(\);/s, "match completion must present the result before optional chart work");
  assert.match(labSource, /renderDashboard\(run\)\.catch\(error =>/, "post-match dashboard failures must be handled locally");
  assert.match(labSource, /if \(dashboardRunId === runId\) dashboardRenderPromise = null;/, "a failed dashboard render must remain retryable");
  assert.match(labSource, /try \{\s*mobileChartScheduler\.final\(\);[\s\S]*?\} catch \(error\) \{\s*reportPostMatchRenderFailure\(error\);\s*\}/, "final mobile chart work must not escape match completion");
  assert.match(labSource, /if \(!state\?\.ended && \(mobileShellState === "preparing" \|\| mobileShellState === "ready"\)\) rollbackMobileShell\(reason\);/, "post-match errors must not trigger mobile shell rollback");
  assert.match(labSource, /function chartContext\(canvasEl\)[\s\S]*?if \(!x\) return;/, "chart renderers must tolerate an unavailable 2D context");
  assert.match(labSource, /lineChart\(ui\.shipChart, telemetry\.charts\.fleetStrength, contestTeamKeys\);/, "the post-match fleet-strength chart must receive the projected fleet series");
  assert.match(labSource, /lineChart\(ui\.ownerChart, telemetry\.charts\.systemControl, activeTeamKeys\);/, "the post-match system-control chart must receive the projected control series");
  assert.doesNotMatch(labSource, /mobileDrawerEvents/, "the primary mobile drawer must not render the full event feed");
  assert.doesNotMatch(labSource, /gravityMobileShell|gravity-mobile-shell-legacy|mobileShellFlavor|usesModernMobileShell/, "the removed legacy mobile shell must not retain a selector or compatibility branch");
  assert.match(labSource, /gravityCanvasFailure/, "development QA must retain a canvas-failure simulation path");
  assert.match(labMarkup, /id="gameCanvasFallback"/, "canvas initialization failure must expose a controlled fallback");
  assert.match(labMarkup, /id="gravityFleetModuleScript"[^>]*type="module"/, "the module script must expose a direct load-error target");
  assert.match(fallbackSource, /src\*="gravity-fleet-lab"/, "the watchdog must also find Vite's generated module script");
  assert.match(fallbackSource, /addEventListener\("error", showFallback/, "module load errors must expose the controlled fallback directly");
  assert.match(fallbackSource, /gravityfleet:ready/, "module readiness must reconcile a delayed watchdog fallback");
  assert.match(labSource, /dispatchEvent\(new CustomEvent\("gravityfleet:ready"/, "successful initialization must notify the watchdog");
  validateModuleFailureWatchdog(fallbackSource);
  assert.match(labMarkup, /id="mobileFleetChart"/, "mobile drawer must include the real fleet-strength chart");
  assert.match(labMarkup, /id="mobileSystemDonut"/, "mobile drawer must include the real system-mix donut");
  assert.match(labMarkup, /id="viewMatchAnalysis"/, "the outcome dialog must retain the analysis action");
  assert.match(labMarkup, /id="playAgain"/, "the outcome dialog must retain the replay action");
  assert.match(labMarkup, /id="chooseLevel"/, "the outcome dialog must retain the level-selection action");
  assert.match(labMarkup, /<summary>All match statistics<\/summary>/, "lower-priority analytics must use the All match statistics disclosure");

  const disabledMonitor = createPerformanceMonitor();
  assert.equal(disabledMonitor.enabled, false);
  assert.equal(disabledMonitor.measure("simulation", () => 42), 42);
  assert.equal(disabledMonitor.snapshot(), null);
  let instant = 0;
  const enabledMonitor = createPerformanceMonitor({ enabled: true, now: () => instant });
  enabledMonitor.measure("simulation", () => { instant += 3; });
  enabledMonitor.recordFrame(10);
  enabledMonitor.recordFrame(65);
  enabledMonitor.resetFrameTiming();
  enabledMonitor.recordFrame(10000);
  enabledMonitor.recordFrame(10016);
  enabledMonitor.setGauge("activeShips", 12);
  const metrics = enabledMonitor.snapshot();
  assert.equal(metrics.timings.simulation.medianMs, 3);
  assert.equal(metrics.frames.over50Ms, 1);
  assert.equal(metrics.frames.samples, 2, "restoration should begin a new frame-timing epoch");
  assert.equal(metrics.gauges.activeShips, 12);

  function runAtDisplayRate(displayFps) {
    const testEngine = api.createGravityFleetEngine({
      levelId: 1,
      randomSource: api.createSeededRandom(8128),
      validationMode: true,
      effectsEnabled: false,
      trailsEnabled: false
    });
    const testRuntime = createFixedStepRuntime();
    testEngine.begin();
    testRuntime.reset(0, { resetRender: true });
    let steps = 0;
    const frames = displayFps * 12;
    for (let frame = 1; frame <= frames; frame++) {
      const timestamp = frame * 12000 / frames;
      const advance = testRuntime.advance(timestamp, { running: true });
      steps += advance.steps;
      for (let index = 0; index < advance.steps; index++) testEngine.step(FIXED_SIMULATION_STEP_SECONDS);
      testRuntime.shouldRender(timestamp, 1000 / displayFps);
    }
    return { checkpoint: testEngine.checkpoint(), steps, runtime: testRuntime.snapshot() };
  }

  const thirtyHertz = runAtDisplayRate(30);
  const sixtyHertz = runAtDisplayRate(60);
  const oneFortyFourHertz = runAtDisplayRate(144);
  assert.equal(thirtyHertz.steps, 720, "twelve seconds should advance exactly 720 fixed steps");
  assert.equal(sixtyHertz.steps, thirtyHertz.steps);
  assert.equal(oneFortyFourHertz.steps, thirtyHertz.steps);
  assert.deepEqual(sixtyHertz.checkpoint, thirtyHertz.checkpoint, "simulation must not depend on 30 Hz versus 60 Hz rendering");
  assert.deepEqual(oneFortyFourHertz.checkpoint, thirtyHertz.checkpoint, "simulation must not depend on high-refresh rendering");

  const restoredRuntime = createFixedStepRuntime();
  restoredRuntime.reset(0);
  assert.equal(restoredRuntime.advance(1000, { running: true }).steps, 8, "catch-up work must be capped");
  assert.ok(restoredRuntime.snapshot().droppedSimulationSeconds > 0, "excess catch-up time should be discarded");
  restoredRuntime.reset(60000);
  assert.equal(restoredRuntime.advance(60000 + 1000 / 60, { running: true }).steps, 1, "restoration should not apply hidden elapsed time");
  restoredRuntime.advance(120000, { running: false });
  restoredRuntime.reset(120000);
  assert.equal(restoredRuntime.advance(120000 + 1000 / 60, { running: true }).steps, 1, "resume should begin a fresh timing epoch without catch-up");

  const desktopProfile = selectPresentationProfile();
  const mobileProfile = selectPresentationProfile({ mobile: true });
  const reducedProfile = selectPresentationProfile({ reducedMotion: true });
  assert.equal(desktopProfile.renderIntervalMs, 0, "desktop rendering should follow the display");
  assert.equal(mobileProfile.renderIntervalMs, 1000 / 30, "mobile rendering should target 30 FPS");
  assert.equal(desktopProfile.trailsEnabled, true);
  assert.equal(mobileProfile.trailsEnabled, false);
  assert.equal(reducedProfile.effectsEnabled, false);
  assert.equal(reducedProfile.trailsEnabled, false);

  const worldBounds = Object.freeze({ x: 0, y: 0, width: 1280, height: 800 });
  const desktopCamera = createGravityFleetCamera({
    worldBounds,
    viewport: worldBounds,
    tacticalRect: worldBounds,
    orientation: CAMERA_ORIENTATIONS.desktop
  });
  for (const point of [{ x: 0, y: 0 }, { x: 640, y: 400 }, { x: 1280, y: 800 }, { x: 140, y: 400 }]) {
    assert.deepEqual(desktopCamera.worldToScreen(point), point, "desktop camera should begin as an identity transform");
    assert.deepEqual(desktopCamera.screenToWorld(point), point, "desktop inverse should preserve existing mouse coordinates");
  }

  const portraitTacticalRect = { x: 18, y: 108, width: 394, height: 692 };
  const portraitCamera = createGravityFleetCamera({
    worldBounds,
    viewport: { x: 0, y: 0, width: 430, height: 932 },
    tacticalRect: portraitTacticalRect,
    orientation: CAMERA_ORIENTATIONS.portrait
  });
  const portraitSnapshot = portraitCamera.diagnostics();
  assert.equal(portraitSnapshot.rotationDegrees, -90);
  assert.ok(portraitCamera.worldToScreen({ x: 140, y: 400 }).y > portraitSnapshot.screenCenter.y, "the Cyan starting side should frame toward the bottom in portrait");
  const worldCorners = [
    { x: 0, y: 0 }, { x: 1280, y: 0 }, { x: 1280, y: 800 }, { x: 0, y: 800 }
  ];
  for (const point of worldCorners) {
    const screen = portraitCamera.worldToScreen(point);
    assert.ok(screen.x >= portraitTacticalRect.x - 1e-7 && screen.x <= portraitTacticalRect.x + portraitTacticalRect.width + 1e-7, "portrait world corner should fit the tactical width");
    assert.ok(screen.y >= portraitTacticalRect.y - 1e-7 && screen.y <= portraitTacticalRect.y + portraitTacticalRect.height + 1e-7, "portrait world corner should fit the tactical height");
    const roundTrip = portraitCamera.screenToWorld(screen);
    assert.ok(Math.abs(roundTrip.x - point.x) < 1e-7 && Math.abs(roundTrip.y - point.y) < 1e-7, "inverse camera hit testing should remain accurate at world corners");
  }

  const landscapeCamera = createGravityFleetCamera({
    worldBounds,
    viewport: { x: 0, y: 0, width: 856, height: 375 },
    tacticalRect: { x: 18, y: 54, width: 820, height: 257 },
    orientation: CAMERA_ORIENTATIONS.landscape
  });
  assert.equal(landscapeCamera.diagnostics().rotationDegrees, 0, "mobile landscape should retain native world orientation");
  const immutableWorldBeforeResize = { ...worldBounds };
  portraitCamera.configure({
    worldBounds,
    viewport: { x: 0, y: 0, width: 390, height: 844 },
    tacticalRect: { x: 18, y: 96, width: 354, height: 626 },
    orientation: CAMERA_ORIENTATIONS.portrait
  });
  assert.deepEqual(worldBounds, immutableWorldBeforeResize, "camera resize must not mutate gameplay coordinates");

  console.log(`Gravity Fleet validation passed: ${LEVELS.length} levels, deterministic command fixture, win/loss paths, shared telemetry projection parity, saved-run compatibility, hidden-chart scheduling, pause/resume, touch-command cancellation, configurable wormhole lifespan, core boundary, render-independent fixed timestep, and invertible desktop/portrait/landscape cameras.`);
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
