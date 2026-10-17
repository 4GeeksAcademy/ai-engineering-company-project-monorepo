#!/usr/bin/env node
// Convierte un informe JSON de Lighthouse en una captura PNG del informe (la parte superior: las cuatro
// puntuaciones y las métricas), para guardar la evidencia "antes / después" en el repositorio.
//
// Uso: node scripts/lighthouse-screenshot.mjs <informe.json> <salida.png>
// Requiere CHROME_PATH y LIGHTHOUSE_DIR (carpeta donde está instalado el paquete `lighthouse`).
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Uso: node scripts/lighthouse-screenshot.mjs <informe.json> <salida.png>");
  process.exit(1);
}
const { LIGHTHOUSE_DIR, CHROME_PATH } = process.env;
const generatorPath = join(LIGHTHOUSE_DIR, "node_modules/lighthouse/report/generator/report-generator.js");
const { ReportGenerator } = await import(pathToFileURL(generatorPath).href);

const lhr = JSON.parse(readFileSync(input, "utf8"));
const html = ReportGenerator.generateReportHtml(lhr);
const htmlFile = join(mkdtempSync(join(tmpdir(), "lh-report-")), "report.html");
writeFileSync(htmlFile, html);

const browser = await chromium.launch({ executablePath: CHROME_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlFile).href);
await page.waitForSelector(".lh-scores-header");
// Solo la cabecera del informe: puntuaciones + métricas, que es lo que se compara antes/después.
await page.screenshot({ path: resolve(output), clip: { x: 0, y: 0, width: 1200, height: 1100 } });
await browser.close();
console.log(`Captura guardada en ${output}`);
