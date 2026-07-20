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

  const mobileQuery = window.matchMedia("(max-width: 640px)");
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
        ? projects.filter((project) => project.featured === true)
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
const SHOWCASE_GROUPS = ["layout", "node", "hub", "line", "motion"];
const SHOWCASE_NODE_PLACEMENT_COUNT = 7;
const SHOWCASE_EASING_OPTIONS = ["linear", "easeOutCubic", "easeInOutCubic"];
const showcaseConfig = { layout: {}, node: {}, hub: {}, line: {}, motion: {} };

const showcaseConfigDescriptors = {
  layout: [
    { key: "desktopDistanceScale", label: "Desktop distance", min: 0.7, max: 1.4, step: 0.01 },
    { key: "mobileDistanceScale", label: "Mobile distance", min: 0.7, max: 1.35, step: 0.01 },
    { key: "hubXRatio", label: "Hub X", min: 0.25, max: 0.75, step: 0.01 },
    { key: "hubYOffsetRatio", label: "Hub Y offset", min: 0.05, max: 0.45, step: 0.01 },
    { key: "mobileHubYRatio", label: "Mobile hub Y", min: 0.08, max: 0.35, step: 0.01 },
    { key: "viewportMargin", label: "Viewport margin", min: 0, max: 80, step: 1, unit: "px" },
    { key: "collisionGap", label: "Collision gap", min: 0, max: 48, step: 1, unit: "px" },
    { key: "lineBend", label: "Line bend", min: -80, max: 80, step: 1, unit: "px" },
    { key: "lineEndpointGap", label: "Endpoint gap", min: 0, max: 24, step: 1, unit: "px" },
  ],
  node: [
    { key: "desktopWidth", label: "Desktop width", min: 160, max: 320, step: 1, unit: "px" },
    { key: "desktopHeight", label: "Desktop height", min: 64, max: 140, step: 1, unit: "px" },
    { key: "mobileWidth", label: "Mobile width", min: 120, max: 220, step: 1, unit: "px" },
    { key: "mobileHeight", label: "Mobile height", min: 48, max: 96, step: 1, unit: "px" },
    { key: "backgroundOpacity", label: "Background", min: 0, max: 1, step: 0.01 },
    { key: "hoverBackgroundOpacity", label: "Hover background", min: 0, max: 1, step: 0.01 },
    { key: "borderWidth", label: "Border width", min: 0, max: 4, step: 0.1, unit: "px" },
    { key: "borderOpacity", label: "Border opacity", min: 0, max: 1, step: 0.01 },
    { key: "borderRadius", label: "Border radius", min: 0, max: 32, step: 1, unit: "px" },
  ],
  hub: [
    { key: "desktopWidth", label: "Desktop width", min: 80, max: 200, step: 1, unit: "px" },
    { key: "desktopHeight", label: "Desktop height", min: 40, max: 120, step: 1, unit: "px" },
    { key: "mobileWidth", label: "Mobile width", min: 72, max: 150, step: 1, unit: "px" },
    { key: "mobileHeight", label: "Mobile height", min: 34, max: 80, step: 1, unit: "px" },
  ],
  line: [
    { key: "width", label: "Width", min: 0.5, max: 6, step: 0.1, unit: "px" },
    { key: "activeWidth", label: "Active width", min: 0.5, max: 8, step: 0.1, unit: "px" },
    { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
  ],
  motion: [
    { key: "hubTravelDuration", label: "Hub travel", min: 80, max: 1500, step: 10, unit: "ms" },
    { key: "hubCollapseDuration", label: "Hub collapse", min: 80, max: 1500, step: 10, unit: "ms" },
    { key: "hubArcStrength", label: "Arc strength", min: 0, max: 0.6, step: 0.01 },
    { key: "hubArcDirection", label: "Arc direction", type: "select", options: [[-1, "Opposite"], [1, "Current"]] },
    { key: "hubArcMin", label: "Minimum arc", min: 0, max: 240, step: 1, unit: "px" },
    { key: "hubArcMax", label: "Maximum arc", min: 0, max: 400, step: 1, unit: "px" },
    { key: "webDeployDuration", label: "Web deploy", min: 60, max: 1200, step: 10, unit: "ms" },
    { key: "webDeployStagger", label: "Web stagger", min: 0, max: 200, step: 1, unit: "ms" },
    { key: "nodeRevealDelay", label: "Node delay", min: 0, max: 1000, step: 10, unit: "ms" },
    { key: "nodeRevealDuration", label: "Node reveal", min: 50, max: 1200, step: 10, unit: "ms" },
    { key: "pointerStrength", label: "Pointer spring", min: 0.01, max: 0.5, step: 0.01 },
    { key: "pointerDamping", label: "Pointer damping", min: 0, max: 0.98, step: 0.01 },
    { key: "pointerRadius", label: "Pointer radius", min: 100, max: 1200, step: 10, unit: "px" },
    { key: "pointerInfluence", label: "Pointer influence", min: 0, max: 80, step: 1, unit: "px" },
    { key: "settleDistance", label: "Settle distance", min: 0.05, max: 5, step: 0.05, unit: "px" },
    { key: "settleVelocity", label: "Settle velocity", min: 0.01, max: 2, step: 0.01 },
    { key: "easing", label: "Easing", type: "select", options: SHOWCASE_EASING_OPTIONS.map((value) => [value, value]) },
  ],
};

const cloneShowcaseValue = (value) => JSON.parse(JSON.stringify(value));

const validateShowcaseSnapshot = (snapshot, label = "configuration") => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error(`Invalid Showcase ${label}: expected object.`);
  const allowedSnapshotKeys = ["config", "nodePlacements"];
  Object.keys(snapshot).forEach((key) => { if (!allowedSnapshotKeys.includes(key)) throw new Error(`Invalid Showcase ${label}: unexpected ${key}.`); });
  if (!snapshot.config || typeof snapshot.config !== "object" || Array.isArray(snapshot.config)) throw new Error(`Invalid Showcase ${label}: missing config.`);
  Object.keys(snapshot.config).forEach((group) => { if (!SHOWCASE_GROUPS.includes(group)) throw new Error(`Invalid Showcase ${label}: unexpected group ${group}.`); });
  SHOWCASE_GROUPS.forEach((group) => {
    const sourceGroup = snapshot.config[group];
    if (!sourceGroup || typeof sourceGroup !== "object" || Array.isArray(sourceGroup)) throw new Error(`Invalid Showcase ${label}: missing ${group}.`);
    const descriptors = showcaseConfigDescriptors[group];
    const allowedKeys = descriptors.map(({ key }) => key);
    Object.keys(sourceGroup).forEach((key) => { if (!allowedKeys.includes(key)) throw new Error(`Invalid Showcase ${label}: unexpected ${group}.${key}.`); });
    descriptors.forEach((descriptor) => {
      if (!(descriptor.key in sourceGroup)) throw new Error(`Invalid Showcase ${label}: missing ${group}.${descriptor.key}.`);
      const value = sourceGroup[descriptor.key];
      if (descriptor.type === "select") {
        if (!descriptor.options.some(([optionValue]) => String(optionValue) === String(value))) throw new Error(`Invalid Showcase ${label}: ${group}.${descriptor.key} is outside allowed values.`);
        return;
      }
      if (typeof value !== "number" || !Number.isFinite(value) || value < descriptor.min || value > descriptor.max) throw new Error(`Invalid Showcase ${label}: ${group}.${descriptor.key} is outside allowed range.`);
    });
  });
  if (!Array.isArray(snapshot.nodePlacements) || snapshot.nodePlacements.length !== SHOWCASE_NODE_PLACEMENT_COUNT) throw new Error(`Invalid Showcase ${label}: nodePlacements must contain ${SHOWCASE_NODE_PLACEMENT_COUNT} entries.`);
  snapshot.nodePlacements.forEach((placement, index) => {
    if (!placement || typeof placement !== "object" || Array.isArray(placement)) throw new Error(`Invalid Showcase ${label}: node placement ${index + 1} must be an object.`);
    const keys = Object.keys(placement);
    if (keys.length !== 2 || !keys.includes("angle") || !keys.includes("radius")) throw new Error(`Invalid Showcase ${label}: node placement ${index + 1} has unexpected keys.`);
    if (typeof placement.angle !== "number" || !Number.isFinite(placement.angle) || placement.angle < 0 || placement.angle > 359) throw new Error(`Invalid Showcase ${label}: node placement ${index + 1} angle is invalid.`);
    if (typeof placement.radius !== "number" || !Number.isFinite(placement.radius) || placement.radius < 60 || placement.radius > 320) throw new Error(`Invalid Showcase ${label}: node placement ${index + 1} radius is invalid.`);
  });
  return cloneShowcaseValue(snapshot);
};

