import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` must match the GitHub Pages project path:
// https://databedatain.github.io/allthethings/
export default defineConfig({
  base: "/allthethings/",
  plugins: [react()],
});
