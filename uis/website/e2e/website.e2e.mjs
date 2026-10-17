// End-to-end check of the corporate site (needs Chromium: npx playwright install chromium; Playwright comes from the monorepo,
// installed by uis/backoffice). Navigation, per-route metadata, the shared contact data, the mobile menu and the talent form
// from start to finish (validation errors, then a valid submission). Written after refactoring App.tsx to prove nothing broke.
// Prerequisite: the site on :4173 (npm run build && npm run preview). Another URL: E2E_APP_URL. CHROME_PATH is optional.
// Run from uis/website:  npm run e2e
import { chromium } from "playwright";
const BASE = process.env.E2E_APP_URL ?? "http://127.0.0.1:4173";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));

await page.goto(BASE + "/");
ok((await page.locator("h1").first().innerText()).includes("Construimos equipos"), "home: muestra el h1");
ok(await page.locator('script[type="application/ld+json"]').count() === 1, "home: incluye el JSON-LD");
ok((await page.title()).startsWith("Nexova"), "home: título de la home");
ok((await page.locator("#servicios li").count()) === 6, "home: 6 puntos de servicios con su check");
ok((await page.locator("section ul li").filter({ hasText: "procesos exitosos" }).count()) >= 1, "home: lista «por qué Nexova»");
ok((await page.locator('a[href="mailto:contacto@nexova.com"]').count()) >= 1, "home: email de contacto enlazado");
ok((await page.locator('a[href="tel:+34960123456"]').count()) === 1 && (await page.locator('a[href="tel:+13055550191"]').count()) === 1, "home: los dos teléfonos enlazados");
ok((await page.locator("footer").innerText()).includes("+34 960 123 456") && (await page.locator("footer").innerText()).includes("+1 305 555 0191"), "pie: teléfonos y email desde los datos compartidos");

// navegación en cliente
await page.getByRole("navigation").getByRole("link", { name: "Talento" }).click();
await page.waitForURL("**/talento");
ok(page.url().endsWith("/talento"), "navegar a /talento desde el menú");
ok((await page.locator("h1").innerText()) === "Únete a nuestro banco de talento", "/talento: h1 correcto");
ok((await page.title()).startsWith("Únete a nuestro banco de talento"), "/talento: el título cambia con la ruta");
ok((await page.locator('link[rel="canonical"]').getAttribute("href")) === "https://nexova.com/talento", "/talento: canonical propio");

// formulario: enviar vacío -> errores, accesibles
await page.getByRole("button", { name: /Enviar mi perfil/ }).click();
const alerts = page.locator('[role="alert"]');
ok((await alerts.count()) === 9, `formulario vacío: 9 errores de validación (${await alerts.count()})`);
ok((await page.locator('input[type="text"]').first().getAttribute("aria-invalid")) === "true", "formulario: campo inválido marcado con aria-invalid");
ok(((await page.locator('input[type="text"]').first().getAttribute("aria-describedby")) ?? "").startsWith("error-"), "formulario: error enlazado con aria-describedby");

// datos inválidos concretos
await page.locator('input[type="text"]').first().fill("Ana");
await page.locator('input[type="email"]').fill("no-es-un-email");
await page.locator('input[type="tel"]').fill("612345678");
await page.getByRole("button", { name: /Enviar mi perfil/ }).click();
const text = await page.locator("form").innerText();
ok(text.includes("nombre y apellido"), "nombre sin apellido: error");
ok(text.includes("email válido"), "email inválido: error");
ok(text.includes("código de país"), "teléfono sin prefijo: error");

// camino feliz
await page.locator('input[type="text"]').first().fill("Ana García López");
await page.locator('input[type="email"]').fill("ana@empresa.com");
await page.locator('input[type="tel"]').fill("+34 612 345 678");
const selects = page.locator("select");
await selects.nth(0).selectOption("España");
await selects.nth(1).selectOption("Tecnología");
await selects.nth(2).selectOption("Avanzado");
await page.locator('input[type="number"]').fill("5");
await page.getByLabel("Inmediata").check();
await page.locator('input[type="checkbox"]').check();
await page.locator("textarea").fill("Hola");
await page.getByRole("button", { name: /Enviar mi perfil/ }).click();
await page.getByText("¡Gracias por tu interés en Nexova!").waitFor();
ok(true, "datos válidos: se muestra el mensaje de agradecimiento");

// volver a la home con el logo
await page.getByRole("link", { name: /nexova/ }).first().click();
await page.waitForURL(BASE + "/");
ok((await page.locator("h1").first().innerText()).includes("Construimos equipos"), "logo: vuelve a la home");

// botón atrás
await page.goBack();
ok((await page.locator("h1").innerText()) === "Únete a nuestro banco de talento", "botón atrás vuelve a /talento");

// móvil: menú
const m = await (await b.newContext({ viewport: { width: 412, height: 823 } })).newPage();
await m.goto(BASE + "/");
const btn = m.getByRole("button", { name: "Abrir menú" });
await btn.click();
ok((await btn.getAttribute("aria-expanded")) === "true", "móvil: el menú se abre (aria-expanded)");
await btn.click();
ok((await btn.getAttribute("aria-expanded")) === "false", "móvil: el menú se cierra");

ok(problems.length === 0, `sin errores de consola ni de página (${problems.length}${problems.length ? ": " + problems[0].slice(0, 120) : ""})`);
await b.close();
console.log(fails ? `\n${fails} FALLOS` : "\nALL OK");
process.exit(fails ? 1 : 0);
