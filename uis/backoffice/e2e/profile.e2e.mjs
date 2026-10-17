// End-to-end check of the profile page (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with an active user, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e:profile
// It edits that user's profile and puts the original values back at the end.
// Covers: protected route, data from GET /auth/me, PUT /profiles/me with the bearer token (only the changed
// fields, null to clear), client validation, 422 from the API and an expired session while saving.
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const URL = `${APP}/account/profile`;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const loginResponse = await fetch(`${API}/auth/login`, { method: "POST", body: new URLSearchParams({ username: EMAIL, password: PASSWORD }) });
if (!loginResponse.ok) {
  console.error(`API login failed (${loginResponse.status}): is the API running and the user active?`);
  process.exit(2);
}
const AUTH = { Authorization: `Bearer ${(await loginResponse.json()).access_token}` };
const apiMe = async () => (await fetch(`${API}/auth/me`, { headers: AUTH })).json();
const original = (await apiMe()).profile;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/401|422/.test(m.text()) && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const path = () => new globalThis.URL(page.url()).pathname;
const save = page.getByRole("button", { name: "Guardar cambios" });
const puts = [];
page.on("request", (r) => r.method() === "PUT" && r.url().endsWith("/profiles/me") && puts.push({ auth: r.headers()["authorization"], body: JSON.parse(r.postData()) }));
let meCalls = 0;
page.on("request", (r) => r.url().endsWith("/auth/me") && meCalls++);

try {
  // 0. vista protegida
  await page.goto(URL);
  await page.waitForURL("**/login**");
  ok(path() === "/login", "sin sesión, /account/profile redirige a /login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(URL);
  await page.getByLabel("Nombre").waitFor();
  ok(path() === "/account/profile", "tras el login vuelve a /account/profile");

  // 1. datos de GET /auth/me
  ok(meCalls >= 2, `la página pide GET /auth/me al abrirse (${meCalls} llamadas contando la sesión)`);
  ok((await page.getByLabel("Email").inputValue()) === EMAIL && (await page.getByLabel("Email").getAttribute("readonly")) !== null, "muestra el email del User, en solo lectura");
  ok((await page.getByLabel("Nombre").inputValue()) === original.name && (await page.getByLabel("Teléfono").inputValue()) === (original.phone ?? "") && (await page.getByLabel("Dirección").inputValue()) === (original.address ?? ""), "muestra name, phone y address del Profile");
  ok(await save.isDisabled(), "sin cambios, 'Guardar cambios' está desactivado");
  await page.getByRole("link", { name: "Mi perfil" }).waitFor();
  ok(true, "la barra lateral enlaza a Mi perfil");

  // 2. validación en cliente
  await page.getByLabel("Nombre").fill("   ");
  await page.getByLabel("Teléfono").fill("abc");
  await save.click();
  ok(/obligatorio/.test(await page.locator("#name-error").innerText()) && /teléfono no es válido/.test(await page.locator("#phone-error").innerText()) && puts.length === 0, "nombre vacío y teléfono inválido bloqueados sin llamar a la API");
  await page.getByRole("button", { name: "Descartar" }).click();
  ok((await page.getByLabel("Nombre").inputValue()) === original.name && (await page.locator("#name-error").count()) === 0, "Descartar restaura los valores guardados y limpia los errores");

  // 3. guardar: PUT /profiles/me con el token, solo lo que cambia
  await page.getByLabel("Nombre").fill("  Perfil E2E  ");
  await page.getByLabel("Teléfono").fill("+34 611 222 333");
  await page.getByLabel("Dirección").fill("Calle Falsa 123, Madrid");
  await save.click();
  await page.getByRole("status").waitFor();
  const token = await page.evaluate(() => localStorage.getItem("nexova.token"));
  ok(puts.length === 1 && puts[0].auth === `Bearer ${token}`, "PUT /profiles/me lleva Authorization: Bearer <token de la sesión>");
  ok(JSON.stringify(puts[0].body) === JSON.stringify({ name: "Perfil E2E", phone: "+34 611 222 333", address: "Calle Falsa 123, Madrid" }), `cuerpo con los campos recortados -> ${JSON.stringify(puts[0].body)}`);
  let me = await apiMe();
  ok(me.profile.name === "Perfil E2E" && me.profile.phone === "+34 611 222 333" && me.profile.address === "Calle Falsa 123, Madrid", "los cambios quedan guardados en la API");
  ok((await page.getByTestId("current-user").innerText()) === "Perfil E2E", "la barra lateral muestra el nombre nuevo sin recargar");
  ok(await save.isDisabled(), "tras guardar, el formulario vuelve a estar sin cambios");

  // 4. vaciar un campo opcional -> null; solo se envía ese campo
  await page.getByLabel("Teléfono").fill("");
  await save.click();
  await page.getByRole("status").waitFor();
  ok(JSON.stringify(puts[1].body) === JSON.stringify({ phone: null }), `vaciar el teléfono envía solo {"phone":null} -> ${JSON.stringify(puts[1].body)}`);
  me = await apiMe();
  ok(me.profile.phone === null && me.profile.address === "Calle Falsa 123, Madrid", "en la API el teléfono queda borrado y la dirección intacta");
  await page.reload();
  await page.getByLabel("Nombre").waitFor();
  ok((await page.getByLabel("Nombre").inputValue()) === "Perfil E2E" && (await page.getByLabel("Teléfono").inputValue()) === "", "al recargar, la página muestra lo guardado");

  // 5. la API rechaza con 422 (se fuerza una dirección demasiado larga en la petición)
  await page.route("**/profiles/me", async (route) =>
    route.continue({ postData: JSON.stringify({ ...JSON.parse(route.request().postData()), address: "x".repeat(201) }) }),
  );
  await page.getByLabel("Dirección").fill("Otra calle 1");
  await save.click();
  await page.locator("#address-error").waitFor();
  ok(/at most 200/.test(await page.locator("#address-error").innerText()) && (await page.getByLabel("Dirección").inputValue()) === "Otra calle 1", "422 de la API mostrado junto al campo, sin perder lo escrito");
  await page.unroute("**/profiles/me");

  // 6. sesión caducada al guardar -> 401 -> login
  await page.evaluate(() => localStorage.setItem("nexova.token", "token.caducado.invalido"));
  await save.click();
  await page.waitForURL("**/login**");
  ok((await page.evaluate(() => localStorage.getItem("nexova.token"))) === null, "token caducado al guardar: 401, se descarta el token y se pide login");
  ok((await apiMe()).profile.address === "Calle Falsa 123, Madrid", "con el 401 no se guarda nada");

  ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
} finally {
  // Deja el perfil como estaba.
  await fetch(`${API}/profiles/me`, {
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ name: original.name, phone: original.phone, address: original.address }),
  });
  await browser.close();
}
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
