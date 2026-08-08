#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const requiredFiles = [
  "_headers",
  "_redirects",
  "_routes.json",
  "index.html",
  "styles.css",
  "script.js",
  "assets/img/favicon.svg",
  "assets/img/og/joe-wisto-portfolio.svg",
  "data/projects.json",
  "data/showcase-config.json",
  "data/ev-true-cost.json",
  "data/gravity-fleet-sample-runs.json",
  "data/colony-sample-runs.json",
  "data/procurement-kpi-analysis.json",
  "data/quote-to-cash-workflow-audit.json",
  "data/shrinkflation-products.json",
  "data/phx-transit/synthetic/operations-replay.json",
  "data/phx-transit/synthetic/state-scenarios.json",
  "games/gravity-fleet/core.mjs",
  "games/gravity-fleet/levels.mjs",
  "projects/phx-transit-pulse.js",
  "projects/phx-transit-pulse-map.js",
  "projects/multi-platform-publishing-system/demo/assets/video-bg/manifest.json",
  "projects/multi-platform-publishing-system/demo/data/blog-posts.csv",
  "projects/multi-platform-publishing-system/demo/data/map-photos.csv",
  "docs/procurement/README.md",
  "docs/qtc/README.md",
];

const publicDocsAllowlist = [
  "docs/procurement/README.md",
  "docs/procurement/data-contract.md",
  "docs/procurement/metric-dictionary.md",
  "docs/qtc/README.md",
  "docs/qtc/data-contract.md",
  "docs/qtc/methodology.md",
];

const forbiddenTopLevel = [
  ".agents",
  ".codex",
  ".github",
  ".npm-cache",
  ".ruff_cache",
  ".venv",
  "data-src",
  "firstPassOriginal",
  "node_modules",
  "repo_pack",
  "schemas",
  "sql",
  "tests",
  "tools",
];

const forbiddenFiles = [
  "AGENTS.md",
  "PORTFOLIO_ROADMAP.md",
  "README.md",
  "package.json",
  "package-lock.json",
  "pyproject.toml",
  "uv.lock",
  "data/procurement-source.csv",
  "data/shrinkflation-api-targets.json",
  "data/shrinkflation-products.kroger-staging.json",
  "projects/multi-platform-publishing-system/demo/tools/build-video-manifest.cjs",
  "projects/multi-platform-publishing-system/demo/tools/drive_video_manifest.gs",
];

const forbiddenSubstrings = [
  "data/phx-transit/verification/",
  "assets/docs/archive/",
  "__pycache__",
  ".git",
];

const secretPatterns = [
  /BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY/,
  /\bKROGER_CLIENT_(?:ID|SECRET)\b/,
  /\b[A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)[A-Za-z0-9_]*\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /\bC:\\Users\\[^\\\s]+/i,
  /\b\/Users\/[^/\s]+/,
  /\b\/home\/[^/\s]+/,
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function gitLsFiles(patterns) {
  return execFileSync("git", ["ls-files", "--", ...patterns], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function routeForHtml(file) {
  if (file === "index.html") return "index.html";
  return file.endsWith("/index.html") ? file : file;
}

function hashDeployableFiles(files) {
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    const rel = relative(dist, file).split(sep).join("/");
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  fail("dist/ does not exist. Run npm run build first.");
}

for (const file of gitLsFiles(["*.html"]).map(routeForHtml)) {
  if (!existsSync(join(dist, file)))
    fail(`Missing HTML route in dist: ${file}`);
}

for (const file of requiredFiles) {
  if (!existsSync(join(dist, file)))
    fail(`Missing required dist file: ${file}`);
}

if (existsSync(join(dist, "_routes.json"))) {
  try {
    const routes = JSON.parse(
      readFileSync(join(dist, "_routes.json"), "utf8"),
    );
    const routesAreScoped =
      routes?.version === 1 &&
      Array.isArray(routes.include) &&
      routes.include.length === 1 &&
      routes.include[0] === "/api/contact" &&
      Array.isArray(routes.exclude) &&
      routes.exclude.length === 0;
    if (!routesAreScoped) {
      fail("_routes.json must invoke Pages Functions only for /api/contact.");
    }
  } catch (error) {
    fail(
      `Invalid _routes.json: ${error instanceof Error ? error.message : error}`,
    );
  }
}

for (const entry of forbiddenTopLevel) {
  if (existsSync(join(dist, entry)))
    fail(`Forbidden top-level path in dist: ${entry}`);
}

for (const file of forbiddenFiles) {
  if (existsSync(join(dist, file))) fail(`Forbidden file in dist: ${file}`);
}

const allFiles = await walk(dist);
for (const file of allFiles) {
  const rel = relative(dist, file).split(sep).join("/");
  if (rel.startsWith("docs/") && !publicDocsAllowlist.includes(rel)) {
    fail(`Unapproved docs file in dist: ${rel}`);
  }

  if (forbiddenSubstrings.some((substring) => rel.includes(substring))) {
    fail(`Forbidden path in dist: ${rel}`);
  }

  if (/\.(?:html|css|js|mjs|json|csv|md|txt|svg|xml|webmanifest)$/i.test(rel)) {
    const text = readFileSync(file, "utf8");
    for (const pattern of secretPatterns) {
      if (pattern.test(text))
        fail(`Forbidden secret/local-path pattern in dist: ${rel}`);
    }
    if (/\/(?:data|assets|projects|games|docs)\//.test(text)) {
      for (const match of text.matchAll(
        /["'`](\/(?:data|assets|projects|games|docs)\/[^"'`#?)\s]+)/g,
      )) {
        const candidate = match[1].replace(/^\//, "");
        if (!existsSync(join(dist, candidate)))
          fail(
            `Root-relative reference missing from dist: ${match[1]} in ${rel}`,
          );
      }
    }
  }
}

console.log(
  `Dist validation passed: ${allFiles.length} files, sha256 ${hashDeployableFiles(allFiles)}.`,
);
