export const FIXED_SIMULATION_STEP_SECONDS = 1 / 60;
export const MAX_FRAME_DELTA_SECONDS = .25;
export const MAX_CATCH_UP_STEPS = 8;

const BASE_PROFILES = Object.freeze({
  desktopHigh: Object.freeze({
    id: "desktop-high",
    renderIntervalMs: 0,
    endedRenderIntervalMs: 1000 / 12,
    hudIntervalMs: 100,
    telemetryIntervalMs: 200,
    tutorialIntervalMs: 1000 / 30,
    effectsEnabled: true,
    trailsEnabled: true,
    chartsDuringMatch: true,
    maxDevicePixelRatio: 2
  }),
  mobileBalanced: Object.freeze({
    id: "mobile-balanced",
    renderIntervalMs: 1000 / 30,
    endedRenderIntervalMs: 1000 / 12,
    hudIntervalMs: 250,
    telemetryIntervalMs: 1000,
    tutorialIntervalMs: 1000 / 20,
    effectsEnabled: false,
    trailsEnabled: false,
    chartsDuringMatch: false,
    maxDevicePixelRatio: 1.5
  })
});

export const PRESENTATION_PROFILES = BASE_PROFILES;

export function selectPresentationProfile({ mobile = false, reducedMotion = false } = {}) {
  const base = mobile ? BASE_PROFILES.mobileBalanced : BASE_PROFILES.desktopHigh;
  if (!reducedMotion) return base;
  return Object.freeze({
    ...base,
    id: `${base.id}-reduced-motion`,
    effectsEnabled: false,
    trailsEnabled: false,
    tutorialIntervalMs: 0
  });
}

export function createFixedStepRuntime({
  stepSeconds = FIXED_SIMULATION_STEP_SECONDS,
  maxFrameDeltaSeconds = MAX_FRAME_DELTA_SECONDS,
  maxCatchUpSteps = MAX_CATCH_UP_STEPS
} = {}) {
  if (!(stepSeconds > 0)) throw new RangeError("stepSeconds must be positive.");
  if (!(maxFrameDeltaSeconds > 0)) throw new RangeError("maxFrameDeltaSeconds must be positive.");
  if (!(maxCatchUpSteps > 0)) throw new RangeError("maxCatchUpSteps must be positive.");

  let lastTimestamp = null;
  let lastRenderTimestamp = null;
  let accumulatorSeconds = 0;
  let droppedSimulationSeconds = 0;
  let totalSimulationSteps = 0;

  function reset(timestamp = null, { resetRender = false } = {}) {
    lastTimestamp = Number.isFinite(timestamp) ? timestamp : null;
    accumulatorSeconds = 0;
    if (resetRender) lastRenderTimestamp = null;
  }

  function advance(timestamp, { running = true } = {}) {
    if (!Number.isFinite(timestamp)) throw new TypeError("A finite frame timestamp is required.");
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      return { steps: 0, alpha: 0, droppedSeconds: 0 };
    }

    const elapsedSeconds = Math.max(0, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    if (!running) {
      accumulatorSeconds = 0;
      return { steps: 0, alpha: 0, droppedSeconds: 0 };
    }

    accumulatorSeconds += Math.min(elapsedSeconds, maxFrameDeltaSeconds);
    const availableSteps = Math.floor((accumulatorSeconds + Number.EPSILON * 16) / stepSeconds);
    const steps = Math.min(availableSteps, maxCatchUpSteps);
    accumulatorSeconds -= steps * stepSeconds;
    totalSimulationSteps += steps;

    let droppedSeconds = 0;
    if (availableSteps > maxCatchUpSteps) {
      droppedSeconds = accumulatorSeconds - (accumulatorSeconds % stepSeconds);
      accumulatorSeconds %= stepSeconds;
      droppedSimulationSeconds += droppedSeconds;
    }

    return {
      steps,
      alpha: Math.max(0, Math.min(1, accumulatorSeconds / stepSeconds)),
      droppedSeconds
    };
  }

  function shouldRender(timestamp, intervalMs = 0, { force = false } = {}) {
    if (!Number.isFinite(timestamp)) return false;
    if (force || lastRenderTimestamp === null || intervalMs <= 0) {
      lastRenderTimestamp = timestamp;
      return true;
    }
    const elapsed = Math.max(0, timestamp - lastRenderTimestamp);
    if (elapsed + .01 < intervalMs) return false;
    lastRenderTimestamp = timestamp - (elapsed % intervalMs);
    return true;
  }

  function snapshot() {
    return {
      stepSeconds,
      maxFrameDeltaSeconds,
      maxCatchUpSteps,
      accumulatorSeconds,
      droppedSimulationSeconds,
      totalSimulationSteps
    };
  }

  return Object.freeze({ advance, reset, shouldRender, snapshot });
}
