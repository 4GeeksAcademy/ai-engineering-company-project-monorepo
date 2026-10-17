import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

// The per-route metadata, so the prerender can write it into each page's <head> (see seo.ts).
export { ORIGIN, PAGES } from "./seo";

/** The HTML of the app for one route. Used at build time only (scripts/prerender.mjs). */
export function render(path: string) {
  return renderToString(
    <StrictMode>
      <App initialPath={path} />
    </StrictMode>,
  );
}
