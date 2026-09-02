import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Build profile for the Apps Script deploy.
 *
 * Apps Script serves one HTML file per `HtmlService.createHtmlOutputFromFile`
 * — there is no asset server to fetch a /assets/index-abc.js from. So this
 * profile emits a single JS chunk and a single stylesheet with every asset
 * inlined, and scripts/build-apps-script.mjs folds those into one
 * self-contained apps-script/Index.html to paste into the editor.
 *
 * The GitHub Pages build is unaffected — it still uses vite.config.js. */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-apps-script",
    emptyOutDir: true,
    cssCodeSplit: false,
    // No second request is possible, so everything has to travel in the file.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/app.[ext]",
      },
    },
  },
});
