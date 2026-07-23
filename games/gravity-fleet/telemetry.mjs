const TEAM_KEYS = Object.freeze(["player", "enemy", "orange", "neutral"]);
const CONTEST_TEAM_KEYS = Object.freeze(["player", "enemy", "orange"]);
const TEAM_LABELS = Object.freeze({
  player: "Cyan",
  enemy: "Red",
  orange: "Orange",
  neutral: "Neutral"
});

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const array = value => Array.isArray(value) ? value : [];
const formatDuration = seconds => `${Math.floor(number(seconds) / 60)}:${String(Math.floor(number(seconds) % 60)).padStart(2, "0")}`;
const labelTeam = key => TEAM_LABELS[key] || String(key || "Neutral");
const labelPlanet = planetId => planetId === "star" ? "the central star" : String(planetId || "unknown body").toUpperCase();

function factionRecord(counts = {}, timeline = null) {
  const teams = counts.teams || {};
  return Object.fromEntries(TEAM_KEYS.map(key => {
    const team = teams[key] || {};
    return [key, {
      key,
      label: labelTeam(key),
      worlds: number(team.planets ?? timeline?.worlds?.[key]),
      ships: number(team.ships ?? timeline?.ships?.[key]),
      traveling: number(team.traveling)
    }];
  }));
}

function finalTimelineCounts(run) {
  const ships = array(run?.shipCountTimeline).at(-1) || {};
  const worlds = array(run?.ownershipTimeline).at(-1) || {};
  return { ships, worlds };
}

function playerPortalCount(run) {
  if (Number.isFinite(Number(run?.playerWormholesCreated))) return number(run.playerWormholesCreated);
  return Math.max(0, number(run?.wormholesCreated) - number(run?.aiWormholesCreated));
}

function aiPortalCount(run) {
  return number(run?.aiWormholesCreated);
}

function shipTransitCount(run) {
  return number(run?.shipTransits ?? run?.wormholeUses);
}

function largestTurningPoint(run) {
  const ships = array(run?.shipCountTimeline);
  const ownership = array(run?.ownershipTimeline);
  let largest = null;
  for (let index = 1; index < Math.min(ships.length, ownership.length); index++) {
    const previousFleetMargin = number(ships[index - 1].player) - Math.max(number(ships[index - 1].enemy), number(ships[index - 1].orange));
    const fleetMargin = number(ships[index].player) - Math.max(number(ships[index].enemy), number(ships[index].orange));
    const previousOwnershipMargin = number(ownership[index - 1].player) - number(ownership[index - 1].enemy) - number(ownership[index - 1].orange);
    const ownershipMargin = number(ownership[index].player) - number(ownership[index].enemy) - number(ownership[index].orange);
    const fleetDelta = fleetMargin - previousFleetMargin;
    const ownershipDelta = ownershipMargin - previousOwnershipMargin;
    const magnitude = Math.abs(fleetDelta) + Math.abs(ownershipDelta) * 12;
    if (!largest || magnitude > largest.magnitude) largest = { t: number(ships[index].t), fleetDelta, ownershipDelta, magnitude };
  }
  if (!largest?.magnitude) return "Turning point: the sampled fleet and system-control margins stayed nearly level throughout the run.";
  const ownershipNote = largest.ownershipDelta
    ? `; the control margin ${largest.ownershipDelta > 0 ? "improved" : "fell"} by ${Math.abs(largest.ownershipDelta)}`
    : "";
  return `Largest recorded swing: near ${formatDuration(largest.t)}, Cyan's fleet margin ${largest.fleetDelta >= 0 ? "improved" : "fell"} by ${Math.abs(largest.fleetDelta)} ships between telemetry samples${ownershipNote}.`;
}

