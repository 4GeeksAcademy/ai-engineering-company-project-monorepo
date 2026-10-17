#!/usr/bin/env node
// Mide INP en laboratorio: ejecuta una serie fija de interacciones reales (clic, teclado) y calcula el INP con la
// API Event Timing, que es la técnica del observador de la skill core-web-vitals (references/INP.md).
// Lighthouse en modo navegación NO mide INP (no interactúa); esto lo complementa. No es un dato de campo (RUM).
//
// Uso: node scripts/inp-measure.mjs <website|backoffice> <urlBase> <etiqueta> [repeticiones=3] [outDir=docs/performance/lighthouse/inp]
// Requiere CHROME_PATH. Backoffice: LH_EMAIL y LH_PASSWORD (inicia sesión antes). CPU frenada x4 (como el perfil móvil
// de Lighthouse) para que las tareas largas se noten.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const [app, base, label, repsArg = "3", outDir = "docs/performance/lighthouse/inp"] = process.argv.slice(2);
if (!["website", "backoffice"].includes(app) || !base || !label) {
  console.error("Uso: node scripts/inp-measure.mjs <website|backoffice> <urlBase> <etiqueta> [repeticiones] [outDir]");
  process.exit(1);
}
const { CHROME_PATH, LH_EMAIL, LH_PASSWORD } = process.env;
const reps = Number(repsArg);
const CPU_SLOWDOWN = 4; // como el perfil móvil de Lighthouse
mkdirSync(outDir, { recursive: true });

// Registra cada interacción (eventos con interactionId) y su duración; INP = la peor (con < 50 interacciones, p98 = máx).
const OBSERVER = () => {
  window.__inp = new Map();
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.interactionId) continue;
      const prev = window.__inp.get(e.interactionId);
      if (!prev || e.duration > prev.duration) {
        window.__inp.set(e.interactionId, { type: e.name, duration: e.duration, input: e.processingStart - e.startTime, processing: e.processingEnd - e.processingStart, target: e.target?.nodeName });
      }
    }
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
};

const settle = (page) => page.waitForTimeout(350);
const click = async (page, locator) => {
  await locator.click();
  await settle(page);
};
const type = async (page, locator, text) => {
  await locator.click();
  await page.keyboard.type(text, { delay: 30 });
  await settle(page);
};

const scenarios = {
  // Móvil: menú, navegación a /talento, formulario con validación.
  website: async (ctx, slowDown) => {
    const page = await ctx.newPage();
    await page.goto(base + "/");
    await page.waitForLoadState("networkidle");
    await slowDown(page); // desde aquí cuentan las interacciones; la carga inicial, no
    const menu = page.getByRole("button", { name: "Abrir menú" });
    for (let i = 0; i < 4; i++) await click(page, menu); // abre y cierra el menú dos veces
    // (no se pulsa el enlace «Talento» del menú: en móvil el contenido de la home lo tapa; ver REPORT.md, hallazgos)
    await click(page, page.getByRole("link", { name: /Únete a nuestro banco de talento/ }));
    await page.locator("form").waitFor();
    await type(page, page.locator('input[type="text"]').first(), "Ana García López");
    await type(page, page.locator('input[type="email"]').first(), "ana@empresa.com");
    await click(page, page.getByRole("button", { name: /Enviar mi perfil/ })); // pinta todos los errores de validación
    await click(page, page.getByLabel("Inmediata"));
    await click(page, page.locator('input[type="checkbox"]'));
    return page;
  },
  // Escritorio: incidencias (formulario, orden, paginación, búsqueda) y proveedores (formulario).
  backoffice: async (ctx, slowDown) => {
    const page = await ctx.newPage();
    await page.goto(base + "/incidents");
    await page.waitForLoadState("networkidle");
    await page.getByText(/incidencias · página/).waitFor();
    await slowDown(page);
    await click(page, page.getByRole("button", { name: "Nueva incidencia" }));
    await click(page, page.getByRole("button", { name: "Cancelar" }));
    await click(page, page.getByRole("button", { name: "ID", exact: true }));
    await click(page, page.getByRole("button", { name: "Siguiente" }));
    await click(page, page.getByRole("button", { name: "Anterior" }));
    await type(page, page.getByRole("searchbox"), "vpn");
    await page.waitForTimeout(600); // el filtro espera 300 ms a que dejes de escribir
    // SPA: navegación dentro de la misma página (el observador conserva las interacciones)
    await click(page, page.getByRole("link", { name: "Proveedores" }));
    await page.getByText(/\d+ proveedores/).waitFor();
    await click(page, page.getByRole("button", { name: "Nuevo proveedor" }));
    await click(page, page.getByRole("button", { name: "Cancelar" }));
    return page;
  },
};

const runs = [];
const browser = await chromium.launch({ executablePath: CHROME_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
try {
  for (let i = 1; i <= reps; i++) {
    const ctx = await browser.newContext(
      app === "website" ? { viewport: { width: 412, height: 823 }, isMobile: false } : { viewport: { width: 1350, height: 940 } },
    );
    if (app === "backoffice") {
      const login = await ctx.newPage();
      await login.goto(base + "/login");
      await login.getByLabel("Email").fill(LH_EMAIL);
      await login.getByLabel("Contraseña").fill(LH_PASSWORD);
      await login.getByRole("button", { name: "Entrar" }).click();
      await login.waitForURL((u) => !u.pathname.startsWith("/login"));
      await login.close();
    }
    await ctx.addInitScript(OBSERVER);
    const slowDown = async (page) => {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
    };
    const page = await scenarios[app](ctx, slowDown);
    const list = await page.evaluate(() => [...window.__inp.values()].map((v) => ({ ...v, duration: Math.round(v.duration), input: Math.round(v.input), processing: Math.round(v.processing) })));
    const inp = list.length ? Math.max(...list.map((v) => v.duration)) : null;
    runs.push({ run: i, interactions: list.length, inp, worst: list.sort((a, b) => b.duration - a.duration).slice(0, 3) });
    await ctx.close();
  }
} finally {
  await browser.close();
}
const sorted = runs.map((r) => r.inp).sort((a, b) => a - b);
const result = { app, base, cpuSlowdown: CPU_SLOWDOWN, runs, medianInp: sorted[Math.floor(sorted.length / 2)] };
writeFileSync(join(outDir, `${label}.json`), JSON.stringify(result, null, 2));
console.log(label, "INP por ejecución:", runs.map((r) => `${r.inp} ms (${r.interactions} interacciones)`).join(" | "), "| mediana:", result.medianInp, "ms");
