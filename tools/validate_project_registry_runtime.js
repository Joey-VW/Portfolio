#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = vm.createContext({
  console,
  URLSearchParams,
  WeakMap,
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  window: {
    matchMedia: () => ({ matches: false }),
  },
});

vm.runInContext(fs.readFileSync("script.js", "utf8"), context);
const evaluate = (source) => vm.runInContext(source, context);

const valid = {
  title: "Valid",
  slug: "valid",
  createdAt: "2026-07-15",
  status: "ready",
  visibility: "public",
};

assert.equal(evaluate(`isProjectPublishable(${JSON.stringify(valid)})`), true);
assert.equal(evaluate(`isProjectPublishable(${JSON.stringify({ ...valid, createdAt: "0001-01-01" })})`), true);
assert.equal(evaluate(`isProjectPublishable(${JSON.stringify({ ...valid, createdAt: "0099-12-31" })})`), true);

const invalidProjects = [
  { ...valid, createdAt: undefined },
  { ...valid, createdAt: "2026-7-15" },
  { ...valid, createdAt: "2026-02-30" },
  { ...valid, createdAt: "0000-01-01" },
  { ...valid, status: undefined },
  { ...valid, status: "Ready" },
  { ...valid, status: "in-progress" },
  { ...valid, status: "planned" },
  { ...valid, visibility: undefined },
  { ...valid, visibility: "Public" },
  { ...valid, visibility: "hidden" },
];

invalidProjects.forEach((project) => {
  assert.equal(
    evaluate(`isProjectPublishable(${JSON.stringify(project)})`),
    false,
    `Expected project to fail closed: ${JSON.stringify(project)}`
  );
});

const fixture = [
  { title: "Zulu", slug: "zulu", createdAt: "2026-05-01" },
  { title: "Older", slug: "older", createdAt: "2025-12-31" },
  { title: "Alpha", slug: "alpha", createdAt: "2026-05-01" },
];
const actual = evaluate(
  `JSON.stringify(sortProjectsNewestFirst(${JSON.stringify(fixture)}).map(({ title }) => title))`
);

assert.equal(actual, JSON.stringify(["Alpha", "Zulu", "Older"]));
console.log("Project lifecycle and deterministic ordering checks passed.");
