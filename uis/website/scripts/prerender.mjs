// Prerender: writes the HTML of every route into dist/, so crawlers (and the first paint) get the content without
// running JavaScript. Run by `npm run build` after the client build and the server build:
//   vite build                                            -> dist/            (template + assets)
//   vite build --ssr src/entry-server.tsx --outDir dist-ssr -> dist-ssr/        (the `render` function)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "dist/index.html"), "utf8");
const { render, PAGES, ORIGIN } = await import(pathToFileURL(join(root, "dist-ssr/entry-server.js")).href);

// The page now carries its content, so the first paint only waits for the stylesheet. Inlining it (11 KB, 3.5 KB gzip)
// removes that request from the critical path.
function inlineCss(html) {
  return html.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/, (_tag, href) => {
    return `<style>${readFileSync(join(root, "dist", href), "utf8")}</style>`;
  });
}

const escapeAttr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function withMeta(html, route) {
  const page = PAGES[route];
  if (!page) throw new Error(`prerender: no metadata for ${route} in seo.ts`);
  return html
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(page.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${ORIGIN}${page.path}$2`);
}

for (const route of ["/", "/talento"]) {
  const body = render(route);
  const html = inlineCss(withMeta(template.replace('<div id="root"></div>', `<div id="root" data-route="${route}">${body}</div>`), route));
  if (html === template) throw new Error(`prerender: #root not found in dist/index.html (${route})`);
  const file = route === "/" ? join(root, "dist/index.html") : join(root, "dist", route.slice(1), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`prerendered ${route} -> ${file.replace(root + "/", "")} (${html.length} bytes)`);
}
