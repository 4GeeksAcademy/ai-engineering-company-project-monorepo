import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Reenvía /api y /auth a la API local (funciona también en Codespaces, sin CORS ni reenviar el 8000).
    // /auth es el login; /suppliers, /users y /profiles son también rutas de la API, pero no se
    // reenvían para no chocar con las páginas del backoffice (p. ej. /suppliers).
    proxy: { "/api": "http://localhost:8000", "/auth": "http://localhost:8000" },
  },
});
