const DEFAULT_WINDOW = 240;

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

export function createPerformanceMonitor({ enabled = false, now = () => performance.now(), sampleWindow = DEFAULT_WINDOW } = {}) {
  if (!enabled) {
    const noop = () => 0;
    return { enabled: false, measure: (_name, work) => work(), recordFrame: noop, resetFrameTiming: noop, setGauge: noop, snapshot: () => null };
  }

  const timings = new Map();
  const gauges = new Map();
  const frames = [];
  let previousFrameAt = 0;
  let longFrames = 0;

  function push(name, value) {
    const samples = timings.get(name) || [];
    samples.push(value);
    if (samples.length > sampleWindow) samples.shift();
    timings.set(name, samples);
    return value;
  }

  function measure(name, work) {
    const startedAt = now();
    try { return work(); }
    finally { push(name, Math.max(0, now() - startedAt)); }
  }

  function recordFrame(timestamp = now()) {
    if (previousFrameAt) {
      const duration = Math.max(0, timestamp - previousFrameAt);
      frames.push(duration);
      if (frames.length > sampleWindow) frames.shift();
      if (duration > 50) longFrames++;
    }
    previousFrameAt = timestamp;
  }

  function resetFrameTiming() {
    previousFrameAt = 0;
  }

  function setGauge(name, value) {
    gauges.set(name, Number(value) || 0);
  }

  function snapshot() {
    const timingSummary = Object.fromEntries([...timings].map(([name, values]) => [name, {
      medianMs: Number(percentile(values, .5).toFixed(3)),
      p95Ms: Number(percentile(values, .95).toFixed(3)),
      samples: values.length
    }]));
    return {
      frames: {
        medianMs: Number(percentile(frames, .5).toFixed(3)),
        p95Ms: Number(percentile(frames, .95).toFixed(3)),
        over50Ms: frames.filter(value => value > 50).length,
        totalLongFrames: longFrames,
        samples: frames.length
      },
      timings: timingSummary,
      gauges: Object.fromEntries(gauges)
    };
  }

  return { enabled: true, measure, recordFrame, resetFrameTiming, setGauge, snapshot };
}
