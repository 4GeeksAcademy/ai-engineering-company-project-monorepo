#!/usr/bin/env node
// Ejecuta Lighthouse N veces sobre una URL y guarda la ejecución mediana.
//
// Uso:  node scripts/lighthouse-audit.mjs <url> <etiqueta> [runs=3] [outDir=docs/performance/lighthouse]
//
// Requiere CHROME_PATH (Chrome/Chromium) y `lighthouse` en el PATH (o LIGHTHOUSE_BIN con su ruta).
// Variables opcionales:
//   LH_PRESET=desktop            usa el perfil de escritorio (por defecto: móvil, el más exigente)
//   LH_LOGIN_URL, LH_EMAIL, LH_PASSWORD
//                                para páginas protegidas: abre Chrome, inicia sesión en el formulario del
//                                backoffice y deja que Lighthouse audite con esa sesión (sin reiniciar el
//                                almacenamiento, que es donde vive el token).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [url, label, runsArg = "3", outDir = "docs/performance/lighthouse"] = process.argv.slice(2);
if (!url || !label) {
  console.error("Uso: node scripts/lighthouse-audit.mjs <url> <etiqueta> [runs] [outDir]");
  process.exit(1);
}
const runs = Number(runsArg);
const bin = process.env.LIGHTHOUSE_BIN ?? "lighthouse";
const { LH_PRESET, LH_LOGIN_URL, LH_EMAIL, LH_PASSWORD, CHROME_PATH } = process.env;
mkdirSync(outDir, { recursive: true });

const chromeFlags = "--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu";
const baseFlags = ["--only-categories=performance,accessibility,best-practices,seo", "--quiet"];
if (LH_PRESET === "desktop") baseFlags.push("--preset=desktop");

// Con sesión: un único Chrome con puerto de depuración, ya autenticado, reutilizado en todas las ejecuciones.
let context;
const flags = [...baseFlags];
if (LH_LOGIN_URL) {
  const { chromium } = await import("playwright");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const port = 9333;
  // launchPersistentContext (y no launch + newPage): así la sesión queda en el contexto POR DEFECTO de Chrome,
  // que es el que usa Lighthouse. Con newPage() el login vive en un contexto aislado y Lighthouse, sin token,
  // acaba midiendo la pantalla de login sin avisar.
  context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "lh-profile-")), {
    executablePath: CHROME_PATH,
    args: [`--remote-debugging-port=${port}`, "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await context.newPage();
  await page.goto(LH_LOGIN_URL);
  await page.getByLabel("Email").fill(LH_EMAIL);
  await page.getByLabel("Contraseña").fill(LH_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  flags.push(`--port=${port}`, "--disable-storage-reset");
} else {
  flags.push(`--chrome-flags=${chromeFlags}`);
}

// Asíncrono a propósito: con `spawnSync` el bucle de eventos de Node se bloquea, Playwright deja de leer la
// tubería de Chrome, esta se llena y la medición se queda colgada.
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Lighthouse terminó con código ${code}`))));
  });

const results = [];
try {
  for (let i = 1; i <= runs; i++) {
    const file = join(outDir, `${label}.run${i}.json`);
    await run([url, "--output=json", `--output-path=${file}`, ...flags]);
    results.push({ file, lhr: JSON.parse(readFileSync(file, "utf8")) });
  }
} finally {
  await context?.close();
}

// Salvaguarda: si pedimos una página protegida y Lighthouse acabó en /login, la sesión no llegó y la medición no vale.
if (LH_LOGIN_URL && !new URL(url).pathname.startsWith("/login")) {
  for (const { lhr } of results) {
    if (new URL(lhr.finalDisplayedUrl).pathname.startsWith("/login")) {
      console.error(`ERROR: Lighthouse acabó en ${lhr.finalDisplayedUrl}: la sesión no se conservó. Medición descartada.`);
      process.exit(2);
    }
  }
}

const score = (l, c) => Math.round(l.categories[c].score * 100);
const audit = (l, id) => l.audits[id]?.numericValue;
const summarize = ({ file, lhr }) => ({
  file,
  performance: score(lhr, "performance"),
  accessibility: score(lhr, "accessibility"),
  bestPractices: score(lhr, "best-practices"),
  seo: score(lhr, "seo"),
  fcpMs: Math.round(audit(lhr, "first-contentful-paint")),
  lcpMs: Math.round(audit(lhr, "largest-contentful-paint")),
  tbtMs: Math.round(audit(lhr, "total-blocking-time")),
  cls: Number(audit(lhr, "cumulative-layout-shift").toFixed(3)),
  speedIndexMs: Math.round(audit(lhr, "speed-index")),
  ttfbMs: Math.round(audit(lhr, "server-response-time") ?? 0),
  transferKB: Math.round((audit(lhr, "total-byte-weight") ?? 0) / 1024),
});

const summaries = results.map(summarize).sort((a, b) => a.performance - b.performance);
const median = summaries[Math.floor(summaries.length / 2)];
copyFileSync(median.file, join(outDir, `${label}.median.json`));
// Los JSON de las demás ejecuciones pesan ~0,5 MB cada uno: se conserva solo la mediana y el resumen.
for (const { file } of results) rmSync(file);
const kept = summaries.map(({ file, ...rest }) => rest);
const { file: _f, ...medianValues } = median;
writeFileSync(join(outDir, `${label}.summary.json`), JSON.stringify({ url, preset: LH_PRESET ?? "mobile", runs: kept, median: medianValues }, null, 2));
console.table(kept);
console.log("MEDIANA:", medianValues);
