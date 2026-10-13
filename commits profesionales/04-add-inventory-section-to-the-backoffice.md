Add the inventory section to the backoffice (Hito 5)

Operations staff could only reach the inventory API with a REST client.
Add four authenticated views to the existing Next.js backoffice, using the
Hito 5 CONTEXT vocabulary (activo, entrada de activos, salida de activos).

Views
- /inventory/products: every asset with current_stock, colour-coded and
  labelled (no stock, low, fine; thresholds documented in inventoryRules.ts),
  lowest stock first, with an "Entrada" and a "Salida" link per row that
  preselects the asset (?asset=<id>)
- /inventory/orders/inbound: delivery form; the asset is picked by name,
  the form is cleared with a confirmation after a send
- /inventory/orders/outbound: shows the asset's current_stock as soon as it
  is selected and follows the selection; warns while typing when the
  quantity is above it; shows the API's 400 next to the quantity field
- /inventory/orders: read-only history with asset name, quantity, type,
  date and the user_uuid (with the user's name from /users/directory)
- /inventory redirects to /inventory/products; all four sit behind the
  existing login guard

Integration
- Add lib/inventory.ts: every call to /inventory/* in one module on top of
  a new jsonRequest in api.ts (bearer token, 4xx/5xx thrown as ApiError with
  the message of the body); no component calls fetch
- Add lib/inventoryRules.ts: stock levels, form validation and the Spanish
  texts for the API's 400, 422 and 5xx answers
- Forward /api/inventory/* to NEXT_PUBLIC_INVENTORY_API_URL in
  next.config.mjs, so the browser stays on its own origin (no CORS); the
  prefix keeps the API routes apart from the pages of the same name

Verification
- Add 118 tests (client, rules, hooks and the four views); the suite is at 542
- Add e2e/inventory.e2e.mjs (read-only; the 400 is simulated in the browser)
  and run it, with the route-guard e2e, against the production build
- Check the views and the API through the rewrite against the live API
- Build for production and typecheck without errors
