# `infra` folder

This folder contains **infrastructure configurations** for the monorepo (for example: Dockerfiles, Terraform scripts, deployment manifests, Nginx configs, etc.).

- **Main purpose**: to centralize the definition of the infrastructure required to run the company's applications and services.
- **Recommendation**: document how to provision and deploy the infrastructure.

> _Spanish version: [README.es.md](./README.es.md)._

## Docker

Run `docker compose up` from the repo root: it works with no configuration. Optionally `cp .env.example .env` (gitignored) to set `SECRET_KEY`, the initial admin (`AUTH_INITIAL_EMAIL` / `AUTH_INITIAL_PASSWORD`) and ports; without an initial admin nobody can log in.

| Service | Port | Notes |
| --- | --- | --- |
| `uis` | 3000 website (Vite), 3001 backoffice (Next.js) | one container, `uis/start.sh`, hot reload |
| `api` | 8000 | FastAPI, `uvicorn --reload` |

Both join the explicit `nexova-net` network; the backoffice reaches the API as `http://api:8000` (`API_PROXY_TARGET`).
Production uses the same compose file with the `.env` that lives on the VPS (never in Git).
