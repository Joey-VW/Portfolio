/**
 * Google Apps Script helper that emits a background-video manifest from Drive.
 *
 * Usage:
 * 1. Paste this file into a Google Apps Script project.
 * 2. Set FOLDER_ID to the public Drive folder that contains background videos.
 * 3. Run generateBackgroundVideoManifest() and copy the logged JSON into the
 *    configured manifest file or hosted manifest URL.
 *
 * Drive playback URLs are best-effort browser video sources. Use a CDN-backed
 * media host for more reliable production playback.
 */
const FOLDER_ID = "REPLACE_WITH_PORTFOLIO_DRIVE_FOLDER_ID";

function generateBackgroundVideoManifest() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  const items = [];

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    if (!mimeType || mimeType.indexOf("video/") !== 0) continue;

    const id = file.getId();
    items.push({
      id,
      name: file.getName(),
      mimeType,
      webViewUrl: file.getUrl(),
      thumbnailUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600",
      playbackUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id),
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    folderId: FOLDER_ID,
    note: "Drive playbackUrl values are best-effort. Use Cloudflare R2/CDN URLs if browser video playback is unreliable.",
    items,
  };

  Logger.log(JSON.stringify(manifest, null, 2));
  return manifest;
}
