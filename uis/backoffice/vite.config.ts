import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API = "http://localhost:8000";
// API calls only: a browser page load (Accept: text/html) still gets the SPA.
const apiCallsOnly = {
  target: API,
  bypass: (req: { headers: { accept?: string } }) => (req.headers.accept?.includes("text/html") ? "/index.html" : undefined),
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Reenvía /api y /auth a la API local (funciona también en Codespaces, sin CORS ni reenviar el 8000).
    // /auth es el login; /users (registro) y /profiles (mi perfil) se reenvían salvo las navegaciones del
    // navegador (Accept: text/html), que siguen sirviendo la SPA. /suppliers es también ruta de la API, pero
    // no se reenvía para no chocar con la página /suppliers del backoffice.
    proxy: { "/api": API, "/auth": API, "/users": apiCallsOnly, "/profiles": apiCallsOnly },
  },
});
