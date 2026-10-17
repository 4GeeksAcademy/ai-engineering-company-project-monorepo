import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { currentPath } from "./router";
import "./index.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The build ships each page with its HTML already in #root (prerender), marked with the route it belongs to. Attach
// to it only when it is the page the URL asks for. If a server answers with another page's HTML (for example the
// home for /talento, when it does not serve directory indexes), hydrating would mismatch: paint from scratch instead,
// which is what the app did before the prerender. In `vite dev` the root is empty and takes the same path.
if (root.dataset.route === currentPath()) hydrateRoot(root, app);
else createRoot(root).render(app);
