(() => {
  "use strict";

  const canvas = document.querySelector("#gravityCanvas");
  const fallback = document.querySelector("#gameCanvasFallback");
  const setup = document.querySelector("#gameStartOverlay");
  const moduleScript = document.querySelector("#gravityFleetModuleScript")
    || document.querySelector('script[type="module"][src*="gravity-fleet-lab"]');
  let watchdogTimer = 0;

  function showFallback() {
    if (!fallback) return;
    if (canvas) canvas.hidden = true;
    fallback.hidden = false;
    if (setup) setup.hidden = true;
  }

  function handleReady(event) {
    window.clearTimeout(watchdogTimer);
    watchdogTimer = 0;
    if (event.detail?.simulatedCanvasFailure) return;
    if (fallback) fallback.hidden = true;
    if (canvas) canvas.hidden = false;
    if (setup && event.detail?.restoreSetup) setup.hidden = false;
  }

  moduleScript?.addEventListener("error", showFallback, { once: true });
  window.addEventListener("gravityfleet:ready", handleReady, { once: true });
  document.querySelector("#gameCanvasRetry")?.addEventListener("click", () => window.location.reload());

  watchdogTimer = window.setTimeout(() => {
    if (document.documentElement.dataset.gravityFleetModule === "ready") return;
    showFallback();
  }, 5000);
})();
