#!/usr/bin/env node
// Initial JavaScript of each prerendered backoffice route: the <script src> chunks its HTML asks for on load,
// summed raw and gzipped. Run `npm run build:backoffice` first.
//   node scripts/bundle-size.mjs [route ...]      (default: the routes of the caching report)
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "uis", "backoffice", ".next");
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/incidents", "/incidents/analysis", "/inventory/products", "/suppliers"];

for (const route of routes) {
  const html = join(dist, "server", "app", `${route.replace(/^\//, "")}.html`);
  if (!existsSync(html)) {
    console.log(`${route}: no prerendered HTML (${html})`);
    continue;
  }
  const chunks = new Set([...readFileSync(html, "utf8").matchAll(/<script[^>]+src="\/_next\/([^"]+\.js)"/g)].map((m) => m[1]));
  let raw = 0;
  let gz = 0;
  for (const chunk of chunks) {
    const file = readFileSync(join(dist, chunk));
    raw += file.length;
    gz += gzipSync(file).length;
  }
  console.log(`${route.padEnd(24)} ${String(chunks.size).padStart(3)} chunks  ${(raw / 1024).toFixed(1).padStart(8)} KB raw  ${(gz / 1024).toFixed(1).padStart(7)} KB gzip`);
}
