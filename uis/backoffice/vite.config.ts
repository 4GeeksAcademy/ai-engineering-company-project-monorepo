import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_API_PROXY ?? "http://127.0.0.1:8000";

// Internal app — separate from uis/website. Proxy API to FastAPI.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/locations": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/inventory": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/auth": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/users": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/profiles": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/reporting/weekly-location-performance": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/reporting/pipeline-runs": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/tasks": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/realtime": {
        target: apiTarget,
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
