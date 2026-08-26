# Application UI (Next.js + TypeScript)

React / Next.js App Router app. The supplier directory lives at [`app/suppliers/`](app/suppliers/).

| Page | File | URL |
|------|------|-----|
| Supplier directory | `app/suppliers/page.tsx` | `/application/suppliers/` |

## Run

API first (`uvicorn api.app:app --reload`), then from this folder:

```bash
npm install
npm run dev
```

Dev UI: `http://127.0.0.1:3000/application/suppliers/` (set `NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000` if the browser is not same-origin with the API).

Static export for FastAPI:

```bash
npm run build
```

Then `http://127.0.0.1:8000/application/suppliers/` after uvicorn mounts `out/`.
