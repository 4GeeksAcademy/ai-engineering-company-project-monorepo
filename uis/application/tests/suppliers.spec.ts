import { expect, test } from "@playwright/test";

const baseURL = process.env.UI_URL ?? "http://127.0.0.1:3000";

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 320, height: 740 },
]) {
  test.describe(viewport.name, () => {
    test.use({ baseURL, viewport });

    test("supplier directory workflows", async ({ page }) => {
      test.setTimeout(60000);
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      let createdId: number | undefined;
      const name = `Proveedor E2E ${viewport.name}`;

      try {
        await page.goto("/");
        await expect(page).toHaveURL(/\/suppliers$/);
        await expect(page.locator("article")).toHaveCount(15);
        await expect(page.getByText("15 proveedores · 13 activos · 2 suspendidos")).toBeVisible();
        await expect(page.getByText("Mostrando 15 de 15")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/brasaland-suppliers-${viewport.name}.png`, fullPage: true });

        const filters = page.getByRole("region", { name: "Filtros" });
        await filters.getByRole("combobox", { name: "País", exact: true }).selectOption("USA");
        await expect(page.locator("article")).toHaveCount(6);
        await filters.getByRole("combobox", { name: "Categoría", exact: true }).selectOption("carne");
        await expect(page.locator("article")).toHaveCount(1);
        await expect(page.getByRole("heading", { name: "Miami Meat Distributors LLC" })).toBeVisible();
        await filters.getByRole("combobox", { name: "Estado", exact: true }).selectOption("suspended");
        await expect(page.locator("article")).toHaveCount(0);
        await expect(page.getByText("No hay proveedores que coincidan con los filtros.")).toBeVisible();
        await page.getByRole("button", { name: "Limpiar filtros" }).click();
        await expect(page.locator("article")).toHaveCount(15);

        await page.getByRole("button", { name: "+ Nuevo proveedor" }).click();
        const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Registrar proveedor" }) });
        await form.getByLabel("Nombre comercial *", { exact: true }).fill(name);
        await form.getByRole("combobox", { name: "País *", exact: true }).selectOption("USA");
        await expect(form.getByLabel("Moneda", { exact: true })).toHaveValue("USD");
        await form.getByLabel("Tarifa por unidad (USD) *", { exact: true }).fill("6.25");
        await form.getByRole("button", { name: "Registrar proveedor", exact: true }).click();
        await expect(form.getByText("Selecciona al menos una categoría.")).toBeVisible();
        await form.getByRole("checkbox", { name: "Carne", exact: true }).check();
        await form.getByRole("checkbox", { name: "Bebidas", exact: true }).check();
        await form.getByLabel("Email de contacto", { exact: true }).fill("e2e@example.com");
        await form.getByLabel("Notas internas", { exact: true }).fill("Browser test supplier");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        const creation = page.waitForResponse((response) => response.url().endsWith("/api/suppliers") && response.request().method() === "POST");
        await form.getByRole("button", { name: "Registrar proveedor", exact: true }).click();
        const createdResponse = await creation;
        expect(createdResponse.status()).toBe(201);
        const created = await createdResponse.json();
        createdId = created.id;
        expect(created.categories).toEqual(["carne", "bebidas"]);
        await expect(page.locator("article")).toHaveCount(16);
        const card = page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
        await expect(card.getByText("Activo", { exact: true })).toBeVisible();

        await card.getByRole("button", { name: "Actualizar tarifa" }).click();
        await card.getByLabel("Nueva tarifa en USD").fill("0");
        await card.getByRole("button", { name: "Guardar", exact: true }).click();
        await expect(card.getByText("La tarifa debe ser mayor que cero.")).toBeVisible();
        await card.getByLabel("Nueva tarifa en USD").fill("7.5");
        const rateChange = page.waitForResponse((response) => response.url().endsWith(`/api/suppliers/${createdId}/rate`) && response.request().method() === "PATCH");
        await card.getByRole("button", { name: "Guardar", exact: true }).click();
        const rateResponse = await rateChange;
        expect(rateResponse.status()).toBe(200);
        const updated = await rateResponse.json();
        expect(updated.rate_per_unit).toBe(7.5);
        expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(created.updated_at).getTime());
        await expect(card.getByText("$7.50", { exact: false })).toBeVisible();

        const suspension = page.waitForResponse((response) => response.url().endsWith(`/api/suppliers/${createdId}/status`) && response.request().method() === "PATCH");
        await card.getByRole("button", { name: "Suspender", exact: true }).click();
        const suspendedResponse = await suspension;
        expect(suspendedResponse.status()).toBe(200);
        expect((await suspendedResponse.json()).updated_at).toBe(updated.updated_at);
        await expect(card.getByText("Suspendido", { exact: true })).toBeVisible();
        await card.getByRole("button", { name: "Activar", exact: true }).click();
        await expect(card.getByText("Activo", { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.locator("article")).toHaveCount(16);
        await expect(card.getByText("$7.50", { exact: false })).toBeVisible();
        await expect(card.getByText("Activo", { exact: true })).toBeVisible();
        expect(browserErrors).toEqual([]);
      } finally {
        if (createdId !== undefined) {
          const cleanup = await page.request.delete(`/api/suppliers/${createdId}`);
          expect(cleanup.status()).toBe(204);
        }
      }
    });
  });
}