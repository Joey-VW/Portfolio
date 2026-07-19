import { SITE_CONFIG } from "./config.js";
import { initBackgroundVideo } from "./background-video.js";

initBackgroundVideo();

const yearTargets = document.querySelectorAll("[data-current-year]");
yearTargets.forEach((target) => {
  target.textContent = String(new Date().getFullYear());
});

const titleTargets = document.querySelectorAll("[data-site-title]");
titleTargets.forEach((target) => {
  target.textContent = SITE_CONFIG.site.shortTitle || SITE_CONFIG.site.title;
});

const taglineTargets = document.querySelectorAll("[data-site-tagline]");
taglineTargets.forEach((target) => {
  target.textContent = SITE_CONFIG.site.tagline;
});

const currentPath = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-links a:not(.portfolio-return)").forEach((link) => {
  const linkPath = link.getAttribute("href")?.split("/").pop() || "index.html";
  if (linkPath === currentPath || (currentPath === "" && linkPath === "index.html")) {
    link.setAttribute("aria-current", "page");
  }
});
