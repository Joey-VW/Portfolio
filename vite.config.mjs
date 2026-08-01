import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const htmlEntries = Object.fromEntries(
  execFileSync("git", ["ls-files", "--", "*.html"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => [file.replace(/\.html$/, ""), resolve(file)]),
);

export default defineConfig({
  appType: "mpa",
  base: "/",
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: htmlEntries,
    },
  },
});
