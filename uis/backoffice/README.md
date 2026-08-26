# Backoffice

Internal Brasaland admin UI, served by FastAPI at `/backoffice/`.

## Pages

| Page | Path |
|------|------|
| KPI dashboard + tickets | `/backoffice/` |
| **Supplier directory** | `/application/app/suppliers/` (redirect from `/backoffice/suppliers.html`) |
| Telemetry | `/backoffice/telemetry.html` |

Sign in with `mariana` / `brasaland` on the KPI dashboard (same JWT as tickets). The supplier page talks to public `GET`/`POST`/`PATCH /suppliers` and does not require that token. Records are not deleted; use **Inactivate**. Fields, categories, statuses, and seed data come from [`CONTEXT-company.md`](../../CONTEXT-company.md). Storage is [`data/suppliers.json`](../../data/suppliers.json).

Start the API from the repo root:

```bash
uvicorn api.app:app --reload
```

Then open `http://127.0.0.1:8000/application/app/suppliers/`.
