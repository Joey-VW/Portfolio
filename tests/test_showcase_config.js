#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const contract = require("../showcase-config.js");

const root = path.join(__dirname, "..");
const version2 = JSON.parse(fs.readFileSync(path.join(root, "data", "showcase-config.json"), "utf8"));
const validated = contract.migrateFile(version2);
assert.equal(validated.version, 2);
assert.equal(validated.saved.webs.length, 7);
assert.equal(validated.saved.config.line.gradientEnabled, true);
assert.equal(validated.original.config.line.gradientEnabled, false);

const toV1Snapshot = (snapshot) => {
  const migrated = contract.clone(snapshot);
  delete migrated.config.effects;
  delete migrated.webs;
  for (const key of Object.keys(contract.LINE_V2_DEFAULTS)) delete migrated.config.line[key];
  return migrated;
};
const v1 = {
  version: 1,
  original: toV1Snapshot(version2.original),
  saved: toV1Snapshot(version2.saved),
};
const migrated = contract.migrateFile(v1);
assert.equal(migrated.version, 2);
assert.equal(migrated.saved.config.layout.hubYOffsetRatio, v1.saved.config.layout.hubYOffsetRatio);
assert.equal(migrated.original.config.line.gradientEnabled, false);
assert.equal(migrated.saved.config.line.gradientEnabled, true);
assert.deepEqual(migrated.saved.webs, contract.makeWebs());

const expectInvalid = (mutate, pattern) => {
  const candidate = contract.clone(validated.saved);
  mutate(candidate);
  assert.throws(() => contract.validateSnapshot(candidate), pattern);
};
expectInvalid((snapshot) => { delete snapshot.config.effects; }, /config groups are incomplete/);
expectInvalid((snapshot) => { snapshot.config.line.startColor = "cyan"; }, /six-digit hex color/);
expectInvalid((snapshot) => { snapshot.config.line.gradientEnabled = 1; }, /must be a boolean/);
expectInvalid((snapshot) => { snapshot.nodePlacements.pop(); }, /must contain 7/);
expectInvalid((snapshot) => { snapshot.webs.pop(); }, /must contain 7/);
expectInvalid((snapshot) => { snapshot.webs[0].overrides.glowBlur = 99; }, /outside allowed range/);
expectInvalid((snapshot) => { snapshot.webs[0].overrides.unknown = 1; }, /unsupported/);
assert.equal(contract.equal({ value: 0.3000000001 }, { value: 0.3 }), true);

console.log("Showcase configuration contract tests passed.");