function replaySuggestion(run) {
  const playerCaptures = array(run?.captures).filter(capture => capture.owner === "player");
  const capturedStar = playerCaptures.some(capture => capture.planet === "star");
  if (number(run?.levelId) === 2) {
    return shipTransitCount(run)
      ? "Run insight: the wormhole route produced ship transits. On replay, compare whether an earlier outer-route portal shortens the first Cyan capture."
      : "Run insight: no ship transits were recorded. Test one early outer-route wormhole and compare the opening capture time.";
  }
  if (number(run?.levelId) === 3) {
    return number(run?.shipsLost) > number(run?.shipsDestroyed)
      ? "Run insight: Cyan lost the fleet exchange. Consolidate the first two gains before committing across another long lane."
      : "Run insight: Cyan won the fleet exchange. Protect that advantage by staging the next push from two nearby worlds.";
  }
  return capturedStar
    ? "Run insight: Cyan captured the central star. Try a smaller follow-up wave and compare whether more ships survive."
    : "Run insight: Cyan never secured the central star. Capture a nearby neutral world first, then compare the timing of the star contest.";
}

function runInsights(run, turningPoint, runInsight) {
  const captures = array(run?.captures).filter(capture => capture.owner === "player").sort((a, b) => number(a.t) - number(b.t));
  const launches = array(run?.launchEventLog).filter(event => event.team === "player").sort((a, b) => number(a.t) - number(b.t));
  const firstCapture = captures[0];
  const firstLaunch = launches[0];
  const opening = firstCapture
    ? `Opening pace: Cyan's first capture was ${labelPlanet(firstCapture.planet)} at ${formatDuration(firstCapture.t)}, after ${launches.filter(event => number(event.t) <= number(firstCapture.t)).length} recorded launch actions.`
    : firstLaunch
      ? `Opening pace: the first Cyan launch was recorded at ${formatDuration(firstLaunch.t)}, but no Cyan capture followed before the match ended.`
      : "Opening pace: no Cyan launch or capture was recorded before the match ended.";
  const exchange = number(run?.shipsLost)
    ? `${number(run?.shipsDestroyed)} ships destroyed for ${number(run?.shipsLost)} lost (${(number(run?.shipsDestroyed) / number(run?.shipsLost)).toFixed(2)} exchange ratio)`
    : `${number(run?.shipsDestroyed)} ships destroyed with no Cyan losses recorded`;
  const captureSequence = captures.length
    ? `Capture sequence: ${captures.slice(0, 4).map(capture => `${labelPlanet(capture.planet)} at ${formatDuration(capture.t)}`).join(", ")}${captures.length > 4 ? `, plus ${captures.length - 4} later capture${captures.length - 4 === 1 ? "" : "s"}` : ""}.`
    : "Capture sequence: Cyan recorded no completed captures in this run.";
  const portals = `${playerPortalCount(run)} Cyan portal${playerPortalCount(run) === 1 ? "" : "s"}${aiPortalCount(run) ? ` and ${aiPortalCount(run)} AI portal${aiPortalCount(run) === 1 ? "" : "s"}` : ""}`;
  return [
    opening,
    `Fleet efficiency: ${exchange}, with an average Cyan launch of ${number(run?.averageLaunchSize)} ships.`,
    captureSequence,
    `Combat record: ${number(run?.deepSpaceCombats)} deep-space fights, ${number(run?.blasterHits)} blaster hits, and ${number(run?.enemyMajorLaunches)} major AI assaults; the final outcome was ${run?.outcome || "Unknown"}.`,
    `Wormhole telemetry: ${portals} deployed; ${shipTransitCount(run)} ship transit${shipTransitCount(run) === 1 ? "" : "s"} and ${number(run?.wormholePulls)} ship pulls were recorded.`,
    turningPoint,
    runInsight
  ];
}

