import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // Reenvía /api a la API local (services/api): sin CORS y válido también en Codespaces.
    proxy: { "/api": "http://localhost:8000" },
  },
});
