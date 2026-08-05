(function exposeShowcaseConfigContract(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  else root.ShowcaseConfigContract = contract;
})(typeof globalThis === "object" ? globalThis : this, function createShowcaseConfigContract() {
  "use strict";

  const VERSION = 2;
  const NODE_COUNT = 7;
  const GROUPS = ["layout", "node", "hub", "line", "motion", "effects"];
  const HEX_COLOR = /^#[0-9a-f]{6}$/i;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const DESCRIPTORS = {
    layout: [
      { key: "desktopDistanceScale", label: "Desktop distance", min: 0.7, max: 1.4, step: 0.01, help: "Scales node distance from the hub on desktop." },
      { key: "mobileDistanceScale", label: "Mobile distance", min: 0.7, max: 1.35, step: 0.01, help: "Retained mobile distance scale for the compact layout." },
      { key: "hubXRatio", label: "Hub X", min: 0.25, max: 0.75, step: 0.01, help: "Horizontal hub position inside the resume shell." },
      { key: "hubYOffsetRatio", label: "Hub Y offset", min: 0.05, max: 0.45, step: 0.01, help: "Vertical desktop hub offset below the top bar." },
      { key: "mobileHubYRatio", label: "Mobile hub Y", min: 0.08, max: 0.35, step: 0.01, help: "Vertical hub position in the compact mobile layout." },
      { key: "viewportMargin", label: "Viewport margin", min: 0, max: 80, step: 1, unit: "px", help: "Minimum desktop space between nodes and viewport edges." },
      { key: "collisionGap", label: "Collision gap", min: 0, max: 48, step: 1, unit: "px", help: "Extra space used by desktop overlap avoidance." },
      { key: "lineBend", label: "Web bend", min: -80, max: 80, step: 1, unit: "px", help: "Global curve amount inherited by webs.", apply: "web-bend" },
      { key: "lineEndpointGap", label: "Endpoint gap", min: 0, max: 24, step: 1, unit: "px", help: "Inset between a web endpoint and its card edge." },
    ],
    node: [
      { key: "desktopWidth", label: "Desktop width", min: 160, max: 320, step: 1, unit: "px", help: "Global width applied to every desktop node." },
      { key: "desktopHeight", label: "Desktop height", min: 64, max: 140, step: 1, unit: "px", help: "Global height applied to every desktop node." },
      { key: "mobileWidth", label: "Mobile width", min: 120, max: 220, step: 1, unit: "px", help: "Maximum width applied to every mobile node." },
      { key: "mobileHeight", label: "Mobile height", min: 48, max: 96, step: 1, unit: "px", help: "Global height applied to every mobile node." },
      { key: "backgroundOpacity", label: "Background", min: 0, max: 1, step: 0.01, help: "Node surface opacity." },
      { key: "hoverBackgroundOpacity", label: "Hover background", min: 0, max: 1, step: 0.01, help: "Node surface opacity on hover or keyboard focus." },
      { key: "borderWidth", label: "Border width", min: 0, max: 4, step: 0.1, unit: "px", help: "Global node border thickness." },
      { key: "borderOpacity", label: "Border opacity", min: 0, max: 1, step: 0.01, help: "Global node border visibility." },
      { key: "borderRadius", label: "Border radius", min: 0, max: 32, step: 1, unit: "px", help: "Global node corner rounding." },
    ],
    hub: [
      { key: "desktopWidth", label: "Desktop width", min: 80, max: 200, step: 1, unit: "px", help: "Desktop hub width." },
      { key: "desktopHeight", label: "Desktop height", min: 40, max: 120, step: 1, unit: "px", help: "Desktop hub height." },
      { key: "mobileWidth", label: "Mobile width", min: 72, max: 150, step: 1, unit: "px", help: "Mobile hub width." },
      { key: "mobileHeight", label: "Mobile height", min: 34, max: 80, step: 1, unit: "px", help: "Mobile hub height." },
    ],
    line: [
      { key: "width", label: "Width", min: 0.5, max: 6, step: 0.1, unit: "px", help: "Global resting web width." },
      { key: "activeWidth", label: "Active width", min: 0.5, max: 8, step: 0.1, unit: "px", help: "Web width when its node is active." },
      { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01, help: "Global web opacity." },
      { key: "bendDirection", label: "Bend direction", type: "select", options: [["alternating", "Alternating"], ["clockwise", "Clockwise"], ["counterclockwise", "Counterclockwise"]], help: "Default curve direction inherited by webs." },
      { key: "gradientEnabled", label: "Gradient", type: "boolean", help: "Blend each web from hub to node using three colors." },
      { key: "startColor", label: "Hub color", type: "color", help: "Gradient color at the hub." },
      { key: "middleColor", label: "Middle color", type: "color", help: "Gradient color at the adjustable middle stop." },
      { key: "endColor", label: "Node color", type: "color", help: "Gradient color at the node." },
      { key: "middleStop", label: "Middle stop", min: 0.1, max: 0.9, step: 0.01, help: "Position of the middle gradient color." },
      { key: "glowBlur", label: "Glow blur", min: 0, max: 18, step: 0.5, unit: "px", help: "Soft luminous halo around each web." },
      { key: "glowOpacity", label: "Glow opacity", min: 0, max: 1, step: 0.01, help: "Visibility of the web halo." },
    ],
    motion: [
      { key: "hubTravelDuration", label: "Hub travel", min: 80, max: 1500, step: 10, unit: "ms", help: "Time for the hub to reach its expanded position." },
      { key: "hubCollapseDuration", label: "Hub collapse", min: 80, max: 1500, step: 10, unit: "ms", help: "Time for the hub to return to the launcher." },
      { key: "hubArcStrength", label: "Arc strength", min: 0, max: 0.6, step: 0.01, help: "Curvature of hub travel." },
      { key: "hubArcDirection", label: "Arc direction", type: "select", options: [[-1, "Opposite"], [1, "Current"]], help: "Side used by the hub travel arc." },
      { key: "hubArcMin", label: "Minimum arc", min: 0, max: 240, step: 1, unit: "px", help: "Minimum hub travel arc height." },
      { key: "hubArcMax", label: "Maximum arc", min: 0, max: 400, step: 1, unit: "px", help: "Maximum hub travel arc height." },
      { key: "webDeployDuration", label: "Web deploy", min: 60, max: 1200, step: 10, unit: "ms", help: "Time for each web to draw." },
      { key: "webDeployStagger", label: "Web stagger", min: 0, max: 200, step: 1, unit: "ms", help: "Delay between neighboring web draws." },
      { key: "nodeRevealDelay", label: "Node delay", min: 0, max: 1000, step: 10, unit: "ms", help: "Delay before nodes begin appearing." },
      { key: "nodeRevealDuration", label: "Node reveal", min: 50, max: 1200, step: 10, unit: "ms", help: "Time for nodes to reach full opacity." },
      { key: "pointerStrength", label: "Pointer spring", min: 0.01, max: 0.5, step: 0.01, help: "Spring response for pointer attraction." },
      { key: "pointerDamping", label: "Pointer damping", min: 0, max: 0.98, step: 0.01, help: "Velocity retained by pointer attraction." },
      { key: "pointerRadius", label: "Pointer radius", min: 100, max: 1200, step: 10, unit: "px", help: "Distance at which pointer attraction begins." },
      { key: "pointerInfluence", label: "Pointer influence", min: 0, max: 80, step: 1, unit: "px", help: "Maximum pointer-driven node displacement." },
      { key: "settleDistance", label: "Settle distance", min: 0.05, max: 5, step: 0.05, unit: "px", help: "Distance threshold for ending pointer motion." },
      { key: "settleVelocity", label: "Settle velocity", min: 0.01, max: 2, step: 0.01, help: "Velocity threshold for ending pointer motion." },
      { key: "easing", label: "Easing", type: "select", options: [["linear", "linear"], ["easeOutCubic", "easeOutCubic"], ["easeInOutCubic", "easeInOutCubic"]], help: "Timing curve used by Showcase transitions." },
    ],
    effects: [
      { key: "nodeShadowBlur", label: "Node shadow blur", min: 20, max: 100, step: 1, unit: "px", help: "Blur of the approved far node lift shadow." },
      { key: "nodeShadowOpacity", label: "Node shadow opacity", min: 0, max: 1, step: 0.01, help: "Opacity of the approved far node lift shadow." },
      { key: "nodeGlowBlur", label: "Node glow blur", min: 0, max: 60, step: 1, unit: "px", help: "Blur of the approved outer node glow." },
      { key: "nodeGlowOpacity", label: "Node glow opacity", min: 0, max: 0.5, step: 0.01, help: "Opacity of the approved outer node glow." },
      { key: "hubShadowBlur", label: "Hub shadow blur", min: 20, max: 120, step: 1, unit: "px", help: "Blur of the approved far hub lift shadow." },
      { key: "hubShadowOpacity", label: "Hub shadow opacity", min: 0, max: 1, step: 0.01, help: "Opacity of the approved far hub lift shadow." },
      { key: "hubGlowBlur", label: "Hub glow blur", min: 0, max: 80, step: 1, unit: "px", help: "Blur of the approved outer hub glow." },
      { key: "hubGlowOpacity", label: "Hub glow opacity", min: 0, max: 0.5, step: 0.01, help: "Opacity of the approved outer hub glow." },
    ],
  };

  const LINE_V2_DEFAULTS = {
    bendDirection: "alternating",
    gradientEnabled: true,
    startColor: "#6ff8ff",
    middleColor: "#9fa7ff",
    endColor: "#c77dff",
    middleStop: 0.54,
    glowBlur: 7,
    glowOpacity: 0.3,
  };
  const EFFECT_DEFAULTS = {
    nodeShadowBlur: 66,
    nodeShadowOpacity: 0.52,
    nodeGlowBlur: 30,
    nodeGlowOpacity: 0.09,
    hubShadowBlur: 76,
    hubShadowOpacity: 0.42,
    hubGlowBlur: 46,
    hubGlowOpacity: 0.2,
  };
  const WEB_OVERRIDE_DESCRIPTORS = {
    bend: { min: -80, max: 80 },
    bendDirection: { options: [-1, 1] },
    gradientEnabled: { type: "boolean" },
    startColor: { type: "color" },
    middleColor: { type: "color" },
    endColor: { type: "color" },
    middleStop: { min: 0.1, max: 0.9 },
    width: { min: 0.5, max: 6 },
    activeWidth: { min: 0.5, max: 8 },
    opacity: { min: 0, max: 1 },
    glowBlur: { min: 0, max: 18 },
    glowOpacity: { min: 0, max: 1 },
  };

  const makeWebs = () => Array.from({ length: NODE_COUNT }, (_, index) => ({ id: `node-${index + 1}`, overrides: {} }));

  const validateValue = (value, descriptor, path) => {
    if (descriptor.type === "boolean") {
      if (typeof value !== "boolean") throw new Error(`${path} must be a boolean.`);
      return;
    }
    if (descriptor.type === "color") {
      if (typeof value !== "string" || !HEX_COLOR.test(value)) throw new Error(`${path} must be a six-digit hex color.`);
      return;
    }
    if (descriptor.options) {
      if (!descriptor.options.some((option) => String(Array.isArray(option) ? option[0] : option) === String(value))) throw new Error(`${path} is outside allowed values.`);
      return;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < descriptor.min || value > descriptor.max) throw new Error(`${path} is outside allowed range.`);
  };

  const validateSnapshot = (snapshot, label = "configuration") => {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error(`Invalid Showcase ${label}: expected object.`);
    if (Object.keys(snapshot).sort().join(",") !== "config,nodePlacements,webs") throw new Error(`Invalid Showcase ${label}: expected config, nodePlacements, and webs.`);
    if (!snapshot.config || typeof snapshot.config !== "object" || Array.isArray(snapshot.config)) throw new Error(`Invalid Showcase ${label}: missing config.`);
    if (Object.keys(snapshot.config).sort().join(",") !== [...GROUPS].sort().join(",")) throw new Error(`Invalid Showcase ${label}: config groups are incomplete.`);
    GROUPS.forEach((group) => {
      const source = snapshot.config[group];
      const descriptors = DESCRIPTORS[group];
      if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`Invalid Showcase ${label}: missing ${group}.`);
      const allowedKeys = descriptors.map(({ key }) => key);
      if (Object.keys(source).sort().join(",") !== [...allowedKeys].sort().join(",")) throw new Error(`Invalid Showcase ${label}: ${group} has missing or extra keys.`);
      descriptors.forEach((descriptor) => validateValue(source[descriptor.key], descriptor, `${group}.${descriptor.key}`));
    });
    if (!Array.isArray(snapshot.nodePlacements) || snapshot.nodePlacements.length !== NODE_COUNT) throw new Error(`Invalid Showcase ${label}: nodePlacements must contain ${NODE_COUNT} entries.`);
    snapshot.nodePlacements.forEach((placement, index) => {
      if (!placement || typeof placement !== "object" || Object.keys(placement).sort().join(",") !== "angle,radius") throw new Error(`Invalid Showcase ${label}: node placement ${index + 1} is malformed.`);
      validateValue(placement.angle, { min: 0, max: 359 }, `nodePlacements.${index}.angle`);
      validateValue(placement.radius, { min: 60, max: 320 }, `nodePlacements.${index}.radius`);
    });
    if (!Array.isArray(snapshot.webs) || snapshot.webs.length !== NODE_COUNT) throw new Error(`Invalid Showcase ${label}: webs must contain ${NODE_COUNT} entries.`);
    snapshot.webs.forEach((web, index) => {
      if (!web || typeof web !== "object" || Object.keys(web).sort().join(",") !== "id,overrides" || web.id !== `node-${index + 1}`) throw new Error(`Invalid Showcase ${label}: web ${index + 1} is malformed.`);
      if (!web.overrides || typeof web.overrides !== "object" || Array.isArray(web.overrides)) throw new Error(`Invalid Showcase ${label}: web ${index + 1} overrides must be an object.`);
      Object.entries(web.overrides).forEach(([key, value]) => {
        const descriptor = WEB_OVERRIDE_DESCRIPTORS[key];
        if (!descriptor) throw new Error(`Invalid Showcase ${label}: web ${index + 1} override ${key} is unsupported.`);
        validateValue(value, descriptor, `webs.${index}.overrides.${key}`);
      });
    });
    return clone(snapshot);
  };

  const migrateSnapshot = (snapshot, options = {}) => {
    const migrated = clone(snapshot);
    if (!migrated.config.effects) migrated.config.effects = clone(EFFECT_DEFAULTS);
    migrated.config.line = { ...clone(LINE_V2_DEFAULTS), ...migrated.config.line };
    if (options.neutralGradient) migrated.config.line.gradientEnabled = false;
    if (!migrated.webs) migrated.webs = makeWebs();
    return validateSnapshot(migrated, options.label || "migrated configuration");
  };

  const migrateFile = (file) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) throw new Error("Showcase configuration file must be an object.");
    if (file.version !== 1 && file.version !== VERSION) throw new Error("Showcase configuration version is unsupported.");
    const original = file.version === 1 ? migrateSnapshot(file.original, { label: "original", neutralGradient: true }) : validateSnapshot(file.original, "original");
    const saved = file.version === 1 ? migrateSnapshot(file.saved, { label: "saved" }) : validateSnapshot(file.saved, "saved");
    return { version: VERSION, original, saved };
  };

  const comparable = (value) => {
    if (typeof value === "number") return Math.round(value * 1000000) / 1000000;
    if (Array.isArray(value)) return value.map(comparable);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, comparable(value[key])]));
    return value;
  };
  const equal = (left, right) => JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));

  return {
    VERSION,
    NODE_COUNT,
    GROUPS,
    DESCRIPTORS,
    WEB_OVERRIDE_DESCRIPTORS,
    LINE_V2_DEFAULTS,
    EFFECT_DEFAULTS,
    clone,
    equal,
    makeWebs,
    migrateFile,
    migrateSnapshot,
    validateSnapshot,
  };
});
