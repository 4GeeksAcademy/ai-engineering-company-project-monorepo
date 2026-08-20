# Brasaland public website

Guest-facing site for the grilled-food chain (Colombia + Florida).

**Run:** from the repo root, `uv run uvicorn api.app:app --reload --host 127.0.0.1 --port 8000`

| Path | Page |
|------|------|
| `/` | Home |
| `/menu.html` | Menu and declared allergens |
| `/locations.html` | miami-downtown, bogota-norte, COL-01–COL-10 |
| `/loyalty.html` | Brasa Points |
| `/allergens.html` | Allergy protocol |

Staff tools remain at `/backoffice/`, `/knowledge/`, and `/incidents/`.

Content is limited to facts in `docs/company-knowledge-base/` and location IDs used by operations. No invented street addresses, hours, or currency conversions.
