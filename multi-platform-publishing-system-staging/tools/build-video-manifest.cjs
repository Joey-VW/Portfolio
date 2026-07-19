#!/usr/bin/env node

/**
 * Builds assets/video-bg/manifest.json from local files in assets/video-bg.
 *
 * Run from anywhere:
 *   node tools/build-video-manifest.cjs
 */

const fs = require("node:fs");
const path = require("node:path");

const VIDEO_DIR_URL = "./assets/video-bg";
const POSTER_URL = "./assets/background_image_clean.jpg";
const MANIFEST_FILE = "manifest.json";

const SUPPORTED_TYPES = new Map([
  [".mp4", "video/mp4"],
  [".m4v", "video/mp4"],
  [".webm", "video/webm"],
]);

const repoRoot = path.resolve(__dirname, "..");
const videoDir = path.join(repoRoot, "assets", "video-bg");
const manifestPath = path.join(videoDir, MANIFEST_FILE);

function main() {
  if (!fs.existsSync(videoDir)) {
    console.error(`Could not find video directory: ${videoDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(videoDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName !== MANIFEST_FILE)
    .filter((fileName) => !fileName.startsWith("."))
    .filter((fileName) => SUPPORTED_TYPES.has(path.extname(fileName).toLowerCase()))
    .sort(naturalSort);

  const manifest = {
    items: files.map(buildManifestItem),
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const relativeManifestPath = path.relative(repoRoot, manifestPath);
  console.log(`Wrote ${relativeManifestPath} with ${manifest.items.length} video item(s).`);

  if (manifest.items.length === 0) {
    console.warn("No supported video files found. Supported extensions: .mp4, .m4v, .webm");
  }
}

function buildManifestItem(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);
  const extWithoutDot = ext.slice(1);

  return {
    id: slugify(`${baseName}-${extWithoutDot}`),
    name: buildDisplayName(baseName),
    src: `${VIDEO_DIR_URL}/${encodeURIComponent(fileName)}`,
    type: SUPPORTED_TYPES.get(ext),
    poster: POSTER_URL,
  };
}

function buildDisplayName(baseName) {
  const numericMatch = String(baseName).match(/^(\d+)$/);

  if (numericMatch) {
    return `Background video ${numericMatch[1]}`;
  }

  const readableName = String(baseName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!readableName) {
    return "Background video";
  }

  return `Background video ${toTitleCase(readableName)}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "background-video";
}

function toTitleCase(value) {
  return String(value).replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

main();
