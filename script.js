const printButton = document.querySelector("[data-print]");

const PROJECT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const escapeHtml = (value = "") => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

const isValidProjectDate = (value) => {
  if (typeof value !== "string" || !PROJECT_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const isProjectPublishable = (project) => Boolean(
  project
  && project.status === "ready"
  && project.visibility === "public"
  && isValidProjectDate(project.createdAt)
);

const sortProjectsNewestFirst = (projects = []) => [...projects].sort((a, b) => {
  const dateOrder = String(b.createdAt).localeCompare(String(a.createdAt), "en");
  if (dateOrder) return dateOrder;
  const titleOrder = String(a.title || "").localeCompare(String(b.title || ""), "en", { sensitivity: "base" });
  if (titleOrder) return titleOrder;
  return String(a.slug || "").localeCompare(String(b.slug || ""), "en");
});

const sortFeaturedProjects = (projects = []) => [...projects].sort((a, b) => {
  const aRank = Number.isInteger(a.featuredRank) && a.featuredRank > 0 ? a.featuredRank : Number.POSITIVE_INFINITY;
  const bRank = Number.isInteger(b.featuredRank) && b.featuredRank > 0 ? b.featuredRank : Number.POSITIVE_INFINITY;
  if (aRank !== bRank) return aRank - bRank;
  return sortProjectsNewestFirst([a, b]).indexOf(a) === 0 ? -1 : 1;
});

const getPublishableProjects = (projects) => sortProjectsNewestFirst(
  (Array.isArray(projects) ? projects : []).filter(isProjectPublishable)
);

let projectRegistryPromise;
const loadProjectRegistry = () => {
  projectRegistryPromise ||= fetch("/data/projects.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Project data request failed: ${response.status}`);
      return response.json();
    })
    .then((projects) => {
      if (!Array.isArray(projects)) throw new TypeError("Project registry must be an array.");
      return projects;
    })
    .catch((error) => {
      projectRegistryPromise = undefined;
      throw error;
    });
  return projectRegistryPromise;
};

if (printButton) {
  printButton.addEventListener("click", () => {
    window.print();
  });
}


const initMobileHeader = () => {
  const header = document.querySelector("[data-mobile-header]");
  const toggle = header?.querySelector("[data-mobile-menu-toggle]");
  const navigation = header?.querySelector(".topnav");
  if (!header || !toggle || !navigation) return;

  const mobileQuery = window.matchMedia("(max-width: 980px)");
  const setOpen = (open, restoreFocus = false) => {
    header.toggleAttribute("data-mobile-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    if (restoreFocus) toggle.focus();
  };

  header.setAttribute("data-mobile-menu-ready", "");
  setOpen(false);

  toggle.addEventListener("click", () => setOpen(!header.hasAttribute("data-mobile-menu-open")));
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (mobileQuery.matches && header.hasAttribute("data-mobile-menu-open") && !header.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !header.hasAttribute("data-mobile-menu-open")) return;
    event.preventDefault();
    setOpen(false, true);
  });
  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) setOpen(false);
  });
};

initMobileHeader();

const reactivePanelSelector = ".panel, .metric, .section-card, .timeline-section, .project-card, .contact-panel, .case-grid section";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const pendingPanelUpdates = new WeakMap();

const updateReactiveLight = (event, panel) => {
  if (reducedMotionQuery.matches) return;

  const previousFrame = pendingPanelUpdates.get(panel);
  if (previousFrame) cancelAnimationFrame(previousFrame);

  const frame = requestAnimationFrame(() => {
    const rect = panel.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;

    panel.style.setProperty("--pointer-x", `${Math.min(100, Math.max(0, pointerX)).toFixed(2)}%`);
    panel.style.setProperty("--pointer-y", `${Math.min(100, Math.max(0, pointerY)).toFixed(2)}%`);
    pendingPanelUpdates.delete(panel);
  });

  pendingPanelUpdates.set(panel, frame);
};

const hydrateReactivePanels = () => {
  document.querySelectorAll(reactivePanelSelector).forEach((panel) => {
    if (panel.dataset.reactiveReady) return;
    panel.dataset.reactiveReady = "true";
    panel.style.setProperty("--pointer-x", "50%");
    panel.style.setProperty("--pointer-y", "50%");
    panel.addEventListener("pointermove", (event) => updateReactiveLight(event, panel), { passive: true });
  });
};

const renderProjectCards = async () => {
  const grids = document.querySelectorAll("[data-project-grid]");
  if (!grids.length) return;

  try {
    const projects = getPublishableProjects(await loadProjectRegistry());

    grids.forEach((grid) => {
      const selectedProjects = grid.hasAttribute("data-project-featured")
        ? sortFeaturedProjects(projects.filter((project) => project.featured === true))
        : projects;
      const parsedLimit = Number.parseInt(grid.dataset.projectLimit || selectedProjects.length, 10);
      const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : selectedProjects.length;
      const cards = selectedProjects.slice(0, limit).map((project) => `
        <article class="project-card panel">
          <div class="project-kicker">${escapeHtml(project.category)}</div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
          <div class="mini-stack" aria-label="Technology stack">
            ${(Array.isArray(project.stack) ? project.stack : []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <a href="${escapeHtml(project.href)}">Read case study</a>
        </article>
      `).join("");

      grid.innerHTML = cards || '<p class="loading-copy">No published projects are available yet.</p>';
    });
    hydrateReactivePanels();
  } catch (error) {
    grids.forEach((grid) => {
      grid.innerHTML = '<p class="loading-copy">Project data is temporarily unavailable. Visit GitHub for current work.</p>';
    });
    console.error(error);
  }
};

hydrateReactivePanels();
renderProjectCards();

const showcaseLauncher = document.querySelector("[data-showcase-launcher]");

// Showcase tuning is loaded from data/showcase-config.json so saved Dev Lab work can ship as a repository change.
const SHOWCASE_CONFIG_URL = "/data/showcase-config.json";
const SHOWCASE_SAVE_ENDPOINT = "/__dev/showcase-config";
const showcaseContract = window.ShowcaseConfigContract;
const {
  VERSION: SHOWCASE_CONFIG_VERSION = 0,
  GROUPS: SHOWCASE_GROUPS = [],
  DESCRIPTORS: showcaseConfigDescriptors = {},
  clone: cloneShowcaseValue = (value) => JSON.parse(JSON.stringify(value)),
  equal: showcaseValuesEqual = () => false,
  migrateFile: migrateShowcaseFile = () => { throw new Error("Showcase configuration contract failed to load."); },
  validateSnapshot: validateShowcaseSnapshot = () => { throw new Error("Showcase configuration contract failed to load."); },
} = showcaseContract || {};
const showcaseConfig = Object.fromEntries(SHOWCASE_GROUPS.map((group) => [group, {}]));

