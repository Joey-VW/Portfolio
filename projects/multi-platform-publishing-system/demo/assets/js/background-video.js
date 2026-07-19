import { SITE_CONFIG } from "./config.js";

const DEFAULTS = {
  enabled: false,
  manifestUrl: "",
  items: [],
  shuffle: true,
  transitionMs: 2600,
  minPlayMs: 12000,
  minDwellMs: 1200,
  maxPlayMs: 30000,
  opacity: 0.5,
  overlayOpacity: 0.5,
  mediaBrightness: 1.08,
  mediaSaturation: 0.98,
  respectReducedMotion: true,
  fallbackImageUrl: "",
  fallbackImageOpacity: 0.9,
  coldStartMinImageMs: 0,
};

const FALLBACK_MANIFEST_URL = "./assets/video-bg/manifest.json";
const LOAD_TIMEOUT_MS = 9000;
const PLAY_TIMEOUT_MS = 6000;
const MAX_FAILURES_PER_CYCLE = 3;
const WARM_START_STORAGE_KEY = "atlasAmbientBackgroundStarted";

let controller;

export function initBackgroundVideo() {
  if (controller) return controller;

  const config = { ...DEFAULTS, ...(SITE_CONFIG.backgroundVideos || {}) };
  const isColdStart = shouldUseColdStartFallback();
  rememberBackgroundStart();

  const root = createBackgroundLayer(config, isColdStart);
  document.body.prepend(root.container);
  document.documentElement.style.setProperty("--bg-video-opacity", String(config.opacity));
  document.documentElement.style.setProperty("--bg-video-overlay-opacity", String(config.overlayOpacity));
  document.documentElement.style.setProperty("--bg-media-brightness", String(config.mediaBrightness));
  document.documentElement.style.setProperty("--bg-media-saturation", String(config.mediaSaturation));
  document.documentElement.style.setProperty("--bg-video-transition-ms", `${config.transitionMs}ms`);
  if (config.fallbackImageUrl) {
    document.documentElement.style.setProperty(
      "--bg-fallback-image",
      `url("${config.fallbackImageUrl}")`
    );
  }
  document.documentElement.style.setProperty(
    "--bg-fallback-image-opacity",
    String(config.fallbackImageOpacity)
  );

  controller = new BackgroundVideoController(root, config);
  controller.start();
  return controller;
}

function createBackgroundLayer(config, isColdStart) {
  const container = document.createElement("div");
  container.className = "ambient-video-bg";
  container.setAttribute("aria-hidden", "true");
  container.dataset.state = "loading";
  container.dataset.start = isColdStart ? "cold" : "warm";

  const fallback = document.createElement("div");
  fallback.className = "ambient-video-bg__fallback";
  if (config.fallbackImageUrl) {
    fallback.style.backgroundImage = `url("${config.fallbackImageUrl}")`;
  }

  const videos = [createVideoElement(), createVideoElement()];
  const overlay = document.createElement("div");
  overlay.className = "ambient-video-bg__overlay";

  container.append(fallback);
  videos.forEach((video) => container.append(video));
  container.append(overlay);

  if (!config.enabled) container.dataset.state = "disabled";

  return { container, videos, fallback };
}

function shouldUseColdStartFallback() {
  return !hasStoredBackgroundStart() && !hasSameOriginReferrer();
}

