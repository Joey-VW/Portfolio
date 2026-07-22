#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const corePath = path.join(root, "games", "gravity-fleet", "core.mjs");
const levelsPath = path.join(root, "games", "gravity-fleet", "levels.mjs");
const performancePath = path.join(root, "games", "gravity-fleet", "performance.mjs");
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
  const { LEVELS } = await import(pathToFileURL(levelsPath));
  const { createPerformanceMonitor } = await import(pathToFileURL(performancePath));
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
  assert.equal(commandEngine.command("resume"), true);
  assert.equal(commandEngine.state.running, true);
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
  enabledMonitor.setGauge("activeShips", 12);
  const metrics = enabledMonitor.snapshot();
  assert.equal(metrics.timings.simulation.medianMs, 3);
  assert.equal(metrics.frames.over50Ms, 1);
  assert.equal(metrics.gauges.activeShips, 12);

  console.log(`Gravity Fleet validation passed: ${LEVELS.length} levels, deterministic command fixture, win/loss paths, saved-run schema, telemetry, and core boundary.`);
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