const loadShowcaseConfig = async () => {
  const response = await fetch(SHOWCASE_CONFIG_URL, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Showcase configuration request failed with ${response.status}.`);
  const file = await response.json();
  if (!file || typeof file !== "object" || file.version !== 1) throw new Error("Showcase configuration version is unsupported.");
  const original = validateShowcaseSnapshot(file.original, "original");
  const saved = validateShowcaseSnapshot(file.saved, "saved");
  return { version: file.version, original, saved };
};

const showcaseDefaults = {
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
    "gravity-fleet": `<svg class="showcase-scene-svg gravity-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><ellipse class="orbit-ring" cx="34" cy="28" rx="23" ry="15"/><circle class="planet-halo" cx="34" cy="28" r="12"/><circle class="planet" cx="34" cy="28" r="8"/><g class="ship-dot ship-dot-a"><circle cx="34" cy="8" r="2.6"/></g><g class="ship-dot ship-dot-b"><circle cx="50" cy="19" r="2.6"/></g><g class="ship-dot ship-dot-c"><circle cx="34" cy="45" r="2.6"/></g><g class="attacker-wave"><circle class="attacker" cx="66" cy="14" r="2.8"/></g><path class="laser" d="M50 19 55 20"/><circle class="burst" cx="55" cy="20" r="3.5"/></svg>`,
    "public-charging": `<svg class="showcase-scene-svg ev-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><g class="charger"><rect class="charger-body" x="6" y="10" width="12" height="20" rx="2"/><path class="charger-bolt" d="m13 13-4 7h4l-2 6 6-8h-4z"/><path class="charger-base" d="M9 30v9M5 39h14"/></g><path class="charge-cable" d="M18 23c6 1 2 10 9 11"/><g class="ev-car"><path class="ev-body" d="M15 34h5l5-9h22l8 9h7v7H15z"/><path class="ev-window" d="M27 27h17l5 6H23z"/><path class="ev-bolt" d="m41 28-4 7h4l-3 7 8-10h-4z"/><g class="wheel wheel-rear"><circle cx="27" cy="42" r="5"/><path d="M23.5 42h7M27 38.5v7"/></g><g class="wheel wheel-front"><circle cx="52" cy="42" r="5"/><path d="M48.5 42h7M52 38.5v7"/></g></g></svg>`,
    "shelf-signal": `<svg class="showcase-scene-svg shelf-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path class="shelf-frame" d="M7 12v33M31 12v33M5 27h28M5 44h28"/><rect class="pkg pkg-a" x="10" y="18" width="7" height="9" rx="1"/><rect class="pkg pkg-before" x="20" y="14" width="8" height="13" rx="1"/><rect class="pkg pkg-current" x="20" y="14" width="8" height="13" rx="1"/><rect class="pkg pkg-c" x="11" y="34" width="8" height="10" rx="1"/><path class="chart-grid" d="M38 20h27M38 31h27M49 15v29M60 15v29"/><path class="chart-axis" d="M38 15v29h28"/><path class="unit-rise" d="M40 40c6-2 9-7 13-8 5-2 7-9 12-12"/><circle class="unit-dot" cx="65" cy="20" r="2.4"/></svg>`,
    "colony-ops": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path class="terrain" d="M8 42c10-8 20-9 31-3 7 4 14 3 25-4"/><rect x="18" y="20" width="12" height="11" rx="2"/><rect x="39" y="15" width="10" height="16" rx="2"/><path d="M30 25h9M24 31v8M44 31v7"/><circle cx="24" cy="41" r="3"/><circle cx="44" cy="40" r="3"/></svg>`,
    "procurement-kpi": `<svg class="showcase-scene-svg static-scene" viewBox="0 0 72 56" aria-hidden="true" focusable="false"><path d="M13 42h46"/><rect x="17" y="29" width="8" height="13" rx="1"/><rect x="32" y="18" width="8" height="24" rx="1"/><rect x="47" y="25" width="8" height="17" rx="1"/><path class="accent" d="M14 24l15-7 13 9 16-15"/><circle cx="29" cy="17" r="2.5"/><circle cx="42" cy="26" r="2.5"/></svg>`,
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

  const { layout, node: nodeConfig, hub: hubConfig, line: lineConfig, motion } = showcaseConfig;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isReduced = () => reducedMotionQuery.matches;
  const isDesktop = () => window.matchMedia("(min-width: 860px) and (min-height: 620px) and (pointer: fine)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  let overlay;
  let projectsLoaded = false;
  let state = "collapsed";
  let targetExpanded = false;
  let frame = 0;
  let activeTransition = null;
  let nodes = [];
  let hub = { x: 0, y: 0, collapsedX: 0, collapsedY: 0, expandedX: 0, expandedY: 0 };
  let pointer = { x: 0, y: 0, active: false };

  const easingFns = {
    linear: (t) => t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  // Browser-coordinate polar placements: 0deg = right, 90deg = down, 180deg = left, and 270deg = up.
  const nodePlacements = cloneShowcaseValue(showcaseSnapshots.saved.nodePlacements);
  const devLabState = {
    original: cloneShowcaseValue(showcaseSnapshots.original),
    saved: cloneShowcaseValue(showcaseSnapshots.saved),
    working: { config: showcaseConfig, nodePlacements },
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
    { id: "line", label: "Lines" },
    { id: "motion", label: "Motion" },
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
    return clamp(number, descriptor.min, descriptor.max);
  };

  const normalizeValue = (value, descriptor, defaultValue) => {
    if (descriptor.type === "select") {
      const match = descriptor.options.find(([optionValue]) => String(optionValue) === String(value));
      if (!match) return null;
      return typeof defaultValue === "number" ? Number(match[0]) : String(match[0]);
    }
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
  };

  const applyLabPreview = (group) => {
    enforceInvariants();
    refreshOffsets();
    applyVisualConfig();
    if (projectsLoaded && ["layout", "node", "hub", "line"].includes(group)) {
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
    enforceInvariants();
    refreshOffsets();
  };

  const currentSnapshot = () => validateShowcaseSnapshot({ config: cloneShowcaseValue(showcaseConfig), nodePlacements: cloneShowcaseValue(nodePlacements) }, "working");


  const syncSaveButton = (lab) => {
    const saveButton = lab?.querySelector("[data-showcase-save]");
    if (!saveButton) return;

    saveButton.disabled = devLabState.saving || !devLabState.dirty;
    saveButton.setAttribute("aria-busy", String(devLabState.saving));
  };

  const markDirty = (lab, message = "Unsaved changes") => {
    devLabState.dirty = true;
    syncSaveButton(lab);
    lab.querySelector("[data-showcase-status]").textContent = message;
  };


  const canUseSaveEndpoint = () => localDebugHost && ["http:", "https:"].includes(window.location.protocol);

  const formatObject = (object, indent = 2) => JSON.stringify(object, null, indent).replace(/"([A-Za-z_$][\w$]*)":/g, "$1:");
  const configText = () => `const showcaseConfig = ${formatObject(showcaseConfig)};\n\n// Browser-coordinate polar placements: 0deg = right, 90deg = down, 180deg = left, and 270deg = up.\nconst nodePlacements = ${formatObject(nodePlacements)};`;

  removeLegacyLabStorage();

  const buildOverlay = () => {
    overlay = document.createElement("nav");
    overlay.className = "showcase-overlay is-collapsed";
    overlay.setAttribute("aria-label", "Project showcase");
    overlay.innerHTML = `
      <svg class="showcase-lines" aria-hidden="true"></svg>
      <a class="showcase-center" href="/projects/">View all</a>
      <p class="showcase-error" hidden>Project data is temporarily unavailable. <a href="/projects/">View all projects</a>.</p>`;
    document.body.append(overlay);
    applyVisualConfig();
    overlay.addEventListener("pointermove", (event) => {
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

  const syncLabControls = (lab) => {
    if (!lab) return;
    Object.entries(configDescriptors).forEach(([group, descriptors]) => {
      descriptors.forEach((descriptor) => {
        const value = showcaseConfig[group][descriptor.key];
        lab.querySelectorAll(`[data-config-group="${group}"][data-config-key="${descriptor.key}"]`).forEach((input) => { input.value = String(value); });
        const output = lab.querySelector(`[data-config-output="${group}.${descriptor.key}"]`);
        if (output) output.textContent = valueLabel(value, descriptor);
      });
    });
    nodePlacements.forEach((placement, index) => {
      ["angle", "radius"].forEach((key) => {
        const descriptor = key === "angle" ? { unit: "deg" } : { unit: "px" };
        lab.querySelectorAll(`[data-placement-index="${index}"][data-placement-key="${key}"]`).forEach((input) => { input.value = String(placement[key]); });
        const output = lab.querySelector(`[data-placement-output="${index}.${key}"]`);
        if (output) output.textContent = valueLabel(placement[key], descriptor);
      });
    });
  };

  const renderControl = (group, descriptor) => {
    const id = `showcase-dev-${group}-${descriptor.key}`;
    if (descriptor.type === "select") {
      const options = descriptor.options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
      return `<label class="showcase-dev-control" for="${id}"><span>${escapeHtml(descriptor.label)}</span><select id="${id}" data-config-group="${group}" data-config-key="${escapeHtml(descriptor.key)}">${options}</select></label>`;
    }
    return `<label class="showcase-dev-control"><span>${escapeHtml(descriptor.label)} <output data-config-output="${group}.${descriptor.key}"></output></span><span class="showcase-dev-inputs"><input id="${id}-range" type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-config-group="${group}" data-config-key="${escapeHtml(descriptor.key)}" aria-label="${escapeHtml(descriptor.label)}"><input id="${id}-number" type="number" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-config-group="${group}" data-config-key="${escapeHtml(descriptor.key)}" aria-label="${escapeHtml(descriptor.label)} value"></span></label>`;
  };

  const renderPlacementControls = () => nodePlacements.map((placement, index) => `
    <fieldset class="showcase-dev-polar-group">
      <legend>Node ${index + 1}</legend>
      ${["angle", "radius"].map((key) => {
        const descriptor = key === "angle" ? { label: "Angle", min: 0, max: 359, step: 1, unit: "deg" } : { label: "Radius", min: 60, max: 320, step: 1, unit: "px" };
        return `<label class="showcase-dev-control"><span>${descriptor.label} <output data-placement-output="${index}.${key}"></output></span><span class="showcase-dev-inputs"><input type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-placement-index="${index}" data-placement-key="${key}" aria-label="Node ${index + 1} ${descriptor.label}"><input type="number" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" data-placement-index="${index}" data-placement-key="${key}" aria-label="Node ${index + 1} ${descriptor.label} value"></span></label>`;
      }).join("")}
    </fieldset>`).join("");

  const buildShowcaseDevLab = () => {
    if (!debugAvailable) return;
    const tabButtons = labTabs.map(({ id, label }, index) => `<button type="button" role="tab" id="showcase-dev-tab-${id}" aria-controls="showcase-dev-panel-${id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}" data-showcase-tab="${id}">${label}</button>`).join("");
    const panels = labTabs.map(({ id, label }, index) => `<section class="showcase-dev-tabpanel" role="tabpanel" id="showcase-dev-panel-${id}" aria-labelledby="showcase-dev-tab-${id}" data-showcase-panel="${id}" ${index === 0 ? "" : "hidden"}><h4>${escapeHtml(label)}</h4><div class="showcase-dev-controls">${configDescriptors[id].map((descriptor) => renderControl(id, descriptor)).join("")}${id === "layout" ? `<div class="showcase-dev-polar"><h5>Polar nodes</h5>${renderPlacementControls()}</div>` : ""}</div></section>`).join("");
    const lab = document.createElement("aside");
    lab.className = "showcase-dev-panel";
    lab.setAttribute("aria-label", "Showcase Dev Lab");
    lab.innerHTML = `
      <label class="showcase-dev-toggle">
        <input type="checkbox" data-showcase-debug-toggle ${debugInitiallyEnabled ? "checked" : ""}>
        <span>Showcase Dev Lab</span>
      </label>
      <section class="showcase-dev-drawer" data-showcase-debug-drawer ${debugInitiallyEnabled ? "" : "hidden"}>
        <header><div><strong>Showcase Dev Lab</strong><small>Local runtime preview</small></div></header>
        <nav class="showcase-dev-labs" aria-label="Development labs"><button type="button" class="is-selected" aria-current="page">Showcase</button></nav>
        <div class="showcase-dev-tabs" role="tablist" aria-label="Showcase configuration">${tabButtons}</div>
        ${panels}
        <div class="showcase-dev-actions">
          <button type="button" data-showcase-save>Save</button>
          <button type="button" data-showcase-reset-all>Reset to saved</button>
          <button type="button" data-showcase-replay>Replay</button>
          <button type="button" data-showcase-copy>Copy config</button>
        </div>
        <details class="showcase-dev-advanced">
          <summary>Advanced</summary>
          <button type="button" data-showcase-restore-originals>Restore originals</button>
        </details>
        <textarea class="showcase-dev-output" data-showcase-config-output readonly hidden aria-label="Current Showcase configuration"></textarea>
        <p class="showcase-dev-status" data-showcase-status aria-live="polite">Using saved configuration</p>
      </section>`;
    overlay.append(lab);

    const toggle = lab.querySelector("[data-showcase-debug-toggle]");
    const drawer = lab.querySelector("[data-showcase-debug-drawer]");
    const configOutput = lab.querySelector("[data-showcase-config-output]");
    const status = lab.querySelector("[data-showcase-status]");
    const tabs = Array.from(lab.querySelectorAll("[role='tab']"));
    let activeGroup = "layout";
    const setStatus = (message) => { status.textContent = message; };
    const updateOutput = () => { configOutput.value = configText(); };

    const saveButton = lab.querySelector("[data-showcase-save]");

    if (!canUseSaveEndpoint()) {
      saveButton.title = "Start with python tools/serve_showcase_dev.py to save.";
    }

    syncSaveButton(lab);

    const activateTab = (tab, focus = false) => {
      activeGroup = tab.dataset.showcaseTab;
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.setAttribute("aria-selected", String(selected));
        candidate.tabIndex = selected ? 0 : -1;
        lab.querySelector(`#${candidate.getAttribute("aria-controls")}`).hidden = !selected;
      });
      if (focus) tab.focus();
    };

    toggle.addEventListener("change", () => {
      drawer.hidden = !toggle.checked;
      try { localStorage.setItem(debugStorageKey, String(toggle.checked)); } catch { /* The toggle remains usable for the current page load. */ }
      if (toggle.checked) syncLabControls(lab);
    });

    lab.querySelector(".showcase-dev-tabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[role='tab']");
      if (tab) activateTab(tab);
    });
    lab.querySelector(".showcase-dev-tabs").addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = tabs.indexOf(document.activeElement);
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[nextIndex], true);
    });

    lab.addEventListener("input", (event) => {
      const configInput = event.target.closest("[data-config-group][data-config-key]");
      const placementInput = event.target.closest("[data-placement-index][data-placement-key]");
      if (configInput) {
        const group = configInput.dataset.configGroup;
        const key = configInput.dataset.configKey;
        const descriptor = descriptorFor(group, key);
        if (!descriptor) return;
        const value = normalizeValue(configInput.value, descriptor, showcaseConfig[group][key]);
        if (value === null) return;
        showcaseConfig[group][key] = value;
        enforceInvariants();
        syncLabControls(lab);
        updateOutput();
        applyLabPreview(group);
        markDirty(lab);
        return;
      }
      if (placementInput) {
        const index = Number(placementInput.dataset.placementIndex);
        const key = placementInput.dataset.placementKey;
        const descriptor = key === "angle" ? { min: 0, max: 359, step: 1 } : { min: 60, max: 320, step: 1 };
        const value = cleanNumber(placementInput.value, descriptor);
        if (!nodePlacements[index] || value === null) return;
        nodePlacements[index][key] = value;
        syncLabControls(lab);
        updateOutput();
        applyLabPreview("layout");
        markDirty(lab);
      }
    });


    const persistSnapshot = async (snapshot, successMessage) => {
      if (!canUseSaveEndpoint()) {
        throw new Error(
          "Saving is unavailable on this server. " +
          "Start with python tools/serve_showcase_dev.py to save."
        );
      }

      const response = await fetch(SHOWCASE_SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });

      if (response.status === 501) {
        throw new Error(
          "Saving is unavailable on this server. " +
          "Start with python tools/serve_showcase_dev.py to save."
        );
      }

      let result = null;

      try {
        result = await response.json();
      } catch {
        // Standard `python -m http.server` and proxy errors may return HTML.
      }

      if (!response.ok || result?.ok !== true) {
        throw new Error(
          result?.error || `Save failed with HTTP ${response.status}.`
        );
      }

      devLabState.saved = cloneShowcaseValue(snapshot);
      devLabState.dirty = false;
      setStatus(successMessage);
    };


    lab.querySelector("[data-showcase-save]").addEventListener("click", async () => {
      if (devLabState.saving || !devLabState.dirty) return;

      devLabState.saving = true;
      syncSaveButton(lab);
      setStatus("Saving...");

      try {
        const snapshot = currentSnapshot();
        await persistSnapshot(
          snapshot,
          "Saved to data/showcase-config.json"
        );
      } catch (error) {
        // Keep the state dirty so the user can retry.
        devLabState.dirty = true;
        setStatus(
          error instanceof Error
            ? error.message
            : "Save failed. Start the dedicated local Dev Lab server and try again."
        );
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



    lab.querySelector("[data-showcase-restore-originals]").addEventListener("click", async () => {
      if (
        !window.confirm(
          "Restore the original Showcase configuration and save it to data/showcase-config.json?"
        )
      ) {
        return;
      }

      if (devLabState.saving) return;

      const previousWorking = currentSnapshot();

      devLabState.saving = true;
      syncSaveButton(lab);
      setStatus("Saving...");

      replaceRuntimeSnapshot(devLabState.original);
      syncLabControls(lab);
      updateOutput();
      applyLabPreview("layout");

      try {
        const snapshot = currentSnapshot();
        await persistSnapshot(
          snapshot,
          "Original configuration restored"
        );
      } catch (error) {
        replaceRuntimeSnapshot(previousWorking);
        devLabState.dirty = true;

        syncLabControls(lab);
        updateOutput();
        applyLabPreview("layout");

        setStatus(
          error instanceof Error
            ? error.message
            : "Restore failed. Start the dedicated local Dev Lab server and try again."
        );
      } finally {
        devLabState.saving = false;
        syncSaveButton(lab);
      }
    });


    lab.querySelector("[data-showcase-replay]").addEventListener("click", () => {
      replayMotion();
      setStatus("Replaying with the current values.");
    });

    lab.querySelector("[data-showcase-copy]").addEventListener("click", async () => {
      updateOutput();
      configOutput.hidden = false;
      configOutput.select();
      try {
        await navigator.clipboard.writeText(configOutput.value);
        setStatus("Config copied to the clipboard.");
      } catch {
        setStatus("Clipboard unavailable. The config text is selected below.");
      }
    });

    syncLabControls(lab);
    updateOutput();
  };

  const setInteractive = (interactive) => {
    overlay?.classList.toggle("is-interactive", interactive);
    overlay?.querySelector(".showcase-center")?.toggleAttribute("aria-hidden", !interactive);
    overlay?.querySelector(".showcase-center")?.setAttribute("tabindex", interactive ? "0" : "-1");
    nodes.forEach((node) => {
      node.el.toggleAttribute("aria-hidden", !interactive);
      node.el.setAttribute("tabindex", interactive ? "0" : "-1");
    });
  };

  const launcherCenter = () => {
    const rect = showcaseLauncher.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const computeExpandedHub = () => {
    if (!isDesktop()) return { x: window.innerWidth * 0.5, y: clamp(window.innerHeight * layout.mobileHubYRatio, 118, 172) };
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
    const placed = [{ x: hub.expandedX, y: hub.expandedY, width: hubSize.width, height: hubSize.height }];
    nodes.forEach((node, index) => {
      const offset = offsets[index % offsets.length];
      const viewportScale = isDesktop() ? Math.min(window.innerWidth / 1280, 1.1) : Math.min(window.innerWidth / 390, 1);
      const distanceScale = viewportScale * (isDesktop() ? layout.desktopDistanceScale : layout.mobileDistanceScale);
      let x = hub.expandedX + offset[0] * distanceScale;
      let y = hub.expandedY + offset[1] * distanceScale;

      if (!isDesktop()) {
        const columns = window.innerWidth < 430 ? 2 : 3;
        const col = index % columns;
        const row = Math.floor(index / columns);
        x = layout.viewportMargin + size.width / 2 + col * ((window.innerWidth - layout.viewportMargin * 2 - size.width) / Math.max(1, columns - 1));
        y = hub.expandedY + (80 + row * (size.height + 12)) * layout.mobileDistanceScale;
      }

      x = clamp(x, layout.viewportMargin + size.width / 2, window.innerWidth - layout.viewportMargin - size.width / 2);
      y = clamp(y, layout.viewportMargin + size.height / 2, window.innerHeight - layout.viewportMargin - size.height / 2);
      let rect = { x, y, width: size.width, height: size.height };
      for (let attempt = 0; attempt < 10 && placed.some((other) => rectsOverlap(rect, other)); attempt += 1) {
        const angle = Math.atan2(y - hub.expandedY, x - hub.expandedX) + attempt * 0.34;
        const push = 18 + attempt * 10;
        x = clamp(x + Math.cos(angle) * push, layout.viewportMargin + size.width / 2, window.innerWidth - layout.viewportMargin - size.width / 2);
        y = clamp(y + Math.sin(angle) * push, layout.viewportMargin + size.height / 2, window.innerHeight - layout.viewportMargin - size.height / 2);
        rect = { x, y, width: size.width, height: size.height };
      }
      placed.push(rect);
      Object.assign(node, { expandedX: x, expandedY: y, width: size.width, height: size.height });
      node.el.style.setProperty("--w", `${size.width}px`);
      node.el.style.setProperty("--h", `${size.height}px`);
    });
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

  const renderPositions = () => {
    if (!overlay) return;
    const lines = overlay.querySelector(".showcase-lines");
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
      const bend = ((index % 2) ? -1 : 1) * layout.lineBend;
      const control = { x: (hub.x + node.x) / 2 + bend, y: (hub.y + node.y) / 2 - bend * 0.35 };
      const start = rectangleEdgePoint({ x: hub.x, y: hub.y }, hubSize, { x: control.x - hub.x, y: control.y - hub.y });
      const end = rectangleEdgePoint({ x: node.x, y: node.y }, { width: node.width, height: node.height }, { x: control.x - node.x, y: control.y - node.y });
      path.setAttribute("d", `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
      const length = path.getTotalLength();
      const lineProgress = Number.parseFloat(path.style.getPropertyValue("--line-progress") || "0");
      path.style.strokeDasharray = length.toFixed(2);
      path.style.strokeDashoffset = (length * (1 - clamp(lineProgress, 0, 1))).toFixed(2);
      path.classList.toggle("is-active", node.active);
      node.el.style.setProperty("--x", `${node.x}px`);
      node.el.style.setProperty("--y", `${node.y}px`);
    });
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
  };

  const requestMotionFrame = () => {
    if (!frame) frame = requestAnimationFrame(stepMotion);
  };

  const cancelMotionFrame = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const beginTransition = (expanded) => {
    if (!projectsLoaded) return;
    updateLayout();
    targetExpanded = expanded;
    cancelMotionFrame();
    pointer.active = false;

    if (isReduced()) {
      activeTransition = null;
      snapTo(expanded);
      setVisualState(expanded ? "expanded" : "collapsed");
      renderPositions();
      if (!expanded && overlay.contains(document.activeElement)) showcaseLauncher.focus();
      return;
    }

    const now = performance.now();
    const from = { x: hub.x, y: hub.y };
    const to = expanded ? { x: hub.expandedX, y: hub.expandedY } : { x: hub.collapsedX, y: hub.collapsedY };
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
      duration: expanded ? motion.hubTravelDuration : motion.hubCollapseDuration,
    };
    setVisualState(expanded ? "hub-expanding" : "collapsing");
    if (!expanded) setNodeReveal(0);
    setLineProgress(expanded ? 0 : 0);
    requestMotionFrame();
  };

  function stepPointer() {
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
    const point = hubArcPoint(transition.from, transition.to, hubProgress, transition.reverse);
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

    nodes.forEach((node) => { node.x = node.collapsedX; node.y = node.collapsedY; });
    setLineProgress(0);
    setNodeReveal(0);
    renderPositions();
    if (hubProgress < 1) {
      requestMotionFrame();
      return;
    }
    activeTransition = null;
    snapTo(false);
    setVisualState("collapsed");
    renderPositions();
    if (overlay.contains(document.activeElement)) showcaseLauncher.focus();
  }

  const loadProjects = async () => {
    try {
      const projects = getPublishableProjects(await loadProjectRegistry())
        .filter((project) => project.featured === true)
        .slice(0, 7);
      projects.forEach((project, index) => {
        const meta = showcaseMeta(project);
        const title = meta.title || project.title;
        const description = meta.description || project.summary || project.category || "Project case study";
        const el = document.createElement("a");
        el.className = `showcase-node showcase-node--${escapeHtml(meta.motion || "static")}`;
        el.href = project.href;
        el.setAttribute("aria-label", `${title}: ${description}`);
        el.innerHTML = `<span class="showcase-stage showcase-stage--${escapeHtml(meta.visualKey || "default")}">${showcaseVisualSvg(meta.visualKey)}</span><span class="showcase-copy"><span class="showcase-name">${escapeHtml(title)}</span><span class="showcase-description">${escapeHtml(description)}</span></span>`;
        overlay.append(el);
        const model = { el, index, x: 0, y: 0, vx: 0, vy: 0, collapsedX: 0, collapsedY: 0, expandedX: 0, expandedY: 0, width: nodeConfig.desktopWidth, height: nodeConfig.desktopHeight, active: false };
        el.addEventListener("mouseenter", () => { model.active = true; renderPositions(); });
        el.addEventListener("mouseleave", () => { model.active = false; renderPositions(); });
        el.addEventListener("focus", () => { model.active = true; renderPositions(); });
        el.addEventListener("blur", () => { model.active = false; renderPositions(); });
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
  loadProjects();

  showcaseLauncher.addEventListener("click", (event) => {
    if (!projectsLoaded) return;
    event.preventDefault();
    beginTransition(!targetExpanded || state === "collapsed" || state === "collapsing");
  });

  document.addEventListener("click", (event) => {
    if (["collapsed", "collapsing"].includes(state)) return;
    if (event.target.closest(".showcase-overlay, [data-showcase-launcher]")) return;
    beginTransition(false);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || state === "collapsed") return;
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

loadShowcaseConfig()
  .then((showcaseSnapshots) => initShowcase(showcaseSnapshots))
  .catch((error) => {
    console.error("Showcase launcher disabled because configuration could not be loaded.", error);
  });