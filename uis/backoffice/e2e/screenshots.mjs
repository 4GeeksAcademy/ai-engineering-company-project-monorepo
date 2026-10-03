// Takes the three screenshots of the delivery (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with ONLY the CSV history loaded (services/api/.venv/bin/python scripts/seed_incidents.py --reset),
// an active user, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run screenshots
// Output: ../../docs/screenshots/incident-*.png (override with E2E_SCREENSHOTS_DIR)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const OUT = process.env.E2E_SCREENSHOTS_DIR ?? new URL("../../../docs/screenshots", import.meta.url).pathname;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

await page.goto(`${APP}/incidents`);
await page.waitForURL("**/login**");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("heading", { name: "Panel de incidencias", exact: true }).waitFor();
await page.locator("tbody tr").first().waitFor();
await page.waitForLoadState("networkidle");

// 1. summary panel with its metrics
const summary = page.locator("section[aria-label='Resumen de incidencias']");
await summary.locator("[data-summary-state='ready']").waitFor().catch(() => undefined);
await page.waitForFunction(() => document.querySelector("section[aria-label='Resumen de incidencias']")?.getAttribute("data-summary-state") === "ready");
await page.screenshot({ path: `${OUT}/incident-summary-panel.png`, clip: { x: 256, y: 0, width: 1244, height: 660 } });

// 2. the list with data loaded (filters + table)
await page.evaluate(() => document.querySelector("form[role=search]").scrollIntoView({ block: "start" }));
await page.evaluate(() => window.scrollBy(0, -16));
await page.screenshot({ path: `${OUT}/incident-panel-list.png`, fullPage: false });

// 3. the registration form with a validation error showing
await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Nueva incidencia" }).click();
await page.getByRole("heading", { name: "Registrar incidencia" }).waitFor();
await page.locator("#incident-title").fill("ab"); // too short: title, category and branch will show errors
await page.locator("#incident-origin").selectOption("branch"); // highlights the branch and leaves it empty
await page.locator("#incident-description").fill("La VPN de la oficina se cae cada diez minutos");
await page.getByRole("button", { name: "Registrar incidencia" }).click();
await page.locator("#incident-title-error").waitFor();
await page.screenshot({ path: `${OUT}/incident-form-validation-error.png`, fullPage: true });

await browser.close();
console.log(`Screenshots written to ${OUT}`);