function hasStoredBackgroundStart() {
  try {
    return window.sessionStorage?.getItem(WARM_START_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberBackgroundStart() {
  try {
    window.sessionStorage?.setItem(WARM_START_STORAGE_KEY, "true");
  } catch {
    // Storage may be blocked; same-origin referrer still handles ordinary navigation.
  }
}

function hasSameOriginReferrer() {
  if (!document.referrer) return false;

  try {
    return new URL(document.referrer, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function createVideoElement() {
  const video = document.createElement("video");
  video.className = "ambient-video-bg__video";
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.loop = false;
  video.preload = "metadata";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("aria-hidden", "true");
  video.tabIndex = -1;
  return video;
}

class BackgroundVideoController {
  constructor(root, config) {
    this.container = root.container;
    this.videos = root.videos;
    this.config = config;
    this.items = [];
    this.index = 0;
    this.activeSlot = 0;
    this.timer = 0;
    this.resetTimers = [0, 0];
    this.stopped = false;
    this.failures = 0;
    this.activeStartedAt = 0;
    this.isTransitioning = false;
    this.runToken = 0;
    this.slotTokens = [0, 0];
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onActiveVideoProblem = this.onActiveVideoProblem.bind(this);
    this.createdAt = performance.now();
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  async start() {
    if (!this.config.enabled || this.shouldUseFallbackOnly()) {
      this.setFallbackState("fallback");
      return;
    }

    this.items = await loadVideoItems(this.config);
    if (!this.items.length) {
      this.setFallbackState("empty");
      return;
    }



    if (this.config.shuffle) this.items = shuffle(this.items);
    this.container.dataset.state = "ready";

    const isColdStart = this.container.dataset.start === "cold";
    const minImageMs = Math.max(0, Number(this.config.coldStartMinImageMs) || 0);

    if (isColdStart && minImageMs > 0) {
      const elapsedMs = performance.now() - this.createdAt;
      const remainingMs = Math.max(0, minImageMs - elapsedMs);

      if (remainingMs > 0) {
        await wait(remainingMs);
      }

      if (this.stopped || document.hidden || this.container.dataset.state !== "ready") {
        return;
      }
    }

    this.playNext();


  }

  shouldUseFallbackOnly() {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = navigator.connection?.saveData;
    return (this.config.respectReducedMotion && prefersReduced) || saveData;
  }

  async playNext() {
    if (this.stopped || document.hidden || !this.items.length || this.isTransitioning) return;

    const token = ++this.runToken;
    const item = this.items[this.index % this.items.length];
    this.index += 1;
    const nextSlot = 1 - this.activeSlot;
    const nextVideo = this.videos[nextSlot];
    this.slotTokens[nextSlot] = token;
    window.clearTimeout(this.resetTimers[nextSlot]);

    try {
      await prepareVideo(nextVideo, item);
      if (token !== this.runToken || this.slotTokens[nextSlot] !== token) return;
      nextVideo.loop = this.shouldLoopActiveVideo(nextVideo);
      await playWithTimeout(nextVideo);
      if (token !== this.runToken || this.slotTokens[nextSlot] !== token) return;
      this.failures = 0;
      this.crossfadeTo(nextSlot, token);
      this.scheduleNext(nextVideo, token);
    } catch (error) {
      if (token !== this.runToken || this.slotTokens[nextSlot] !== token) return;
      console.warn("Skipping ambient background video:", item.name || item.id || item.src, error);
      resetVideo(nextVideo);
      this.failures += 1;
      if (this.failures >= Math.min(MAX_FAILURES_PER_CYCLE, this.items.length)) {
        this.setFallbackState("error");
        return;
      }
      this.playNext();
    }
  }


  crossfadeTo(nextSlot, token) {
    const previousSlot = this.activeSlot;
    const previousToken = this.slotTokens[previousSlot];
    const previous = this.videos[previousSlot];
    const next = this.videos[nextSlot];

    // Important: video playback has succeeded by the time we reach this function,
    // so it is now safe to hide the fallback image and reveal the active video.
    this.container.dataset.state = "playing";

    this.isTransitioning = true;

    ["ended", "stalled", "error"].forEach((event) => {
      previous.removeEventListener(event, this.onActiveVideoProblem);
      next.addEventListener(event, this.onActiveVideoProblem);
    });

    next.classList.add("is-active");
    previous.classList.remove("is-active");

    window.clearTimeout(this.resetTimers[previousSlot]);
    this.resetTimers[previousSlot] = window.setTimeout(() => {
      if (this.activeSlot !== previousSlot && this.slotTokens[previousSlot] === previousToken) {
        resetVideo(previous);
      }

      if (this.runToken === token) {
        this.isTransitioning = false;
      }
    }, this.config.transitionMs + 250);

    this.activeSlot = nextSlot;
    this.activeStartedAt = performance.now();
  }


  scheduleNext(video, token = this.runToken) {
    window.clearTimeout(this.timer);

    if (this.stopped || document.hidden || !this.items.length || token !== this.runToken) return;

    const elapsedMs = Math.max(0, performance.now() - this.activeStartedAt);
    const transitionMs = Math.max(0, this.config.transitionMs);
    const protectedMs = transitionMs + Math.max(0, this.config.minDwellMs || 0);
    const durationMs = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 0;
    const maxDelay = Math.max(protectedMs - elapsedMs, this.config.maxPlayMs - elapsedMs, 0);
    const fallbackDelay = Math.max(protectedMs - elapsedMs, Math.min(this.config.maxPlayMs, this.config.minPlayMs) - elapsedMs, 0);
    const targetDelay = durationMs
      ? Math.min(this.nextDurationAwareDelay(video, durationMs, protectedMs), maxDelay)
      : fallbackDelay;
    const delay = Number.isFinite(targetDelay) ? Math.max(0, targetDelay) : fallbackDelay;

    this.timer = window.setTimeout(() => {
      if (!this.isTransitioning && token === this.runToken) this.playNext();
    }, delay);
  }

  nextDurationAwareDelay(video, durationMs, protectedMs) {
    const transitionMs = Math.max(0, this.config.transitionMs);
    const elapsedMs = Math.max(0, performance.now() - this.activeStartedAt);
    const currentMs = Math.max(0, video.currentTime * 1000);
    const cycleMs = Math.max(250, durationMs);
    let transitionAtMs = Math.max(0, durationMs - transitionMs);

    if (video.loop) {
      while (transitionAtMs < currentMs || elapsedMs + (transitionAtMs - currentMs) < protectedMs) {
        transitionAtMs += cycleMs;
      }
    }

    return Math.max(protectedMs - elapsedMs, transitionAtMs - currentMs, 0);
  }

  shouldLoopActiveVideo(video) {
    const durationMs = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 0;
    return durationMs > 0 && durationMs < this.config.transitionMs + Math.max(0, this.config.minDwellMs || 0);
  }


  onVisibilityChange() {
    if (document.hidden) {
      window.clearTimeout(this.timer);
      this.videos.forEach((video) => video.pause());
      return;
    }

    const activeVideo = this.videos[this.activeSlot];
    const hasActiveVideo =
      activeVideo &&
      activeVideo.classList.contains("is-active") &&
      activeVideo.getAttribute("src");

    if (hasActiveVideo) {
      this.activeStartedAt = performance.now() - activeVideo.currentTime * 1000;

      activeVideo
        .play()
        .then(() => {
          this.container.dataset.state = "playing";
          this.scheduleNext(activeVideo);
        })
        .catch(() => this.playNext());

      return;
    }

    this.playNext();
  }


  onActiveVideoProblem(event) {
    if (document.hidden || this.isTransitioning || event.currentTarget !== this.videos[this.activeSlot]) return;
    window.clearTimeout(this.timer);
    this.playNext();
  }

  setFallbackState(state) {
    this.container.dataset.state = state;
    this.videos.forEach(resetVideo);
  }
}

async function loadVideoItems(config) {
  const inlineItems = normalizeItems(config.items);
  if (inlineItems.length) return inlineItems;

  if (config.manifestUrl) {
    const manifestItems = await fetchManifest(config.manifestUrl);
    if (manifestItems.length) return manifestItems;
  }

  return fetchManifest(FALLBACK_MANIFEST_URL, true);
}

async function fetchManifest(url, optional = false) {
  try {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
    const data = await response.json();
    return normalizeItems(Array.isArray(data) ? data : data.items);
  } catch (error) {
    if (!optional) console.warn("Ambient background manifest failed:", url, error);
    return [];
  }
}

function normalizeItems(items = []) {
  return items
    .map((item) => {
      const id = item.id || "";
      const src = item.src || "";
      const type = item.type || guessVideoType(src);
      return { ...item, id, src, type, poster: item.poster || "" };
    })
    .filter((item) => item.src && (!item.type || item.type.startsWith("video/")) && canPlayItem(item));
}

function prepareVideo(video, item) {
  resetVideo(video);
  video.removeAttribute("poster");
  video.preload = "auto";
  video.src = item.src;
  if (item.type) video.setAttribute("type", item.type);
  video.load();
  return waitForEvent(video, ["canplay", "loadeddata"], ["error", "stalled", "abort"], LOAD_TIMEOUT_MS);
}

function playWithTimeout(video) {
  return Promise.race([
    video.play(),
    new Promise((_, reject) => window.setTimeout(() => reject(new Error("Video play timed out")), PLAY_TIMEOUT_MS)),
  ]);
}

function waitForEvent(target, successEvents, failureEvents, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      successEvents.forEach((event) => target.removeEventListener(event, onSuccess));
      failureEvents.forEach((event) => target.removeEventListener(event, onFailure));
    };
    const onSuccess = () => { cleanup(); resolve(); };
    const onFailure = () => { cleanup(); reject(new Error("Video could not load")); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Video load timed out")); }, timeoutMs);
    successEvents.forEach((event) => target.addEventListener(event, onSuccess, { once: true }));
    failureEvents.forEach((event) => target.addEventListener(event, onFailure, { once: true }));
  });
}

function resetVideo(video) {
  video.pause();
  video.loop = false;
  video.removeAttribute("src");
  video.removeAttribute("type");
  video.removeAttribute("poster");
  video.load();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function guessVideoType(src = "") {
  const clean = src.split("?")[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
  return "";
}

function canPlayItem(item) {
  if (!item.type) return true;
  const testVideo = document.createElement("video");
  return testVideo.canPlayType(item.type) !== "";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
