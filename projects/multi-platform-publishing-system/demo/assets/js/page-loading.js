const DEFAULT_TIMEOUT = 2800;
const DEFAULT_MAX_IMAGES = 8;

function settleImage(img) {
  if (!img || img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  });
}

export function setPageLoading(container, isLoading) {
  if (!container) return;
  container.classList.toggle("is-loading", isLoading);
  container.classList.toggle("is-loaded", !isLoading);
  if (!isLoading) {
    container.parentElement?.querySelectorAll(".atlas-page-loader").forEach((element) => element.remove());
  }
  container.setAttribute("aria-busy", isLoading ? "true" : "false");
}

export async function waitForInitialImages(container, { timeout = DEFAULT_TIMEOUT, maxImages = DEFAULT_MAX_IMAGES } = {}) {
  if (!container) return;
  const images = Array.from(container.querySelectorAll("img"))
    .filter((img) => img.currentSrc || img.src)
    .slice(0, maxImages);

  if (!images.length) return;

  await Promise.race([
    Promise.allSettled(images.map(settleImage)),
    new Promise((resolve) => window.setTimeout(resolve, timeout)),
  ]);
}
