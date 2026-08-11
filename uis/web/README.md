# HealthCore Web UI — Incident Analysis (`uis/web`)

Internal control panel for uploading an incident CSV, viewing the analysis summary, and downloading `results.csv`.

Requires the API at `http://127.0.0.1:8000` (`services/api`).

## Run

Serve this folder with any static file server, for example from the repository root:

```bash
npx http-server uis/web -p 3000 -a 127.0.0.1 -c-1
```

Open `http://127.0.0.1:3000/`.
