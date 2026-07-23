export const CAMERA_ORIENTATIONS = Object.freeze({
  desktop: "desktop",
  portrait: "mobile-portrait",
  landscape: "mobile-landscape"
});

const PORTRAIT_ROTATION = -Math.PI / 2;
const EPSILON = 1e-9;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeRect(rect, fallback = {}) {
  const width = Math.max(EPSILON, finite(rect?.width, fallback.width ?? 1));
  const height = Math.max(EPSILON, finite(rect?.height, fallback.height ?? 1));
  return Object.freeze({
    x: finite(rect?.x, fallback.x ?? 0),
    y: finite(rect?.y, fallback.y ?? 0),
    width,
    height
  });
}

function rotationFor(orientation) {
  return orientation === CAMERA_ORIENTATIONS.portrait ? PORTRAIT_ROTATION : 0;
}

function closeEnough(a, b) {
  return Math.abs(a - b) <= EPSILON;
}

function sameSnapshot(a, b) {
  if (!a || !b || a.orientation !== b.orientation) return false;
  return ["rotation", "scale", "a", "b", "c", "d", "e", "f"].every(key => closeEnough(a[key], b[key]))
    && ["worldBounds", "viewport", "tacticalRect"].every(key => ["x", "y", "width", "height"].every(axis => closeEnough(a[key][axis], b[key][axis])));
}

function createSnapshot({ worldBounds, viewport, tacticalRect, orientation }) {
  const rotation = rotationFor(orientation);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedWidth = Math.abs(cosine) * worldBounds.width + Math.abs(sine) * worldBounds.height;
  const rotatedHeight = Math.abs(sine) * worldBounds.width + Math.abs(cosine) * worldBounds.height;
  const scale = Math.min(tacticalRect.width / rotatedWidth, tacticalRect.height / rotatedHeight);
  const worldCenter = {
    x: worldBounds.x + worldBounds.width / 2,
    y: worldBounds.y + worldBounds.height / 2
  };
  const screenCenter = {
    x: tacticalRect.x + tacticalRect.width / 2,
    y: tacticalRect.y + tacticalRect.height / 2
  };
  const a = scale * cosine;
  const b = scale * sine;
  const c = -scale * sine;
  const d = scale * cosine;
  const e = screenCenter.x - a * worldCenter.x - c * worldCenter.y;
  const f = screenCenter.y - b * worldCenter.x - d * worldCenter.y;
  const determinant = a * d - b * c;

  return Object.freeze({
    orientation,
    rotation,
    rotationDegrees: Math.round(rotation * 180 / Math.PI),
    scale,
    a,
    b,
    c,
    d,
    e,
    f,
    inverse: Object.freeze({
      a: d / determinant,
      b: -b / determinant,
      c: -c / determinant,
      d: a / determinant,
      e: (c * f - d * e) / determinant,
      f: (b * e - a * f) / determinant
    }),
    worldBounds,
    viewport,
    tacticalRect,
    worldCenter: Object.freeze(worldCenter),
    screenCenter: Object.freeze(screenCenter),
    rotatedBounds: Object.freeze({ width: rotatedWidth, height: rotatedHeight })
  });
}

function transformPoint(matrix, point) {
  const x = finite(point?.x);
  const y = finite(point?.y);
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f
  };
}

export function createGravityFleetCamera(initial = {}) {
  let snapshot;

  function configure({
    worldBounds = snapshot?.worldBounds || initial.worldBounds,
    viewport = snapshot?.viewport || initial.viewport,
    tacticalRect = viewport,
    orientation = snapshot?.orientation || initial.orientation || CAMERA_ORIENTATIONS.desktop
  } = {}) {
    if (!Object.values(CAMERA_ORIENTATIONS).includes(orientation)) throw new RangeError(`Unsupported camera orientation: ${orientation}`);
    const normalizedWorld = normalizeRect(worldBounds);
    const normalizedViewport = normalizeRect(viewport, normalizedWorld);
    const normalizedTactical = normalizeRect(tacticalRect, normalizedViewport);
    const next = createSnapshot({ worldBounds: normalizedWorld, viewport: normalizedViewport, tacticalRect: normalizedTactical, orientation });
    const changed = !sameSnapshot(snapshot, next);
    snapshot = next;
    return changed;
  }

  function worldToScreen(point) {
    return transformPoint(snapshot, point);
  }

  function screenToWorld(point) {
    return transformPoint(snapshot.inverse, point);
  }

  function applyToContext(context) {
    context.setTransform(snapshot.a, snapshot.b, snapshot.c, snapshot.d, snapshot.e, snapshot.f);
  }

  function worldUnitsForScreenPixels(screenPixels) {
    return Math.max(0, finite(screenPixels)) / snapshot.scale;
  }

  function diagnostics() {
    return snapshot;
  }

  configure(initial);
  return Object.freeze({ configure, worldToScreen, screenToWorld, applyToContext, worldUnitsForScreenPixels, diagnostics });
}
