import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  base: isTauri ? "/" : "/allthethings/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
