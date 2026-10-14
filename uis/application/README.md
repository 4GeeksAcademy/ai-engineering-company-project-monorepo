# Brasaland · Application (Next.js)

Frontend for Brasaland Digital. Currently includes the **Supplier Directory** at `/suppliers`
(backed by `services/api` → `/api/suppliers`).

## Run

```bash
# 1. Backend (from repo root)
uv sync
uv run seed
uv run uvicorn services.api.main:app --reload --port 8000

# 2. Frontend
cd uis/application
cp .env.example .env.local   # API_URL=http://localhost:8000
npm install
npm run dev                  # http://localhost:3000/suppliers
```

Requests to `/api/*` are proxied to `API_URL` via Next.js rewrites, so no CORS setup is needed.
