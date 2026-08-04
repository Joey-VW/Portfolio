(() => {
  "use strict";

  window.setTimeout(() => {
    if (document.documentElement.dataset.gravityFleetModule === "ready") return;
    const canvas = document.querySelector("#gravityCanvas");
    const fallback = document.querySelector("#gameCanvasFallback");
    const setup = document.querySelector("#gameStartOverlay");
    if (!fallback) return;
    if (canvas) canvas.hidden = true;
    fallback.hidden = false;
    if (setup) setup.hidden = true;
    document.querySelector("#gameCanvasRetry")?.addEventListener("click", () => window.location.reload());
  }, 3000);
})();
