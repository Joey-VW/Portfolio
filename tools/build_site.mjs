#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const copyEntries = [
  "_headers",
  "_redirects",
  "script.js",
  "styles.css",
  "data/projects.json",
  "data/showcase-config.json",
  "data/ev-true-cost.json",
  "data/gravity-fleet-sample-runs.json",
  "games/gravity-fleet-fallback.js",
  "data/colony-sample-runs.json",
  "data/procurement-kpi-analysis.json",
  "data/quote-to-cash-workflow-audit.json",
  "data/shrinkflation-products.json",
  "data/phx-transit/synthetic",
  "docs/procurement/README.md",
  "docs/procurement/data-contract.md",
  "docs/procurement/metric-dictionary.md",
  "docs/qtc/README.md",
  "docs/qtc/data-contract.md",
  "docs/qtc/methodology.md",
  "projects/multi-platform-publishing-system/demo/assets/background_image_clean.jpg",
  "projects/multi-platform-publishing-system/demo/assets/css",
  "projects/multi-platform-publishing-system/demo/assets/js",
  "projects/multi-platform-publishing-system/demo/assets/video-bg",
  "projects/multi-platform-publishing-system/demo/data",
];

const browserRuntimeFiles = execFileSync(
  "git",
  [
    "ls-files",
    "--",
    "games/*.css",
    "games/*.js",
    "games/**/*.mjs",
    "projects/*.css",
    "projects/*.js",
  ],
  { cwd: root, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);

const browserImageFiles = execFileSync(
  "git",
  ["ls-files", "--", "assets/img"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split(/\r?\n/)
  .filter((file) => file && !file.endsWith("/.gitkeep"));

async function copyIntoDist(relativePath) {
  const from = join(root, relativePath);
  const to = join(dist, relativePath);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

await rm(dist, { recursive: true, force: true });
execFileSync(
  process.execPath,
  [join(root, "node_modules/vite/bin/vite.js"), "build"],
  {
    cwd: root,
    stdio: "inherit",
  },
);

for (const entry of copyEntries) {
  await copyIntoDist(entry);
}

for (const file of browserRuntimeFiles) {
  await copyIntoDist(file);
}

for (const file of browserImageFiles) {
  await copyIntoDist(file);
}

console.log(
  `Copied ${copyEntries.length + browserRuntimeFiles.length + browserImageFiles.length} reviewed static entries into dist.`,
);
