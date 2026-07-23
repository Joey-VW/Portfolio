#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const corePath = path.join(root, "games", "gravity-fleet", "core.mjs");
const cameraPath = path.join(root, "games", "gravity-fleet", "camera.mjs");
const levelsPath = path.join(root, "games", "gravity-fleet", "levels.mjs");
const performancePath = path.join(root, "games", "gravity-fleet", "performance.mjs");
const runtimePath = path.join(root, "games", "gravity-fleet", "runtime.mjs");
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
  const { LEVELS } = await import(pathToFileURL(levelsPath));
  const { createPerformanceMonitor } = await import(pathToFileURL(performancePath));
  const { createFixedStepRuntime, selectPresentationProfile, FIXED_SIMULATION_STEP_SECONDS } = await import(pathToFileURL(runtimePath));
  const commandFixture = readJson("level-1-command-sequence.json");
  const savedFixture = readJson("saved-run-v1.json");

  assert.equal(LEVELS.length, 3, "the existing three levels must remain registered");
  for (const level of LEVELS) {
    const engine = api.createGravityFleetEngine({ levelId: level.id, randomSource: api.createSeededRandom(1000 + level.id) });
    assert.equal(engine.state.levelId, level.id);
    assert.equal(engine.state.planets.length, level.planetSeeds.length);
    assert.ok(engine.state.ships.length > 0, `level ${level.id} should initialize ships`);
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
  }

  assert.equal(savedFixture.storageKey, api.GRAVITY_FLEET_STORAGE_KEY);
  assert.ok(savedFixture.runs.every(api.validateSavedRun), "saved-run fixture should remain readable");
  assert.deepEqual(api.GRAVITY_FLEET_RUN_SCHEMA.filter(key => !(key in savedFixture.runs[0])), [], "compatibility fixture should retain the public schema");
  const storage = memoryStorage({ [api.GRAVITY_FLEET_STORAGE_KEY]: JSON.stringify(savedFixture.runs) });
  assert.equal(api.readSavedRuns(storage).length, savedFixture.runs.length);
  assert.equal(api.writeSavedRun(storage, savedFixture.runs[0]), true);
  assert.equal(JSON.parse(storage.value(api.GRAVITY_FLEET_STORAGE_KEY)).length, 2);

  const combinedSource = [corePath, levelsPath].map(file => fs.readFileSync(file, "utf8")).join("\n");
  const forbidden = ["document", "window", "matchMedia", "localStorage", "getBoundingClientRect", "devicePixelRatio", "screen.orientation"];
  assert.deepEqual(forbidden.filter(token => combinedSource.includes(token)), [], "engine modules must be presentation-neutral");

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

  console.log(`Gravity Fleet validation passed: ${LEVELS.length} levels, deterministic command fixture, win/loss paths, saved-run schema, telemetry, pause/resume, touch-command cancellation, configurable wormhole lifespan, core boundary, render-independent fixed timestep, and invertible desktop/portrait/landscape cameras.`);
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
