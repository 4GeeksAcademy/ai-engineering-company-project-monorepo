import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Reenvía /api a la API local (funciona también en Codespaces, sin CORS ni reenviar el 8000).
    proxy: { "/api": "http://localhost:8000" },
  },
});