function eventTimeline(run) {
  return [
    ...array(run?.captures).map(capture => ({
      t: number(capture.t),
      label: `${labelTeam(capture.owner)} capture`,
      detail: labelPlanet(capture.planet)
    })),
    ...array(run?.launchEventLog).filter(event => event.major || event.team === "player").map(event => ({
      t: number(event.t),
      label: `${labelTeam(event.team)} launch`,
      detail: `${number(event.ships)} ships${event.targetPlanetId ? ` to ${labelPlanet(event.targetPlanetId)}` : ""}`
    })),
    ...array(run?.wormholeEvents).map(event => ({
      t: number(event.t),
      label: `${labelTeam(event.owner)} portal deployed`,
      detail: "one-way wormhole stabilized"
    }))
  ].sort((a, b) => a.t - b.t);
}

function outcomeProjection(run) {
  if (!run) return null;
  const result = {
    outcome: run.outcome || "Unknown",
    score: number(run.score),
    durationSeconds: number(run.durationSeconds),
    durationLabel: formatDuration(run.durationSeconds),
    levelId: number(run.levelId),
    levelName: run.levelName || `Level ${number(run.levelId) || "?"}`
  };
  const highlights = [
    { key: "captures", label: "Planets captured", value: number(run.planetsCaptured) },
    { key: "destroyed", label: "Ships destroyed", value: number(run.shipsDestroyed) },
    { key: "largestLaunch", label: "Largest launch", value: number(run.largestLaunch) },
    { key: "transits", label: "Ship transits", value: shipTransitCount(run) },
    { key: "wormholes", label: "Cyan wormholes", value: playerPortalCount(run) },
    { key: "peakAdvantage", label: "Peak advantage", value: number(run.peakFleetAdvantage) }
  ];
  const allStatistics = [
    { label: "Level", value: result.levelName },
    { label: "Outcome", value: result.outcome },
    { label: "Final score", value: result.score },
    { label: "Duration", value: result.durationLabel },
    { label: "Planets captured", value: number(run.planetsCaptured) },
    { label: "Launch actions", value: number(run.launchEvents) },
    { label: "Largest launch", value: number(run.largestLaunch) },
    { label: "Average launch", value: number(run.averageLaunchSize) },
    { label: "Peak advantage", value: number(run.peakFleetAdvantage) },
    { label: "Ships launched", value: number(run.shipsLaunched) },
    { label: "Ships lost", value: number(run.shipsLost) },
    { label: "Ships destroyed", value: number(run.shipsDestroyed) },
    { label: "Deep-space fights", value: number(run.deepSpaceCombats) },
    { label: "Cyan portals", value: playerPortalCount(run) },
    { label: "AI portals", value: aiPortalCount(run) },
    { label: "Ship transits", value: shipTransitCount(run) },
    { label: "Wormhole pulls", value: number(run.wormholePulls) },
    { label: "Gravity captures", value: number(run.gravityCaptures) },
    { label: "Blaster hits", value: number(run.blasterHits) },
    { label: "Wall bounces", value: number(run.wallBounces) }
  ];
  const turningPoint = largestTurningPoint(run);
  const runInsight = replaySuggestion(run);
  return {
    result,
    highlights,
    allStatistics,
    turningPoint,
    runInsight,
    insights: runInsights(run, turningPoint, runInsight),
    events: eventTimeline(run)
  };
}

