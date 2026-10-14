# `infra` folder

This folder contains **infrastructure configurations** for the monorepo (for example: Dockerfiles, Terraform scripts, deployment manifests, Nginx configs, etc.).

- **Main purpose**: to centralize the definition of the infrastructure required to run the company's applications and services.
- **Recommendation**: document how to provision and deploy the infrastructure.

> _Spanish version: [README.es.md](./README.es.md)._

## Docker

`cp .env.example .env` (fill in the secrets; `.env` is gitignored) and run `docker compose up` from the repo root.

| Service | Port | Notes |
| --- | --- | --- |
| `uis` | 3000 website (Vite), 3001 backoffice (Next.js) | one container, `uis/start.sh`, hot reload |
| `api` | 8000 | FastAPI, `uvicorn --reload` |

Both join the explicit `nexova-net` network; the backoffice reaches the API as `http://api:8000` (`API_PROXY_TARGET`).
Production uses the same compose file with the `.env` that lives on the VPS (never in Git).