const loadShowcaseConfig = async () => {
  const response = await fetch(SHOWCASE_CONFIG_URL, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Showcase configuration request failed with ${response.status}.`);
  return migrateShowcaseFile(await response.json());
};

const showcaseDefaults = {
  "phx-transit-pulse": { title: "PHX Transit Pulse", description: "Transit movement, delays & alerts", visualKey: "phx-transit", motion: "animated" },
  "shrinkflation-tracker": { title: "Shrink Tracker", description: "Spot hidden unit-price hikes", visualKey: "shelf-signal", motion: "animated" },
  "gravity-fleet-lab": { title: "Gravity Fleet", description: "Orbital strategy with telemetry", visualKey: "gravity-fleet", motion: "animated" },
  "colony-ops-lab": { title: "Colony Ops", description: "Resource strategy meets analytics", visualKey: "colony-ops", motion: "static" },
  "procurement-kpi-analysis": { title: "Procurement KPI", description: "Supplier performance at a glance", visualKey: "procurement-kpi", motion: "static" },
  "cfpb-complaint-intelligence": { title: "CFPB Signals", description: "Turn complaints into signals", visualKey: "cfpb-signals", motion: "static" },
  "ev-true-cost": { title: "Public Charging", description: "Compare gasoline and charging costs", visualKey: "public-charging", motion: "animated" },
  "multi-platform-publishing-system": { title: "Publishing System", description: "Travel publishing without code", visualKey: "publishing-system", motion: "static" },
};

const showcaseMeta = (project = {}) => ({ ...(showcaseDefaults[project.slug] || {}), ...(project.showcase || {}) });

const showcaseVisualSvg = (visualKey = "default") => {
  const scenes = {
    "phx-transit": `<svg class="showcase-scene-svg transit-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><rect class="transit-map-bg" x="1" y="1" width="70" height="54" rx="6"/><path class="transit-streets" d="M8 4v48M20 4v48M33 4v48M46 4v48M59 4v48M4 11h64M4 22h64M4 34h64M4 46h64M5 50 67 6M8 7l57 42"/><path class="transit-route transit-bus-route" d="M8 41h14V31h20V14h23"/><path class="transit-route transit-rail-route" d="M14 10h16v13h21v23h14"/><g class="transit-stops"><circle class="bus-stop" cx="22" cy="41" r="2"/><circle class="bus-stop" cx="42" cy="31" r="2"/><circle class="bus-stop" cx="42" cy="14" r="2"/><circle class="rail-stop" cx="30" cy="10" r="2"/><circle class="rail-stop" cx="30" cy="23" r="2"/><circle class="rail-stop" cx="51" cy="46" r="2"/><circle class="transit-interchange" cx="42" cy="23" r="2.4"/></g><g class="transit-vehicle transit-bus-vehicle"><rect class="vehicle-body" x="-4.5" y="-3.2" width="9" height="6.4" rx="1.5"/><rect class="vehicle-window" x="-2.7" y="-2" width="5.4" height="2.2" rx=".5"/><circle class="vehicle-wheel" cx="-2.6" cy="3.1" r=".8"/><circle class="vehicle-wheel" cx="2.6" cy="3.1" r=".8"/></g><g class="transit-vehicle transit-rail-vehicle"><rect class="vehicle-body" x="-5" y="-3" width="10" height="6" rx="2"/><path class="vehicle-window" d="M-3.2-1.8h2.5v2.4h-2.5zm3.9 0h2.5v2.4H.7z"/><path class="rail-coupler" d="M-6 0h1M5 0h1"/></g></svg>`,
    "gravity-fleet": `<svg class="showcase-scene-svg gravity-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><ellipse class="orbit-ring" cx="34" cy="28" rx="23" ry="15"/><circle class="planet-halo" cx="34" cy="28" r="12"/><circle class="planet" cx="34" cy="28" r="8"/><g class="ship-dot ship-dot-a"><circle cx="34" cy="8" r="2.6"/></g><g class="ship-dot ship-dot-b"><circle cx="50" cy="19" r="2.6"/></g><g class="ship-dot ship-dot-c"><circle cx="34" cy="45" r="2.6"/></g><g class="attacker-wave"><circle class="attacker" cx="66" cy="14" r="2.8"/></g><path class="laser" d="M50 19 55 20"/><circle class="burst" cx="55" cy="20" r="3.5"/></svg>`,
    "public-charging": `<svg class="showcase-scene-svg ev-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><g class="charger"><rect class="charger-body" x="6" y="10" width="12" height="20" rx="2"/><path class="charger-bolt" d="m13 13-4 7h4l-2 6 6-8h-4z"/><path class="charger-base" d="M9 30v9M5 39h14"/></g><path class="charge-cable" d="M18 23c6 1 2 10 9 11"/><g class="ev-car"><path class="ev-body" d="M15 34h5l5-9h22l8 9h7v7H15z"/><path class="ev-window" d="M27 27h17l5 6H23z"/><path class="ev-bolt" d="m41 28-4 7h4l-3 7 8-10h-4z"/><g class="wheel wheel-rear"><circle cx="27" cy="42" r="5"/><path d="M23.5 42h7M27 38.5v7"/></g><g class="wheel wheel-front"><circle cx="52" cy="42" r="5"/><path d="M48.5 42h7M52 38.5v7"/></g></g></svg>`,
    "shelf-signal": `<svg class="showcase-scene-svg shelf-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path class="shelf-frame" d="M7 12v33M31 12v33M5 27h28M5 44h28"/><rect class="pkg pkg-a" x="10" y="18" width="7" height="9" rx="1"/><rect class="pkg pkg-before" x="20" y="14" width="8" height="13" rx="1"/><rect class="pkg pkg-current" x="20" y="14" width="8" height="13" rx="1"/><rect class="pkg pkg-c" x="11" y="34" width="8" height="10" rx="1"/><path class="chart-grid" d="M38 20h27M38 31h27M49 15v29M60 15v29"/><path class="chart-axis" d="M38 15v29h28"/><path class="unit-rise" d="M40 40c6-2 9-7 13-8 5-2 7-9 12-12"/><circle class="unit-dot" cx="65" cy="20" r="2.4"/></svg>`,
    "colony-ops": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path class="terrain" d="M8 42c10-8 20-9 31-3 7 4 14 3 25-4"/><rect x="18" y="20" width="12" height="11" rx="2"/><rect x="39" y="15" width="10" height="16" rx="2"/><path d="M30 25h9M24 31v8M44 31v7"/><circle cx="24" cy="41" r="3"/><circle cx="44" cy="40" r="3"/></svg>`,
    "procurement-kpi": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path d="M13 42h46"/><rect x="17" y="29" width="8" height="13" rx="1"/><rect x="32" y="18" width="8" height="24" rx="1"/><rect x="47" y="25" width="8" height="17" rx="1"/><path class="accent" d="M14 24l15-7 13 9 16-15"/><circle cx="29" cy="17" r="2.5"/><circle cx="42" cy="26" r="2.5"/></svg>`,
    "quote-to-cash": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><rect x="8" y="21" width="12" height="14" rx="2"/><rect x="30" y="21" width="12" height="14" rx="2"/><rect x="52" y="21" width="12" height="14" rx="2"/><path class="accent" d="M20 28h9m13 0h9M24 24l5 4-5 4m24-8 5 4-5 4"/><path d="M8 42h56"/></svg>`,
    "cfpb-signals": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path d="M12 17h31a8 8 0 0 1 0 16H29l-11 8v-8h-6a8 8 0 0 1 0-16Z"/><path class="accent" d="M49 19l4 7 8-13"/><path d="M22 24h21M52 36h9M49 42h7"/></svg>`,
    "publishing-system": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path d="M11 42 25 14l16 28 18-25"/><path class="accent" d="M25 14l3 21 13 7"/><circle cx="25" cy="14" r="4"/><circle cx="41" cy="42" r="4"/><path d="M12 42h16"/></svg>`,
  };
  return scenes[visualKey] || `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><circle cx="36" cy="28" r="15"/><path d="M36 11v34M19 28h34"/></svg>`;
};

const initShowcase = (showcaseSnapshots) => {
  if (!showcaseLauncher) return;

  const applySnapshotToRuntime = (snapshot) => {
    SHOWCASE_GROUPS.forEach((group) => {
      Object.keys(showcaseConfig[group]).forEach((key) => { delete showcaseConfig[group][key]; });
      Object.assign(showcaseConfig[group], cloneShowcaseValue(snapshot.config[group]));
    });
  };
  applySnapshotToRuntime(showcaseSnapshots.saved);

  const { layout, node: nodeConfig, hub: hubConfig, line: lineConfig, motion, effects } = showcaseConfig;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isReduced = () => reducedMotionQuery.matches;
  const isDesktop = () => window.matchMedia("(min-width: 860px) and (min-height: 620px) and (pointer: fine)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  let overlay;
  let showcaseContent;
  let showcaseClose;
  let projectsLoaded = false;
  let state = "collapsed";
  let targetExpanded = false;
  let frame = 0;
  let activeTransition = null;
  let closeResetFrame = 0;
  let nodes = [];
  let hub = { x: 0, y: 0, collapsedX: 0, collapsedY: 0, expandedX: 0, expandedY: 0 };
  let pointer = { x: 0, y: 0, active: false };
  let lastLauncherCenter = null;
  let overlapAvoidanceEnabled = true;
  let devEditingActive = false;
  let selectedTarget = null;
  let manipulation = null;
  let devLabElement = null;
  let devLabPopup = null;
  let popupMonitor = 0;

  const easingFns = {
    linear: (t) => t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  // Browser-coordinate polar placements: 0deg = right, 90deg = down, 180deg = left, and 270deg = up.
  const nodePlacements = cloneShowcaseValue(showcaseSnapshots.saved.nodePlacements);
  const webs = cloneShowcaseValue(showcaseSnapshots.saved.webs);
  const devLabState = {
    original: cloneShowcaseValue(showcaseSnapshots.original),
    saved: cloneShowcaseValue(showcaseSnapshots.saved),
    working: { config: showcaseConfig, nodePlacements, webs },
    dirty: false,
    saving: false,
  };
  const labStorageKey = "portfolio.showcaseDevLab";
  const legacyMotionStorageKey = "portfolio.showcaseMotionLab";
  const debugStorageKey = "portfolio.showcaseDebug";
  const debugParam = new URLSearchParams(window.location.search).get("showcaseDebug");
  const localDebugHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
  const debugWasEnabled = (() => {
    try {
      return localStorage.getItem(debugStorageKey) === "true";
    } catch {
      return false;
    }
  })();
  const explicitDebugAccess = debugParam === "1";
  const debugAvailable = localDebugHost || explicitDebugAccess;
  const debugInitiallyEnabled = explicitDebugAccess || (localDebugHost && debugWasEnabled);

  const configDescriptors = showcaseConfigDescriptors;
  const labTabs = [
    { id: "layout", label: "Layout" },
    { id: "node", label: "Nodes" },
    { id: "hub", label: "Hub" },
    { id: "line", label: "Webs" },
    { id: "motion", label: "Motion" },
    { id: "effects", label: "Effects" },
  ];

  const ease = (t) => (easingFns[motion.easing] || easingFns.easeOutCubic)(clamp(t, 0, 1));

  const polarToOffset = ({ angle, radius }) => {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const radians = normalizedAngle * Math.PI / 180;
    return [Math.cos(radians) * radius, Math.sin(radians) * radius];
  };

  const validateNodePlacements = () => {
    if (!debugAvailable) return;
    nodePlacements.forEach(({ angle, radius }, index) => {
      if (!Number.isFinite(angle)) throw new Error(`Invalid Showcase node placement ${index}: angle must be finite.`);
      if (!Number.isFinite(radius)) throw new Error(`Invalid Showcase node placement ${index}: radius must be finite.`);
    });
  };

  validateNodePlacements();

  let offsets = nodePlacements.map(polarToOffset);
  const refreshOffsets = () => { offsets = nodePlacements.map(polarToOffset); };

  const currentNodeSize = () => isDesktop()
    ? { width: nodeConfig.desktopWidth, height: nodeConfig.desktopHeight }
    : { width: nodeConfig.mobileWidth, height: nodeConfig.mobileHeight };

  const currentHubSize = () => isDesktop()
    ? { width: hubConfig.desktopWidth, height: hubConfig.desktopHeight }
    : { width: hubConfig.mobileWidth, height: hubConfig.mobileHeight };

  const valueLabel = (value, descriptor) => `${value}${descriptor.unit ? ` ${descriptor.unit}` : ""}`;
  const descriptorFor = (group, key) => configDescriptors[group]?.find((descriptor) => descriptor.key === key);

  const cleanNumber = (value, descriptor) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const clamped = clamp(number, descriptor.min, descriptor.max);
    const step = Number(descriptor.step) || 0;
    if (!step) return clamped;
    const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
    return Number((Math.round((clamped - descriptor.min) / step) * step + descriptor.min).toFixed(decimals));
  };

  const normalizeValue = (value, descriptor, defaultValue) => {
    if (descriptor.type === "select") {
      const match = descriptor.options.find(([optionValue]) => String(optionValue) === String(value));
      if (!match) return null;
      return typeof defaultValue === "number" ? Number(match[0]) : String(match[0]);
    }
    if (descriptor.type === "boolean") return value === true || value === "true";
    if (descriptor.type === "color") return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
    return cleanNumber(value, descriptor);
  };

  const enforceInvariants = () => {
    if (motion.hubArcMin > motion.hubArcMax) motion.hubArcMax = motion.hubArcMin;
  };

  const applyVisualConfig = () => {
    if (!overlay) return;
    overlay.style.setProperty("--showcase-node-bg", nodeConfig.backgroundOpacity);
    overlay.style.setProperty("--showcase-node-bg-hover", nodeConfig.hoverBackgroundOpacity);
    overlay.style.setProperty("--showcase-node-border-width", `${nodeConfig.borderWidth}px`);
    overlay.style.setProperty("--showcase-node-border-opacity", nodeConfig.borderOpacity);
    overlay.style.setProperty("--showcase-node-radius", `${nodeConfig.borderRadius}px`);
    overlay.style.setProperty("--showcase-line-width", lineConfig.width);
    overlay.style.setProperty("--showcase-line-active-width", lineConfig.activeWidth);
    overlay.style.setProperty("--showcase-line-opacity", lineConfig.opacity);
    overlay.style.setProperty("--showcase-node-shadow-blur", `${effects.nodeShadowBlur}px`);
    overlay.style.setProperty("--showcase-node-shadow-opacity", effects.nodeShadowOpacity);
    overlay.style.setProperty("--showcase-node-glow-blur", `${effects.nodeGlowBlur}px`);
    overlay.style.setProperty("--showcase-node-glow-opacity", effects.nodeGlowOpacity);
    overlay.style.setProperty("--showcase-hub-shadow-blur", `${effects.hubShadowBlur}px`);
    overlay.style.setProperty("--showcase-hub-shadow-opacity", effects.hubShadowOpacity);
    overlay.style.setProperty("--showcase-hub-glow-blur", `${effects.hubGlowBlur}px`);
    overlay.style.setProperty("--showcase-hub-glow-opacity", effects.hubGlowOpacity);
  };

  const applyLabPreview = (group) => {
    enforceInvariants();
    refreshOffsets();
    applyVisualConfig();
    if (projectsLoaded && ["layout", "node", "hub", "line", "effects"].includes(group)) {
      updateLayout();
      snapTo(targetExpanded || state === "expanded");
      renderPositions();
    } else if (state === "expanded") {
      requestMotionFrame();
    }
  };

  const removeLegacyLabStorage = () => {
    if (!debugAvailable) return;
    try {
      localStorage.removeItem(labStorageKey);
      localStorage.removeItem(legacyMotionStorageKey);
    } catch {
      // File-backed configuration remains authoritative when storage is unavailable.
    }
  };

  const replaceRuntimeSnapshot = (snapshot) => {
    applySnapshotToRuntime(snapshot);
    nodePlacements.splice(0, nodePlacements.length, ...cloneShowcaseValue(snapshot.nodePlacements));
    webs.splice(0, webs.length, ...cloneShowcaseValue(snapshot.webs));
    enforceInvariants();
    refreshOffsets();
  };

  const currentSnapshot = () => validateShowcaseSnapshot({ config: cloneShowcaseValue(showcaseConfig), nodePlacements: cloneShowcaseValue(nodePlacements), webs: cloneShowcaseValue(webs) }, "working");


  const syncSaveButton = (lab) => {
    const saveButton = lab?.querySelector("[data-showcase-save]");
    if (!saveButton) return;

    saveButton.disabled = devLabState.saving || !devLabState.dirty;
    saveButton.setAttribute("aria-busy", String(devLabState.saving));
  };

  let refreshLabState = () => {};
  const markDirty = (lab, message = "Unsaved changes") => {
    devLabState.dirty = !showcaseValuesEqual(currentSnapshot(), devLabState.saved);
    syncSaveButton(lab);
    refreshLabState(lab);
    lab.querySelector("[data-showcase-status]").textContent = devLabState.dirty ? message : "Working configuration matches saved values";
  };


  const canUseSaveEndpoint = () => localDebugHost && ["http:", "https:"].includes(window.location.protocol);

  const configText = () => JSON.stringify({ version: SHOWCASE_CONFIG_VERSION, ...currentSnapshot() }, null, 2);

  removeLegacyLabStorage();

  const buildOverlay = () => {
    overlay = document.createElement("nav");
    overlay.className = "showcase-overlay is-collapsed";
    overlay.setAttribute("aria-label", "Project showcase");
    overlay.innerHTML = `<button class="showcase-close" type="button" aria-label="Close project showcase" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m7 7 10 10M17 7 7 17"/></svg>
    </button><div class="showcase-content">
      <svg class="showcase-lines" aria-hidden="true"><defs data-showcase-line-defs></defs></svg>
      <a class="showcase-center" href="/projects/">View all</a>
      <p class="showcase-error" hidden>Project data is temporarily unavailable. <a href="/projects/">View all projects</a>.</p>
    </div>`;
    showcaseContent = overlay.querySelector(".showcase-content");
    showcaseClose = overlay.querySelector(".showcase-close");
    document.body.append(overlay);
    applyVisualConfig();
    overlay.addEventListener("pointermove", (event) => {
      if (manipulation) {
        pointer.active = false;
        return;
      }
      if (event.target.closest(".showcase-dev-panel")) {
        pointer.active = false;
        requestMotionFrame();
        return;
      }
      if (!isDesktop() || isReduced() || state !== "expanded") return;
      pointer = { x: event.clientX, y: event.clientY, active: true };
      requestMotionFrame();
    }, { passive: true });
    overlay.addEventListener("pointerleave", () => { pointer.active = false; requestMotionFrame(); }, { passive: true });
    overlay.addEventListener("click", (event) => {
      if (state === "expanded" && (event.target === overlay || event.target === showcaseContent || event.target.closest(".showcase-lines"))) {
        if (devEditingActive) setSelection();
        else beginTransition(false);
      }
    });
    showcaseClose.addEventListener("click", () => beginTransition(false));
  };

  const replayMotion = () => {
    if (!projectsLoaded) return;
    cancelMotionFrame();
    activeTransition = null;
    targetExpanded = false;
    pointer.active = false;
    snapTo(false);
    setVisualState("collapsed");
    renderPositions();
    requestAnimationFrame(() => beginTransition(true));
  };

  const placementDescriptor = (key) => key === "angle"
    ? { label: "Angle", min: 0, max: 359, step: 1, unit: "deg", help: "Clockwise browser angle: 0 right, 90 down." }
    : { label: "Radius", min: 60, max: 320, step: 1, unit: "px", help: "Distance from the hub before viewport scaling.", apply: "node-radius" };
  const webAppearanceKeys = ["gradientEnabled", "startColor", "middleColor", "endColor", "middleStop", "width", "activeWidth", "opacity", "glowBlur", "glowOpacity"];
  let selectedWebIndex = 0;

  const defaultWebDirection = (index) => lineConfig.bendDirection === "clockwise" ? 1 : lineConfig.bendDirection === "counterclockwise" ? -1 : (index % 2 ? -1 : 1);
  const resolvedWeb = (index) => ({
    bend: layout.lineBend,
    bendDirection: defaultWebDirection(index),
    ...Object.fromEntries(webAppearanceKeys.map((key) => [key, lineConfig[key]])),
    ...webs[index].overrides,
  });
  const valueAtPath = (snapshot, path) => path.split(".").reduce((value, key) => value?.[/^\d+$/.test(key) ? Number(key) : key], snapshot);
  const displayComparison = (value, descriptor = {}) => value === undefined ? "Global" : valueLabel(value, descriptor);

  const renderHelp = (path, help) => `<span class="showcase-dev-help-wrap"><button type="button" class="showcase-dev-help" data-help-path="${path}" data-help-copy="${escapeHtml(help || "Adjust this Showcase value.")}" aria-label="Explain this control" aria-expanded="false">?</button><span class="showcase-dev-help-popover" role="tooltip" hidden></span></span>`;
  const renderModified = () => `<span class="showcase-dev-modified" hidden aria-label="Modified from saved value.">*<span class="sr-only"> Modified from saved value.</span></span>`;

  const renderControl = (group, descriptor) => {
    const id = `showcase-dev-${group}-${descriptor.key}`;
    const path = `config.${group}.${descriptor.key}`;
    let input = "";
    if (descriptor.type === "select") {
      input = `<select id="${id}" data-config-group="${group}" data-config-key="${descriptor.key}">${descriptor.options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}</select>`;
    } else if (descriptor.type === "boolean") {
      input = `<input id="${id}" type="checkbox" data-config-group="${group}" data-config-key="${descriptor.key}">`;
    } else if (descriptor.type === "color") {
      input = `<input id="${id}" type="color" data-config-group="${group}" data-config-key="${descriptor.key}">`;
    } else {
      input = `<span class="showcase-dev-inputs"><input id="${id}-range" type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-config-group="${group}" data-config-key="${descriptor.key}" aria-label="${escapeHtml(descriptor.label)} slider"><input id="${id}-number" type="text" inputmode="decimal" data-numeric min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-config-group="${group}" data-config-key="${descriptor.key}" aria-label="${escapeHtml(descriptor.label)} value"></span>`;
    }
    return `<div class="showcase-dev-control" data-showcase-path="${path}" data-showcase-group="${group}"><span class="showcase-dev-label-row"><label for="${id}${descriptor.type && descriptor.type !== "number" ? "" : "-number"}">${escapeHtml(descriptor.label)}</label><output data-config-output="${group}.${descriptor.key}"></output>${renderHelp(path, descriptor.help)}${renderModified()}</span>${input}</div>`;
  };

  const renderPlacementControls = () => nodePlacements.map((placement, index) => `
    <fieldset class="showcase-dev-polar-group" data-node-placement="${index}">
      <legend>Node ${index + 1}</legend>
      ${["angle", "radius"].map((key) => {
        const descriptor = placementDescriptor(key);
        const path = `nodePlacements.${index}.${key}`;
        return `<div class="showcase-dev-control" data-showcase-path="${path}" data-showcase-group="layout"><span class="showcase-dev-label-row"><label for="showcase-placement-${index}-${key}-number">${descriptor.label}</label><output data-placement-output="${index}.${key}"></output>${renderHelp(path, descriptor.help)}${renderModified()}</span><span class="showcase-dev-inputs"><input type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-placement-index="${index}" data-placement-key="${key}" aria-label="Node ${index + 1} ${descriptor.label} slider"><input id="showcase-placement-${index}-${key}-number" type="text" inputmode="decimal" data-numeric min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-placement-index="${index}" data-placement-key="${key}" aria-label="Node ${index + 1} ${descriptor.label} value"></span>${descriptor.apply ? `<button type="button" class="showcase-dev-apply" data-apply-radius="${index}">Apply radius to all nodes</button>` : ""}</div>`;
      }).join("")}
    </fieldset>`).join("");

  const renderWebInspector = () => {
    const appearanceControls = webAppearanceKeys.map((key) => {
      const descriptor = descriptorFor("line", key);
      if (descriptor.type === "boolean") return `<label class="showcase-dev-web-field" data-web-path-key="${key}"><span>${descriptor.label} ${renderModified()}</span><input type="checkbox" data-web-key="${key}"></label>`;
      if (descriptor.type === "color") return `<label class="showcase-dev-web-field" data-web-path-key="${key}"><span>${descriptor.label} ${renderModified()}</span><input type="color" data-web-key="${key}"></label>`;
      return `<label class="showcase-dev-web-field" data-web-path-key="${key}"><span>${descriptor.label} ${renderModified()}</span><input type="text" inputmode="decimal" data-numeric min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-web-key="${key}"></label>`;
    }).join("");
    return `<section class="showcase-dev-web-inspector" aria-labelledby="showcase-web-inspector-title"><h5 id="showcase-web-inspector-title">Selected web</h5><label class="showcase-dev-web-select"><span>Web</span><select data-web-select>${webs.map((web, index) => `<option value="${index}">Node ${index + 1}</option>`).join("")}</select></label><label class="showcase-dev-web-toggle"><input type="checkbox" data-web-use-global><span>Use global settings</span></label><div class="showcase-dev-web-section" data-web-path-key="bend"><label class="showcase-dev-web-toggle"><input type="checkbox" data-web-override-toggle="bend"><span>Override bend ${renderModified()}</span></label><input type="text" inputmode="decimal" data-numeric min="-80" max="80" step="1" data-web-key="bend"><button type="button" class="showcase-dev-apply" data-apply-web="bend">Apply bend to all webs</button></div><div class="showcase-dev-web-section" data-web-path-key="bendDirection"><label class="showcase-dev-web-toggle"><input type="checkbox" data-web-override-toggle="bendDirection"><span>Override direction ${renderModified()}</span></label><select data-web-key="bendDirection"><option value="1">Clockwise</option><option value="-1">Counterclockwise</option></select><button type="button" class="showcase-dev-apply" data-apply-web="bendDirection">Apply direction to all webs</button></div><details class="showcase-dev-web-section"><summary>Appearance override</summary><label class="showcase-dev-web-toggle"><input type="checkbox" data-web-override-toggle="appearance"><span>Override appearance</span></label><div class="showcase-dev-web-appearance">${appearanceControls}</div><button type="button" class="showcase-dev-apply" data-apply-web="appearance">Apply appearance to all webs</button></details><div class="showcase-dev-web-buttons"><button type="button" data-reset-web>Reset this web to global</button><button type="button" data-clear-webs>Clear all overrides</button></div></section>`;
  };

  const syncLabControls = (lab, preserveInput = null) => {
    if (!lab) return;
    Object.entries(configDescriptors).forEach(([group, descriptors]) => descriptors.forEach((descriptor) => {
      const value = showcaseConfig[group][descriptor.key];
      lab.querySelectorAll(`[data-config-group="${group}"][data-config-key="${descriptor.key}"]`).forEach((input) => {
        if (input === preserveInput) return;
        if (descriptor.type === "boolean") input.checked = value;
        else input.value = String(value);
      });
      const output = lab.querySelector(`[data-config-output="${group}.${descriptor.key}"]`);
      if (output) output.textContent = descriptor.type === "boolean" ? (value ? "On" : "Off") : descriptor.type === "color" ? value : valueLabel(value, descriptor);
    }));
    nodePlacements.forEach((placement, index) => ["angle", "radius"].forEach((key) => {
      const descriptor = placementDescriptor(key);
      lab.querySelectorAll(`[data-placement-index="${index}"][data-placement-key="${key}"]`).forEach((input) => { if (input !== preserveInput) input.value = String(placement[key]); });
      const output = lab.querySelector(`[data-placement-output="${index}.${key}"]`);
      if (output) output.textContent = valueLabel(placement[key], descriptor);
    }));
    const web = webs[selectedWebIndex];
    const resolved = resolvedWeb(selectedWebIndex);
    const webSelect = lab.querySelector("[data-web-select]");
    if (webSelect && webSelect !== preserveInput) webSelect.value = String(selectedWebIndex);
    const useGlobal = lab.querySelector("[data-web-use-global]");
    if (useGlobal) useGlobal.checked = Object.keys(web.overrides).length === 0;
    lab.querySelectorAll("[data-web-override-toggle]").forEach((input) => {
      const group = input.dataset.webOverrideToggle;
      input.checked = group === "appearance" ? webAppearanceKeys.some((key) => key in web.overrides) : group in web.overrides;
    });
    lab.querySelectorAll("[data-web-key]").forEach((input) => {
      const key = input.dataset.webKey;
      const enabled = key === "bend" || key === "bendDirection" ? key in web.overrides : webAppearanceKeys.some((appearanceKey) => appearanceKey in web.overrides);
      input.disabled = !enabled;
      if (input !== preserveInput) {
        if (input.type === "checkbox") input.checked = Boolean(resolved[key]);
        else input.value = String(resolved[key]);
      }
    });
    lab.querySelectorAll("[data-web-path-key]").forEach((control) => {
      control.dataset.showcasePath = `webs.${selectedWebIndex}.overrides.${control.dataset.webPathKey}`;
      control.dataset.showcaseGroup = "line";
    });
    const overlap = lab.querySelector("[data-showcase-overlap-avoidance]");
    if (overlap) overlap.checked = overlapAvoidanceEnabled;
    refreshLabState(lab);
  };

  refreshLabState = (lab) => {
    if (!lab) return;
    const working = currentSnapshot();
    lab.querySelectorAll("[data-showcase-path]").forEach((control) => {
      const path = control.dataset.showcasePath;
      const modified = !showcaseValuesEqual(valueAtPath(working, path), valueAtPath(devLabState.saved, path));
      const marker = control.querySelector(".showcase-dev-modified");
      if (marker) marker.hidden = !modified;
      control.classList.toggle("is-modified", modified);
    });
    lab.querySelectorAll("[data-showcase-tab]").forEach((tab) => {
      const group = tab.dataset.showcaseTab;
      const modified = !showcaseValuesEqual(working.config[group], devLabState.saved.config[group]) || (group === "layout" && !showcaseValuesEqual(working.nodePlacements, devLabState.saved.nodePlacements)) || (group === "line" && !showcaseValuesEqual(working.webs, devLabState.saved.webs));
      tab.classList.toggle("is-modified", modified);
      tab.setAttribute("aria-label", `${tab.textContent.replace(/ \*$/, "")}${modified ? ". Modified from saved values." : ""}`);
      tab.dataset.modified = modified ? "true" : "false";
    });
  };

  const buildShowcaseDevLab = () => {
    if (!debugAvailable) return;
    const tabButtons = labTabs.map(({ id, label }, index) => `<button type="button" role="tab" id="showcase-dev-tab-${id}" aria-controls="showcase-dev-panel-${id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}" data-showcase-tab="${id}">${label}</button>`).join("");
    const panels = labTabs.map(({ id, label }, index) => `<section class="showcase-dev-tabpanel" role="tabpanel" id="showcase-dev-panel-${id}" aria-labelledby="showcase-dev-tab-${id}" data-showcase-panel="${id}" ${index === 0 ? "" : "hidden"}><h4>${escapeHtml(label)}</h4><div class="showcase-dev-controls">${configDescriptors[id].map((descriptor) => renderControl(id, descriptor)).join("")}${id === "layout" ? `<label class="showcase-dev-overlap"><span>Avoid desktop overlaps</span><input type="checkbox" data-showcase-overlap-avoidance checked></label><div class="showcase-dev-polar"><h5>Polar nodes</h5>${renderPlacementControls()}</div>` : ""}${id === "line" ? renderWebInspector() : ""}</div></section>`).join("");
    const lab = document.createElement("aside");
    devLabElement = lab;
    lab.className = "showcase-dev-panel";
    lab.setAttribute("aria-label", "Showcase Dev Lab");
    lab.innerHTML = `<label class="showcase-dev-toggle"><input type="checkbox" data-showcase-debug-toggle ${debugInitiallyEnabled ? "checked" : ""}><span>Showcase Dev Lab</span></label><section class="showcase-dev-drawer" data-showcase-debug-drawer ${debugInitiallyEnabled ? "" : "hidden"}><header class="showcase-dev-shell-header"><div class="showcase-dev-title"><strong>Showcase Dev Lab</strong><small>One live working configuration</small></div><button type="button" data-showcase-popout>Pop out</button><nav class="showcase-dev-labs" aria-label="Development labs"><button type="button" class="is-selected" aria-current="page">Showcase</button></nav><div class="showcase-dev-tabs" role="tablist" aria-label="Showcase configuration">${tabButtons}</div></header><div class="showcase-dev-scroll">${panels}</div><footer class="showcase-dev-shell-footer"><div class="showcase-dev-actions"><button type="button" data-showcase-save>Save</button><button type="button" data-showcase-reset-all>Reset to saved</button><button type="button" data-showcase-replay>Replay</button><button type="button" data-showcase-copy>Copy config</button></div><details class="showcase-dev-advanced"><summary>Advanced</summary><button type="button" data-showcase-restore-originals>Restore originals to working state</button></details><textarea class="showcase-dev-output" data-showcase-config-output readonly hidden aria-label="Current version 2 Showcase configuration"></textarea><p class="showcase-dev-status" data-showcase-status aria-live="polite">Using saved configuration</p></footer></section>`;
    overlay.append(lab);

    const toggle = lab.querySelector("[data-showcase-debug-toggle]");
    const drawer = lab.querySelector("[data-showcase-debug-drawer]");
    const configOutput = lab.querySelector("[data-showcase-config-output]");
    const status = lab.querySelector("[data-showcase-status]");
    const tabs = Array.from(lab.querySelectorAll("[role='tab']"));
    const setStatus = (message) => { status.textContent = message; };
    const updateOutput = () => { configOutput.value = configText(); };

    const activateTab = (tab, focus = false) => {
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.setAttribute("aria-selected", String(selected));
        candidate.tabIndex = selected ? 0 : -1;
        lab.querySelector(`#${candidate.getAttribute("aria-controls")}`).hidden = !selected;
      });
      if (focus) tab.focus();
    };

    const dockLab = (message = "Dev Lab docked. Unsaved edits preserved.") => {
      if (devLabPopup && !devLabPopup.closed) devLabPopup.close();
      devLabPopup = null;
      if (popupMonitor) window.clearInterval(popupMonitor);
      popupMonitor = 0;
      lab.classList.remove("is-popped-out");
      overlay.append(lab);
      lab.querySelector("[data-showcase-popout]").textContent = "Pop out";
      setStatus(message);
    };
    const popOutLab = () => {
      let popup = null;
      try { popup = window.open("", "showcaseDevLab", "popup=yes,width=720,height=820,resizable=yes,scrollbars=no"); } catch { /* Reported below. */ }
      if (!popup) {
        setStatus("Popup blocked. Allow popups for this local page and try again.");
        return;
      }
      devLabPopup = popup;
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Showcase Dev Lab</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/css/showcase-expanded-shadows.css"></head><body class="showcase-dev-popout-body"></body></html>`);
      popup.document.close();
      lab.classList.add("is-popped-out");
      popup.document.body.append(lab);
      lab.querySelector("[data-showcase-popout]").textContent = "Dock";
      setStatus("Popped out. The main window remains the preview and state owner.");

      const handlePopupClose = () => {
        if (lab.ownerDocument === popup.document) {
          overlay.append(lab);
        }

        lab.classList.remove("is-popped-out");
        lab.querySelector("[data-showcase-popout]").textContent = "Pop out";
        devLabPopup = null;

        if (popupMonitor) {
          window.clearInterval(popupMonitor);
          popupMonitor = 0;
        }

        setStatus("Popup closed. Dev Lab redocked with unsaved edits preserved.");
      };

      popup.addEventListener("beforeunload", handlePopupClose, { once: true });
      popup.focus();

      popupMonitor = window.setInterval(() => {
        if (!devLabPopup || devLabPopup.closed) {
          handlePopupClose();
        }
      }, 400);
    };

    const closeHelp = (except = null) => lab.querySelectorAll("[data-help-path]").forEach((button) => {
      if (button === except) return;
      button.setAttribute("aria-expanded", "false");
      button.dataset.pinned = "false";
      const popover = button.nextElementSibling;
      if (popover) popover.hidden = true;
    });
    const openHelp = (button, pinned = false) => {
      closeHelp(button);
      const path = button.dataset.helpPath;
      const descriptor = path.startsWith("config.") ? descriptorFor(path.split(".")[1], path.split(".")[2]) : placementDescriptor(path.endsWith("angle") ? "angle" : "radius");
      const popover = button.nextElementSibling;
      const working = currentSnapshot();
      popover.textContent = `${button.dataset.helpCopy} Saved: ${displayComparison(valueAtPath(devLabState.saved, path), descriptor)}. Original: ${displayComparison(valueAtPath(devLabState.original, path), descriptor)}.`;
      popover.hidden = false;
      button.setAttribute("aria-expanded", "true");
      button.dataset.pinned = String(pinned);
    };

    toggle.addEventListener("change", () => {
      drawer.hidden = !toggle.checked;
      devEditingActive = toggle.checked;
      overlay.classList.toggle("is-dev-editing", devEditingActive);
      try { localStorage.setItem(debugStorageKey, String(toggle.checked)); } catch { /* Current page state remains authoritative. */ }
      if (toggle.checked) syncLabControls(lab);
      else selectedTarget = null;
    });
    devEditingActive = toggle.checked;
    overlay.classList.toggle("is-dev-editing", devEditingActive);
    lab.querySelector("[data-showcase-popout]").addEventListener("click", () => lab.classList.contains("is-popped-out") ? dockLab() : popOutLab());
    window.addEventListener("beforeunload", () => { if (devLabPopup && !devLabPopup.closed) devLabPopup.close(); });

    lab.querySelector(".showcase-dev-tabs").addEventListener("click", (event) => { const tab = event.target.closest("[role='tab']"); if (tab) activateTab(tab); });
    lab.querySelector(".showcase-dev-tabs").addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = tabs.indexOf(lab.ownerDocument.activeElement);
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[nextIndex], true);
    });

    lab.querySelectorAll("[data-help-path]").forEach((button) => {
      button.addEventListener("pointerenter", () => openHelp(button));
      button.addEventListener("pointerleave", () => { if (button.dataset.pinned !== "true") closeHelp(); });
      button.addEventListener("focus", () => openHelp(button));
      button.addEventListener("blur", () => { if (button.dataset.pinned !== "true") closeHelp(); });
      button.addEventListener("click", (event) => { event.preventDefault(); openHelp(button, button.dataset.pinned !== "true"); });
    });
    lab.ownerDocument.addEventListener("pointerdown", (event) => { if (!event.target.closest?.(".showcase-dev-help-wrap")) closeHelp(); });

    const mutateAndPreview = (group, preserveInput = null, message) => {
      enforceInvariants();
      syncLabControls(lab, preserveInput);
      updateOutput();
      applyLabPreview(group);
      markDirty(lab, message);
    };
    const readInputValue = (input, descriptor, currentValue) => {
      if (descriptor.type === "boolean") return input.checked;
      if (descriptor.type === "color") return normalizeValue(input.value, descriptor, currentValue);
      if (descriptor.type === "select") return normalizeValue(input.value, descriptor, currentValue);
      if (input.matches("[data-numeric]") && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(input.value)) return null;
      return normalizeValue(input.value, descriptor, currentValue);
    };

    lab.addEventListener("input", (event) => {
      const configInput = event.target.closest("[data-config-group][data-config-key]");
      const placementInput = event.target.closest("[data-placement-index][data-placement-key]");
      const webInput = event.target.closest("[data-web-key]");
      if (configInput) {
        const { configGroup: group, configKey: key } = configInput.dataset;
        const descriptor = descriptorFor(group, key);
        const value = readInputValue(configInput, descriptor, showcaseConfig[group][key]);
        if (value === null) return;
        showcaseConfig[group][key] = value;
        mutateAndPreview(group, configInput);
      } else if (placementInput) {
        const index = Number(placementInput.dataset.placementIndex);
        const key = placementInput.dataset.placementKey;
        if (placementInput.matches("[data-numeric]") && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(placementInput.value)) return;
        const value = cleanNumber(placementInput.value, placementDescriptor(key));
        if (value === null) return;
        nodePlacements[index][key] = value;
        mutateAndPreview("layout", placementInput);
      } else if (webInput && !webInput.disabled) {
        const key = webInput.dataset.webKey;
        const descriptor = key === "bend" ? { min: -80, max: 80, step: 1 } : key === "bendDirection" ? { type: "select", options: [[-1, "Counterclockwise"], [1, "Clockwise"]] } : descriptorFor("line", key);
        const value = readInputValue(webInput, descriptor, resolvedWeb(selectedWebIndex)[key]);
        if (value === null) return;
        webs[selectedWebIndex].overrides[key] = value;
        mutateAndPreview("line", webInput);
      }
    });
    lab.addEventListener("change", (event) => {
      if (event.target.matches("[data-numeric][data-config-key], [data-numeric][data-placement-key], [data-numeric][data-web-key]")) syncLabControls(lab);
      if (event.target.matches("[data-showcase-overlap-avoidance]")) {
        overlapAvoidanceEnabled = event.target.checked;
        applyLabPreview("layout");
        setStatus(overlapAvoidanceEnabled ? "Desktop overlap avoidance enabled." : "Desktop overlap avoidance disabled for precise positioning.");
      }
      if (event.target.matches("[data-web-select]")) {
        selectedWebIndex = Number(event.target.value);
        selectedTarget = { type: "node", index: selectedWebIndex };
        syncLabControls(lab);
      }
      if (event.target.matches("[data-web-use-global]")) {
        if (event.target.checked) webs[selectedWebIndex].overrides = {};
        mutateAndPreview("line", null, "Selected web now inherits global settings");
      }
      if (event.target.matches("[data-web-override-toggle]")) {
        const group = event.target.dataset.webOverrideToggle;
        const overrides = webs[selectedWebIndex].overrides;
        const keys = group === "appearance" ? webAppearanceKeys : [group];
        keys.forEach((key) => {
          if (event.target.checked) overrides[key] = resolvedWeb(selectedWebIndex)[key];
          else delete overrides[key];
        });
        mutateAndPreview("line");
      }
    });
    lab.addEventListener("focusout", (event) => {
      if (event.target.matches("[data-numeric]")) syncLabControls(lab);
    });
    lab.addEventListener("click", (event) => {
      const radiusButton = event.target.closest("[data-apply-radius]");
      if (radiusButton) {
        const radius = nodePlacements[Number(radiusButton.dataset.applyRadius)].radius;
        nodePlacements.forEach((placement) => { placement.radius = radius; });
        mutateAndPreview("layout", null, "Applied radius to all nodes");
      }
      const applyWeb = event.target.closest("[data-apply-web]");
      if (applyWeb) {
        const group = applyWeb.dataset.applyWeb;
        const source = webs[selectedWebIndex].overrides;
        const keys = group === "appearance" ? webAppearanceKeys : [group];
        webs.forEach((web) => keys.forEach((key) => { if (key in source) web.overrides[key] = source[key]; }));
        mutateAndPreview("line", null, `Applied ${group === "bendDirection" ? "direction" : group} to all webs`);
      }
      if (event.target.closest("[data-reset-web]")) {
        webs[selectedWebIndex].overrides = {};
        mutateAndPreview("line", null, "Selected web reset to global settings");
      }
      if (event.target.closest("[data-clear-webs]")) {
        webs.forEach((web) => { web.overrides = {}; });
        mutateAndPreview("line", null, "Cleared all per-web overrides");
      }
    });

    const persistSnapshot = async (snapshot) => {
      if (!canUseSaveEndpoint()) throw new Error("Saving is unavailable on this server. Start with python tools/serve_showcase_dev.py to save.");
      const response = await fetch(SHOWCASE_SAVE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
      let result = null;
      try { result = await response.json(); } catch { /* Some unsupported servers return HTML. */ }
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || `Save failed with HTTP ${response.status}.`);
      devLabState.saved = cloneShowcaseValue(snapshot);
      devLabState.dirty = false;
    };
    if (!canUseSaveEndpoint()) lab.querySelector("[data-showcase-save]").title = "Start with python tools/serve_showcase_dev.py to save.";
    lab.querySelector("[data-showcase-save]").addEventListener("click", async () => {
      if (devLabState.saving || !devLabState.dirty) return;
      devLabState.saving = true;
      syncSaveButton(lab);
      setStatus("Saving...");
      try {
        await persistSnapshot(currentSnapshot());
        syncLabControls(lab);
        setStatus("Saved to data/showcase-config.json");
      } catch (error) {
        devLabState.dirty = true;
        setStatus(error instanceof Error ? error.message : "Save failed. Working changes were preserved.");
      } finally {
        devLabState.saving = false;
        syncSaveButton(lab);
      }
    });
    lab.querySelector("[data-showcase-reset-all]").addEventListener("click", () => {
      replaceRuntimeSnapshot(devLabState.saved);
      devLabState.dirty = false;
      syncLabControls(lab);
      updateOutput();
      applyLabPreview("layout");
      syncSaveButton(lab);
      setStatus("Reset to last saved configuration");
    });
    lab.querySelector("[data-showcase-restore-originals]").addEventListener("click", () => {
      if (!window.confirm("Restore original values to the working configuration? This does not save automatically.")) return;
      replaceRuntimeSnapshot(devLabState.original);
      syncLabControls(lab);
      updateOutput();
      applyLabPreview("layout");
      markDirty(lab, "Original values restored to working state. Save to persist them.");
    });
    lab.querySelector("[data-showcase-replay]").addEventListener("click", () => { replayMotion(); setStatus("Replaying with current working values."); });
    lab.querySelector("[data-showcase-copy]").addEventListener("click", async () => {
      updateOutput();
      configOutput.hidden = false;
      configOutput.select();
      try { await navigator.clipboard.writeText(configOutput.value); setStatus("Complete version 2 config copied."); }
      catch { setStatus("Clipboard unavailable. The complete config is selected below."); }
    });
    lab.addEventListener("keydown", (event) => { if (event.key === "Escape") closeHelp(); });

    syncLabControls(lab);
    updateOutput();
    syncSaveButton(lab);
  };

  const setInteractive = (interactive) => {
    overlay?.classList.toggle("is-interactive", interactive);
    overlay?.querySelector(".showcase-center")?.toggleAttribute("aria-hidden", !interactive);
    overlay?.querySelector(".showcase-center")?.setAttribute("tabindex", interactive ? "0" : "-1");
    showcaseClose?.toggleAttribute("hidden", !interactive);
    showcaseClose?.setAttribute("aria-hidden", String(!interactive));
    if (showcaseClose) showcaseClose.tabIndex = interactive ? 0 : -1;
    nodes.forEach((node) => {
      node.el.toggleAttribute("aria-hidden", !interactive);
      node.el.setAttribute("tabindex", interactive ? "0" : "-1");
    });
  };

  const launcherCenter = () => {
    const rect = showcaseLauncher.getBoundingClientRect();
    if (rect.width > 1 && rect.height > 1) {
      lastLauncherCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return lastLauncherCenter || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const restoreFocusAfterClose = () => {
    const mobileMenuToggle = document.querySelector("[data-mobile-menu-toggle]");
    const triggerRect = showcaseLauncher.getBoundingClientRect();
    const triggerIsVisible = triggerRect.width > 1 && triggerRect.height > 1;
    const target = !isDesktop() && !triggerIsVisible ? mobileMenuToggle : showcaseLauncher;
    target?.focus();
  };

  const computeExpandedHub = () => {
    if (!isDesktop()) {
      const hubSize = currentHubSize();
      return { x: window.innerWidth * 0.5, y: layout.viewportMargin + 16 + hubSize.height / 2 };
    }
    const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
    const shell = document.querySelector(".resume-shell")?.getBoundingClientRect();
    const left = shell ? shell.left : window.innerWidth * 0.1;
    const width = shell ? shell.width : window.innerWidth * 0.8;
    return {
      x: clamp(left + width * layout.hubXRatio, 360, window.innerWidth - 260),
      y: clamp((topbar?.bottom || 90) + window.innerHeight * layout.hubYOffsetRatio, 210, window.innerHeight - 260),
    };
  };

  const rectsOverlap = (a, b, gap = layout.collisionGap) => !(
    a.x + a.width / 2 + gap < b.x - b.width / 2 ||
    a.x - a.width / 2 - gap > b.x + b.width / 2 ||
    a.y + a.height / 2 + gap < b.y - b.height / 2 ||
    a.y - a.height / 2 - gap > b.y + b.height / 2
  );

  const layoutExpandedNodes = () => {
    const size = currentNodeSize();
    const hubSize = currentHubSize();
    const mobileLayout = !isDesktop();
    const placed = [{ x: hub.expandedX, y: hub.expandedY, width: hubSize.width, height: hubSize.height }];
    const usableWidth = window.innerWidth - layout.viewportMargin * 2;
    const twoColumnWidth = (usableWidth - layout.collisionGap) / 2;
    const mobileColumns = mobileLayout && twoColumnWidth >= 144 ? 2 : 1;
    const mobileCardWidth = Math.min(size.width, mobileColumns === 2 ? twoColumnWidth : usableWidth);
    const mobileGridStart = (window.innerWidth - (mobileColumns * mobileCardWidth + (mobileColumns - 1) * layout.collisionGap)) / 2;
    nodes.forEach((node, index) => {
      const offset = offsets[index % offsets.length];
      const viewportScale = isDesktop() ? Math.min(window.innerWidth / 1280, 1.1) : Math.min(window.innerWidth / 390, 1);
      const distanceScale = viewportScale * (isDesktop() ? layout.desktopDistanceScale : layout.mobileDistanceScale);
      let x = hub.expandedX + offset[0] * distanceScale;
      let y = hub.expandedY + offset[1] * distanceScale;

      if (mobileLayout) {
        const col = index % mobileColumns;
        const row = Math.floor(index / mobileColumns);
        x = mobileGridStart + mobileCardWidth / 2 + col * (mobileCardWidth + layout.collisionGap);
        y = hub.expandedY + hubSize.height / 2 + layout.collisionGap + size.height / 2 + row * (size.height + layout.collisionGap);
      }

      const nodeWidth = mobileLayout ? mobileCardWidth : size.width;
      let rect = { x, y, width: nodeWidth, height: size.height };
      if (!mobileLayout) {
        x = clamp(x, layout.viewportMargin + size.width / 2, window.innerWidth - layout.viewportMargin - size.width / 2);
        y = clamp(y, layout.viewportMargin + size.height / 2, window.innerHeight - layout.viewportMargin - size.height / 2);
        rect = { x, y, width: size.width, height: size.height };
        if (overlapAvoidanceEnabled) {
          for (let attempt = 0; attempt < 10 && placed.some((other) => rectsOverlap(rect, other)); attempt += 1) {
            const angle = Math.atan2(y - hub.expandedY, x - hub.expandedX) + attempt * 0.34;
            const push = 18 + attempt * 10;
            x = clamp(x + Math.cos(angle) * push, layout.viewportMargin + size.width / 2, window.innerWidth - layout.viewportMargin - size.width / 2);
            y = clamp(y + Math.sin(angle) * push, layout.viewportMargin + size.height / 2, window.innerHeight - layout.viewportMargin - size.height / 2);
            rect = { x, y, width: size.width, height: size.height };
          }
        }
      }
      placed.push(rect);
      Object.assign(node, { expandedX: x, expandedY: y, width: nodeWidth, height: size.height });
      node.el.style.setProperty("--w", `${nodeWidth}px`);
      node.el.style.setProperty("--h", `${size.height}px`);
    });
    if (mobileLayout && nodes.length) {
      const lastNode = nodes[nodes.length - 1];
      overlay.style.setProperty("--showcase-content-height", `${Math.max(window.innerHeight, lastNode.expandedY + size.height / 2 + layout.viewportMargin + 16)}px`);
    } else {
      overlay.style.removeProperty("--showcase-content-height");
    }
  };

  const updateLayout = () => {
    const collapsed = launcherCenter();
    const expanded = computeExpandedHub();
    hub.collapsedX = collapsed.x;
    hub.collapsedY = collapsed.y;
    hub.expandedX = expanded.x;
    hub.expandedY = expanded.y;
    if (!hub.x && !hub.y) {
      hub.x = collapsed.x;
      hub.y = collapsed.y;
    }
    nodes.forEach((node) => {
      node.collapsedX = collapsed.x;
      node.collapsedY = collapsed.y;
    });
    layoutExpandedNodes();
    if (state === "collapsed") snapTo(false);
    renderPositions();
  };

  const rectangleEdgePoint = (center, size, incomingVector) => {
    const gap = layout.lineEndpointGap;
    const dx = incomingVector.x || 0.001;
    const dy = incomingVector.y || 0.001;
    const halfW = Math.max(1, size.width / 2 - gap);
    const halfH = Math.max(1, size.height / 2 - gap);
    const t = Math.min(halfW / Math.abs(dx), halfH / Math.abs(dy));
    return { x: center.x + dx * t, y: center.y + dy * t };
  };

  const colorWithOpacity = (color, opacity) => {
    const value = Number.parseInt(color.slice(1), 16);
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${clamp(opacity, 0, 1)})`;
  };

  const parseHexChannels = (color) => {
    const value = Number.parseInt(color.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };

  const formatHexChannels = (channels) => `#${channels
    .map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;

  const smoothGradientColors = (
    startColor,
    middleColor,
    endColor,
    middleStop,
    offsets
  ) => {
    const startChannels = parseHexChannels(startColor);
    const middleChannels = parseHexChannels(middleColor);
    const endChannels = parseHexChannels(endColor);
    const denominator = middleStop * (middleStop - 1);

    const curves = startChannels.map((startChannel, index) => {
      const endDelta = endChannels[index] - startChannel;
      const middleDelta = middleChannels[index] - startChannel;
      const quadratic = (
        middleDelta - endDelta * middleStop
      ) / denominator;
      const linear = endDelta - quadratic;

      return [quadratic, linear, startChannel];
    });

    return offsets.map((offset) => formatHexChannels(
      curves.map(
        ([quadratic, linear, startChannel]) =>
          quadratic * offset * offset
          + linear * offset
          + startChannel
      )
    ));
  };

  const syncLineGradient = (defs, index, settings, start, end) => {
    const id = `showcase-web-gradient-${index + 1}`;
    let gradient = defs.querySelector(`#${id}`);

    if (!gradient) {
      gradient = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "linearGradient"
      );
      gradient.id = id;
      gradient.setAttribute("gradientUnits", "userSpaceOnUse");
      defs.append(gradient);
    }

    gradient.setAttribute("color-interpolation", "sRGB");
    gradient.setAttribute("x1", start.x.toFixed(1));
    gradient.setAttribute("y1", start.y.toFixed(1));
    gradient.setAttribute("x2", end.x.toFixed(1));
    gradient.setAttribute("y2", end.y.toFixed(1));

    const middleStop = clamp(Number(settings.middleStop), 0.1, 0.9);
    const offsets = [
      0,
      middleStop * 0.25,
      middleStop * 0.5,
      middleStop * 0.75,
      middleStop,
      middleStop + (1 - middleStop) * 0.25,
      middleStop + (1 - middleStop) * 0.5,
      middleStop + (1 - middleStop) * 0.75,
      1,
    ];

    let stops = Array.from(gradient.querySelectorAll("stop"));

    if (stops.length !== offsets.length) {
      stops = offsets.map(() => document.createElementNS(
        "http://www.w3.org/2000/svg",
        "stop"
      ));
      gradient.replaceChildren(...stops);
    }

    const colors = smoothGradientColors(
      settings.startColor,
      settings.middleColor,
      settings.endColor,
      middleStop,
      offsets
    );

    stops.forEach((stop, stopIndex) => {
      stop.setAttribute("offset", offsets[stopIndex].toFixed(4));
      stop.setAttribute("stop-color", colors[stopIndex]);
    });

    return id;
  };

  const renderPositions = () => {
    if (!overlay) return;
    const lines = overlay.querySelector(".showcase-lines");
    const defs = lines.querySelector("[data-showcase-line-defs]");
    const center = overlay.querySelector(".showcase-center");
    const hubSize = currentHubSize();
    lines.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
    center.style.setProperty("--x", `${hub.x}px`);
    center.style.setProperty("--y", `${hub.y}px`);
    center.style.setProperty("--hub-w", `${hubSize.width}px`);
    center.style.setProperty("--hub-h", `${hubSize.height}px`);

    nodes.forEach((node, index) => {
      let path = lines.querySelector(`[data-line="${index}"]`);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("showcase-line");
        path.dataset.line = String(index);
        lines.append(path);
      }
      const webSettings = resolvedWeb(index);
      const bend = webSettings.bendDirection * webSettings.bend;
      const control = { x: (hub.x + node.x) / 2 + bend, y: (hub.y + node.y) / 2 - bend * 0.35 };
      const start = rectangleEdgePoint({ x: hub.x, y: hub.y }, hubSize, { x: control.x - hub.x, y: control.y - hub.y });
      const end = rectangleEdgePoint({ x: node.x, y: node.y }, { width: node.width, height: node.height }, { x: control.x - node.x, y: control.y - node.y });
      const gradientId = syncLineGradient(defs, index, webSettings, start, end);
      path.setAttribute("d", `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
      path.style.stroke = webSettings.gradientEnabled ? `url(#${gradientId})` : [webSettings.startColor, webSettings.endColor, webSettings.middleColor][index % 3];
      path.style.strokeWidth = String(node.active ? webSettings.activeWidth : webSettings.width);
      path.style.setProperty("--showcase-web-opacity", webSettings.opacity);
      const glowBlur = webSettings.glowBlur + (node.active ? 2 : 0);
      const glowOpacity = clamp(webSettings.glowOpacity + (node.active ? 0.18 : 0), 0, 1);
      path.style.filter = glowBlur > 0 && glowOpacity > 0 ? `drop-shadow(0 0 ${glowBlur}px ${colorWithOpacity(node.active ? webSettings.endColor : webSettings.middleColor, glowOpacity)})` : "none";
      const length = path.getTotalLength();
      const lineProgress = Number.parseFloat(path.style.getPropertyValue("--line-progress") || "0");
      path.style.strokeDasharray = length.toFixed(2);
      path.style.strokeDashoffset = (length * (1 - clamp(lineProgress, 0, 1))).toFixed(2);
      path.classList.toggle("is-active", node.active);
      node.el.style.setProperty("--x", `${node.x}px`);
      node.el.style.setProperty("--y", `${node.y}px`);
    });
  };

  const setSelection = (type = null, index = null) => {
    selectedTarget = type ? { type, index } : null;
    overlay.querySelector(".showcase-center")?.classList.toggle("is-dev-selected", type === "hub");
    nodes.forEach((node, nodeIndex) => node.el.classList.toggle("is-dev-selected", type === "node" && nodeIndex === index));
    if (type === "node") selectedWebIndex = index;
    if (devLabElement) syncLabControls(devLabElement);
  };

  const addResizeHandles = (element) => {
    if (!debugAvailable || element.querySelector("[data-showcase-resize]")) return;
    ["e", "s", "se"].forEach((direction) => {
      const handle = document.createElement("span");
      handle.className = `showcase-dev-resize-handle is-${direction}`;
      handle.dataset.showcaseResize = direction;
      handle.setAttribute("aria-hidden", "true");
      element.append(handle);
    });
  };

  const reconcileDraggedNode = (index) => {
    const node = nodes[index];
    const viewportScale = Math.min(window.innerWidth / 1280, 1.1);
    const distanceScale = viewportScale * layout.desktopDistanceScale;
    const dx = (node.expandedX - hub.expandedX) / distanceScale;
    const dy = (node.expandedY - hub.expandedY) / distanceScale;
    nodePlacements[index].angle = Math.round(((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360);
    nodePlacements[index].radius = Math.round(clamp(Math.hypot(dx, dy), 60, 320));
    refreshOffsets();
  };

  const beginManipulation = (event, type, index, resizeDirection = null) => {
    if (!devEditingActive || state !== "expanded") return;
    if ((type === "node" || type === "hub") && !resizeDirection && !isDesktop()) {
      devLabElement?.querySelector("[data-showcase-status]")?.replaceChildren("Direct positioning uses the desktop tuning context. Mobile sizing remains available.");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelection(type, index);
    const target = type === "hub" ? overlay.querySelector(".showcase-center") : nodes[index]?.el;
    target?.setPointerCapture?.(event.pointerId);
    pointer.active = false;
    manipulation = {
      type,
      index,
      resizeDirection,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSnapshot: currentSnapshot(),
      moved: false,
      nodeSize: currentNodeSize(),
      hubSize: currentHubSize(),
    };
    overlay.classList.add("is-dev-manipulating");
  };

  const moveManipulation = (event) => {
    if (!manipulation || event.pointerId !== manipulation.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - manipulation.startX;
    const dy = event.clientY - manipulation.startY;
    manipulation.moved ||= Math.hypot(dx, dy) > 3;
    if (manipulation.resizeDirection) {
      const group = manipulation.type === "node" ? "node" : "hub";
      const config = manipulation.type === "node" ? nodeConfig : hubConfig;
      const start = manipulation.type === "node" ? manipulation.nodeSize : manipulation.hubSize;
      const prefix = isDesktop() ? "desktop" : "mobile";
      if (manipulation.resizeDirection.includes("e")) config[`${prefix}Width`] = cleanNumber(start.width + dx, descriptorFor(group, `${prefix}Width`));
      if (manipulation.resizeDirection.includes("s")) config[`${prefix}Height`] = cleanNumber(start.height + dy, descriptorFor(group, `${prefix}Height`));
      applyLabPreview(group);
    } else if (manipulation.type === "node") {
      const viewportScale = Math.min(window.innerWidth / 1280, 1.1);
      const distanceScale = viewportScale * layout.desktopDistanceScale;
      const polarX = (event.clientX - hub.expandedX) / distanceScale;
      const polarY = (event.clientY - hub.expandedY) / distanceScale;
      nodePlacements[manipulation.index].angle = Math.round(((Math.atan2(polarY, polarX) * 180 / Math.PI) + 360) % 360);
      nodePlacements[manipulation.index].radius = Math.round(clamp(Math.hypot(polarX, polarY), 60, 320));
      refreshOffsets();
      updateLayout();
      reconcileDraggedNode(manipulation.index);
      updateLayout();
      snapTo(true);
      renderPositions();
    } else {
      const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
      const shell = document.querySelector(".resume-shell")?.getBoundingClientRect();
      const left = shell ? shell.left : window.innerWidth * 0.1;
      const width = shell ? shell.width : window.innerWidth * 0.8;
      layout.hubXRatio = cleanNumber((event.clientX - left) / width, descriptorFor("layout", "hubXRatio"));
      layout.hubYOffsetRatio = cleanNumber((event.clientY - (topbar?.bottom || 90)) / window.innerHeight, descriptorFor("layout", "hubYOffsetRatio"));
      applyLabPreview("layout");
    }
    if (devLabElement) {
      syncLabControls(devLabElement);
      markDirty(devLabElement, manipulation.resizeDirection ? "Global size changed by direct manipulation" : "Position changed by direct manipulation");
    }
  };

  const finishManipulation = (event, cancel = false) => {
    if (!manipulation || (event?.pointerId !== undefined && event.pointerId !== manipulation.pointerId)) return false;
    const target = manipulation.type === "hub" ? overlay.querySelector(".showcase-center") : nodes[manipulation.index]?.el;
    if (cancel) {
      replaceRuntimeSnapshot(manipulation.startSnapshot);
      applyLabPreview("layout");
      if (devLabElement) syncLabControls(devLabElement);
    }
    target?.releasePointerCapture?.(manipulation.pointerId);
    const moved = manipulation.moved;
    manipulation = null;
    overlay.classList.remove("is-dev-manipulating");
    pointer.active = false;
    if (devLabElement) markDirty(devLabElement, cancel ? "Manipulation cancelled" : "Direct manipulation complete");
    return moved;
  };

  const bindDirectEditing = () => {
    if (!debugAvailable) return;
    const center = overlay.querySelector(".showcase-center");
    addResizeHandles(center);
    center.addEventListener("pointerdown", (event) => beginManipulation(event, "hub", null, event.target.closest("[data-showcase-resize]")?.dataset.showcaseResize || null));
    center.addEventListener("click", (event) => {
      if (!devEditingActive) return;
      event.preventDefault();
      setSelection("hub", null);
    });
    center.addEventListener("keydown", (event) => {
      if (!devEditingActive || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      setSelection("hub", null);
    });
    overlay.addEventListener("pointermove", moveManipulation);
    overlay.addEventListener("pointerup", (event) => finishManipulation(event));
    overlay.addEventListener("pointercancel", (event) => finishManipulation(event, true));
  };

  const setLineProgress = (progress, elapsed = motion.webDeployDuration + motion.webDeployStagger * Math.max(0, nodes.length - 1)) => {
    if (!overlay) return;
    const clamped = clamp(progress, 0, 1);
    overlay.querySelectorAll(".showcase-line").forEach((path) => {
      const index = Number.parseInt(path.dataset.line || "0", 10);
      const staggered = Number.isFinite(elapsed)
        ? clamp((elapsed - index * motion.webDeployStagger) / motion.webDeployDuration, 0, 1)
        : clamped;
      const lineProgress = clamped <= 0 ? 0 : (clamped >= 1 ? 1 : ease(staggered));
      path.style.setProperty("--line-progress", lineProgress.toFixed(4));
      path.style.opacity = lineProgress > 0 ? "" : "0";
    });
  };

  const setNodeReveal = (progress) => {
    if (!overlay) return;
    const clamped = clamp(progress, 0, 1);
    overlay.style.setProperty("--showcase-node-opacity", clamped.toFixed(4));
    overlay.style.setProperty("--showcase-node-scale", (0.72 + clamped * 0.28).toFixed(4));
  };

  const hubArcPoint = (from, to, progress, reverse = false) => {
    const eased = ease(progress);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const arc = clamp(distance * motion.hubArcStrength, motion.hubArcMin, motion.hubArcMax);
    const direction = (reverse ? -1 : 1) * motion.hubArcDirection;
    const normal = { x: -dy / distance, y: dx / distance };
    const lift = Math.sin(Math.PI * eased) * arc * direction;
    return { x: from.x + dx * eased + normal.x * lift, y: from.y + dy * eased + normal.y * lift };
  };

  function snapTo(expanded) {
    const targetHub = expanded ? { x: hub.expandedX, y: hub.expandedY } : { x: hub.collapsedX, y: hub.collapsedY };
    hub.x = targetHub.x; hub.y = targetHub.y;
    nodes.forEach((node) => {
      node.x = expanded ? node.expandedX : node.collapsedX;
      node.y = expanded ? node.expandedY : node.collapsedY;
      node.vx = 0; node.vy = 0;
    });
    setLineProgress(expanded ? 1 : 0);
    setNodeReveal(expanded ? 1 : 0);
  }

  const setVisualState = (nextState) => {
    state = nextState;
    overlay.classList.toggle("is-expanded", nextState === "expanded");
    overlay.classList.toggle("is-hub-expanding", nextState === "hub-expanding");
    overlay.classList.toggle("is-web-deploying", nextState === "web-deploying");
    overlay.classList.toggle("is-nodes-revealing", nextState === "nodes-revealing");
    overlay.classList.toggle("is-collapsing", nextState === "collapsing");
    overlay.classList.toggle("is-collapsed", nextState === "collapsed");
    const active = nextState !== "collapsed";
    showcaseLauncher.classList.toggle("is-detached", active);
    showcaseLauncher.setAttribute("aria-expanded", active ? "true" : "false");
    setInteractive(nextState === "expanded");
    if (nextState === "collapsing" && !isDesktop()) showcaseClose?.removeAttribute("hidden");
  };

  const requestMotionFrame = () => {
    if (!frame) frame = requestAnimationFrame(stepMotion);
  };

  const cancelMotionFrame = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const cancelCloseReset = () => {
    if (closeResetFrame) cancelAnimationFrame(closeResetFrame);
    closeResetFrame = 0;
  };

  const clearMobileCloseStyles = () => {
    overlay.style.removeProperty("--showcase-hub-opacity");
    overlay.style.removeProperty("--showcase-backdrop-opacity");
  };

  const finalizeMobileClose = () => {
    activeTransition = null;
    setVisualState("collapsed");
    cancelCloseReset();
    closeResetFrame = requestAnimationFrame(() => {
      closeResetFrame = 0;
      if (state !== "collapsed" || targetExpanded) return;
      snapTo(false);
      renderPositions();
      clearMobileCloseStyles();
      restoreFocusAfterClose();
    });
  };

  const beginTransition = (expanded) => {
    if (!projectsLoaded) return;
    if (!expanded && ["collapsed", "collapsing"].includes(state)) return;
    if (expanded || isDesktop()) updateLayout();
    targetExpanded = expanded;
    if (expanded) cancelCloseReset();
    if (expanded) overlay.scrollTop = 0;
    cancelMotionFrame();
    pointer.active = false;

    if (isReduced()) {
      activeTransition = null;
      if (!expanded && !isDesktop()) {
        finalizeMobileClose();
        return;
      }
      snapTo(expanded);
      setVisualState(expanded ? "expanded" : "collapsed");
      renderPositions();
      if (!expanded) restoreFocusAfterClose();
      return;
    }

    const now = performance.now();
    const from = { x: hub.x, y: hub.y };
    const mobileClose = !expanded && !isDesktop();
    const to = expanded ? { x: hub.expandedX, y: hub.expandedY } : (mobileClose ? { x: hub.x, y: hub.y - 12 } : { x: hub.collapsedX, y: hub.collapsedY });
    nodes.forEach((node) => {
      node.x = expanded ? node.expandedX : node.x;
      node.y = expanded ? node.expandedY : node.y;
      node.vx = 0;
      node.vy = 0;
    });
    activeTransition = {
      expanded,
      start: now,
      from,
      to,
      reverse: !expanded,
      mobileClose,
      duration: expanded ? motion.hubTravelDuration : (mobileClose ? 180 : motion.hubCollapseDuration),
    };
    setVisualState(expanded ? "hub-expanding" : "collapsing");
    if (!expanded && !mobileClose) setNodeReveal(0);
    overlay.style.setProperty("--showcase-hub-opacity", "1");
    overlay.style.setProperty("--showcase-backdrop-opacity", "1");
    setLineProgress(expanded ? 0 : 0);
    requestMotionFrame();
  };

  function stepPointer() {
    if (manipulation) return false;
    let moving = false;
    nodes.forEach((node) => {
      let tx = node.expandedX;
      let ty = node.expandedY;
      if (pointer.active) {
        const dx = pointer.x - node.expandedX;
        const dy = pointer.y - node.expandedY;
        const distance = Math.hypot(dx, dy) || 1;
        const falloff = Math.max(0, 1 - distance / motion.pointerRadius);
        tx += (dx / distance) * falloff * motion.pointerInfluence;
        ty += (dy / distance) * falloff * motion.pointerInfluence * 0.78;
      }
      node.vx = (node.vx + (tx - node.x) * motion.pointerStrength) * motion.pointerDamping;
      node.vy = (node.vy + (ty - node.y) * motion.pointerStrength) * motion.pointerDamping;
      node.x += node.vx;
      node.y += node.vy;
      moving ||= Math.hypot(node.x - tx, node.y - ty) > motion.settleDistance || Math.hypot(node.vx, node.vy) > motion.settleVelocity;
    });
    renderPositions();
    return moving || (pointer.active && state === "expanded");
  }

  function stepMotion(now) {
    frame = 0;

    if (!activeTransition) {
      if (state === "expanded" && stepPointer()) requestMotionFrame();
      return;
    }

    const transition = activeTransition;
    const hubProgress = clamp((now - transition.start) / transition.duration, 0, 1);
    const point = transition.mobileClose
      ? { x: transition.from.x, y: transition.from.y + (transition.to.y - transition.from.y) * ease(hubProgress) }
      : hubArcPoint(transition.from, transition.to, hubProgress, transition.reverse);
    hub.x = point.x;
    hub.y = point.y;

    if (transition.expanded) {
      nodes.forEach((node) => { node.x = node.expandedX; node.y = node.expandedY; });
      const webStart = transition.start + transition.duration;
      const webElapsed = Math.max(0, now - webStart);
      const maxStagger = motion.webDeployStagger * Math.max(0, nodes.length - 1);
      const webProgress = clamp(webElapsed / (motion.webDeployDuration + maxStagger), 0, 1);
      const nodeProgress = ease((webElapsed - motion.nodeRevealDelay) / motion.nodeRevealDuration);
      setLineProgress(webProgress, webElapsed);
      setNodeReveal(nodeProgress);
      if (hubProgress >= 1 && webElapsed <= 16) setVisualState("web-deploying");
      if (nodeProgress > 0 && nodeProgress < 1) setVisualState("nodes-revealing");
      renderPositions();
      if (webProgress < 1 || nodeProgress < 1) {
        requestMotionFrame();
        return;
      }
      activeTransition = null;
      snapTo(true);
      setVisualState("expanded");
      renderPositions();
      return;
    }

    if (transition.mobileClose) {
      setNodeReveal(1 - ease(hubProgress));
      overlay.style.setProperty("--showcase-hub-opacity", String(1 - ease(hubProgress)));
      overlay.style.setProperty("--showcase-backdrop-opacity", String(1 - ease(hubProgress)));
    } else {
      nodes.forEach((node) => { node.x = node.collapsedX; node.y = node.collapsedY; });
      setNodeReveal(0);
    }
    setLineProgress(0);
    renderPositions();
    if (hubProgress < 1) {
      requestMotionFrame();
      return;
    }
    if (transition.mobileClose) {
      finalizeMobileClose();
      return;
    }
    activeTransition = null;
    snapTo(false);
    setVisualState("collapsed");
    renderPositions();
    restoreFocusAfterClose();
  }

  const loadProjects = async () => {
    try {
      const projects = getPublishableProjects(await loadProjectRegistry())
        .filter((project) => project.featured === true);
      const featuredProjects = sortFeaturedProjects(projects)
        .slice(0, 7);
      featuredProjects.forEach((project, index) => {
        const meta = showcaseMeta(project);
        const title = meta.title || project.title;
        const description = meta.description || project.summary || project.category || "Project case study";
        const el = document.createElement("a");
        el.className = `showcase-node showcase-node--${escapeHtml(meta.motion || "static")}`;
        el.href = project.href;
        el.setAttribute("aria-label", `${title}: ${description}`);
        el.innerHTML = `<span class="showcase-stage showcase-stage--${escapeHtml(meta.visualKey || "default")}">${showcaseVisualSvg(meta.visualKey)}</span><span class="showcase-copy"><span class="showcase-name">${escapeHtml(title)}</span><span class="showcase-description">${escapeHtml(description)}</span></span>`;
        showcaseContent.append(el);
        const model = { el, index, x: 0, y: 0, vx: 0, vy: 0, collapsedX: 0, collapsedY: 0, expandedX: 0, expandedY: 0, width: nodeConfig.desktopWidth, height: nodeConfig.desktopHeight, active: false };
        el.addEventListener("mouseenter", () => { model.active = true; renderPositions(); });
        el.addEventListener("mouseleave", () => { model.active = false; renderPositions(); });
        el.addEventListener("focus", () => { model.active = true; renderPositions(); });
        el.addEventListener("blur", () => { model.active = false; renderPositions(); });
        if (debugAvailable) {
          addResizeHandles(el);
          el.addEventListener("pointerdown", (event) => beginManipulation(event, "node", index, event.target.closest("[data-showcase-resize]")?.dataset.showcaseResize || null));
          el.addEventListener("click", (event) => {
            if (!devEditingActive) return;
            event.preventDefault();
            setSelection("node", index);
          });
          el.addEventListener("keydown", (event) => {
            if (!devEditingActive || !["Enter", " "].includes(event.key)) return;
            event.preventDefault();
            setSelection("node", index);
          });
        }
        nodes.push(model);
      });
      projectsLoaded = true;
      updateLayout();
      setInteractive(false);
    } catch (error) {
      overlay.querySelector(".showcase-error").hidden = false;
      console.error(error);
    }
  };

  buildOverlay();
  buildShowcaseDevLab();
  bindDirectEditing();
  loadProjects();

  showcaseLauncher.addEventListener("click", (event) => {
    if (!projectsLoaded) return;
    event.preventDefault();
    beginTransition(!targetExpanded || state === "collapsed" || state === "collapsing");
  });

  document.addEventListener("click", (event) => {
    if (["collapsed", "collapsing"].includes(state)) return;
    if (event.target.closest(".showcase-overlay, [data-showcase-launcher]")) return;
    if (devEditingActive) {
      setSelection();
      return;
    }
    beginTransition(false);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (manipulation) {
      event.preventDefault();
      finishManipulation(null, true);
      return;
    }
    if (devEditingActive && selectedTarget) {
      event.preventDefault();
      setSelection();
      return;
    }
    if (state === "collapsed") return;
    event.preventDefault();
    beginTransition(false);
  });

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (!projectsLoaded || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      pointer.active = false;
      updateLayout();
      snapTo(targetExpanded);
      renderPositions();
    });
  }, { passive: true });
};

if (showcaseLauncher) {
  loadShowcaseConfig()
    .then((showcaseSnapshots) => initShowcase(showcaseSnapshots))
    .catch((error) => {
      console.error("Showcase launcher disabled because configuration could not be loaded.", error);
    });
}
