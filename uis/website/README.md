# Brasaland public website

Guest-facing site for the grilled food chain (Colombia + Florida).

**Class URL:** https://rickycastro1940.github.io/ai-engineering-company-project-monorepo/

**Local demo (menu photos + staff tools):** from the repo root, `./scripts/start_presentation.sh`

**Public website (Codespaces-compatible):** from the repository root:

```bash
./scripts/serve-public-website.sh
```

or:

```bash
npx http-server . -p 3000 -a 0.0.0.0
```

Then open `http://127.0.0.1:3000/` (milestone landing) and `http://127.0.0.1:3000/application.html` (supplier application). Root `application.html` and `validation.js` are symlinks to this folder so GitHub Pages and the course serve command share one form.

**Public Codespaces URL (external audit):** open this repo in GitHub Codespaces. Port **3000** is declared public in `.devcontainer/devcontainer.json`. After the server starts, set Port 3000 visibility to **Public** in the Ports panel (or `gh codespace ports visibility 3000:public`). The audit URLs are:

- `https://<CODESPACE_NAME>-3000.app.github.dev/`
- `https://<CODESPACE_NAME>-3000.app.github.dev/application.html`

schema.org JSON-LD (`Organization`, `WebSite`, `Menu`, and `Restaurant` / `LocalBusiness` / `FoodEstablishment` branches) is in each guest HTML file. It uses published facts only (no street addresses, phone numbers, or hours).

The full guest site (menu, locations, Brasa Points) remains here. GitHub Pages still deploys this folder. You can also run `npx http-server uis/website -p 3000 -a 0.0.0.0` to serve only these files.

**Run API only:** `uv run uvicorn api.app:app --reload --host 127.0.0.1 --port 8000`

| Path | Page |
|------|------|
| `/` | Home |
| `/menu.html` | Menu and declared allergens |
| `/locations.html` | miami-downtown, bogota-norte, COL-01–COL-10 |
| `/loyalty.html` | Brasa Points |
| `/allergens.html` | Allergy protocol |
| `/application.html` | Supplier directory application (`name`, `country`, `product_categories`, `emergency_surcharge_pct`, `status`) |

Staff tools remain at `/backoffice/`, `/knowledge/`, and `/incidents/`.

Content is limited to facts in `docs/company-knowledge-base/` and location IDs used by operations. No invented street addresses, hours, or currency conversions.