export function createTelemetryProjection({ state = null, counts = null, run = null, commandMode = "Launch" } = {}) {
  const source = run ? "saved-run" : "live";
  const timelineCounts = run ? finalTimelineCounts(run) : null;
  const factions = factionRecord(counts || {}, timelineCounts);
  const planets = Object.fromEntries(TEAM_KEYS.map(key => [key, factions[key].worlds]));
  const ships = Object.fromEntries(CONTEST_TEAM_KEYS.map(key => [key, factions[key].ships]));
  const controlledWorlds = CONTEST_TEAM_KEYS.reduce((sum, key) => sum + planets[key], 0);
  const starOwner = run
    ? array(run.ownershipTimeline).at(-1)?.starOwner || "neutral"
    : state?.planets?.find(planet => planet.isStar)?.owner || "neutral";
  const runSource = run || state?.completedRun || null;
  const outcome = outcomeProjection(runSource);
  const latestPlayerLaunch = [...array(runSource?.launchEventLog || state?.launchEvents)].reverse().find(event => event.team === "player");
  const latestEvent = run
    ? outcome?.events.at(-1) || null
    : state?.events?.[0] || null;
  const metrics = {
    largestLaunch: number(runSource?.largestLaunch ?? state?.largestLaunch),
    lastPlayerLaunch: number(latestPlayerLaunch?.ships),
    inFlight: run ? null : number(counts?.travelingShips),
    deepSpaceCombats: number(runSource?.deepSpaceCombats ?? state?.deepSpaceCombats),
    shipTransits: shipTransitCount(runSource || state),
    wormholesCreated: number(runSource?.wormholesCreated ?? state?.wormholesCreated),
    playerWormholesCreated: number(runSource?.playerWormholesCreated ?? state?.playerWormholesCreated),
    aiWormholesCreated: number(runSource?.aiWormholesCreated ?? state?.aiWormholesCreated),
    starOwner,
    starOwnerLabel: labelTeam(starOwner)
  };
  return Object.freeze({
    source,
    level: {
      id: number(runSource?.levelId ?? state?.levelId),
      name: runSource?.levelName || state?.levelName || "Gravity Fleet"
    },
    status: {
      running: Boolean(state?.running),
      paused: Boolean(state?.paused),
      ended: Boolean(run || state?.ended),
      commandMode,
      latestEvent
    },
    timer: {
      seconds: number(runSource?.durationSeconds ?? state?.elapsed),
      label: formatDuration(runSource?.durationSeconds ?? state?.elapsed)
    },
    factions,
    rivals: {
      worlds: factions.enemy.worlds + factions.orange.worlds,
      ships: factions.enemy.ships + factions.orange.ships
    },
    systemMix: {
      planets,
      ships,
      controlledWorlds,
      totalWorlds: TEAM_KEYS.reduce((sum, key) => sum + planets[key], 0),
      legend: CONTEST_TEAM_KEYS.map(key => ({
        key,
        label: labelTeam(key),
        worlds: planets[key],
        percent: controlledWorlds ? Math.round(planets[key] / controlledWorlds * 100) : 0
      }))
    },
    metrics,
    charts: {
      fleetStrength: array(runSource?.shipCountTimeline ?? state?.shipCountTimeline),
      systemControl: array(runSource?.ownershipTimeline ?? state?.ownershipTimeline),
      launches: array(runSource?.launchEventLog ?? state?.launchEvents)
    },
    outcome
  });
}

export function createTelemetryChartScheduler({
  render,
  shouldRun = () => true,
  intervalMs = 1000,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = timer => clearTimeout(timer)
} = {}) {
  if (typeof render !== "function") throw new TypeError("A chart render callback is required.");
  let active = false;
  let timer = null;
  let renders = 0;

  function stopTimer() {
    if (timer !== null) cancel(timer);
    timer = null;
  }

  function renderNow(reason) {
    renders++;
    render({ reason, renders });
  }

  function queue() {
    stopTimer();
    if (!active || !shouldRun()) return;
    timer = schedule(() => {
      timer = null;
      if (!active || !shouldRun()) return;
      renderNow("interval");
      queue();
    }, intervalMs);
  }

  return {
    open() {
      active = true;
      renderNow("open");
      queue();
    },
    close() {
      active = false;
      stopTimer();
    },
    sync({ renderImmediately = false } = {}) {
      stopTimer();
      if (!active || !shouldRun()) return;
      if (renderImmediately) renderNow("resume");
      queue();
    },
    final() {
      stopTimer();
      renderNow("final");
    },
    snapshot() {
      return Object.freeze({ active, scheduled: timer !== null, renders });
    }
  };
}
