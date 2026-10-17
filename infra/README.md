# TrackFlow Docker Containerization 🐳

> **Module:** Container Applications with Docker — 4Geeks Academy AI Engineering Career

## 📋 Overview

This folder contains the complete **Docker infrastructure** for the TrackFlow monorepo. All services are containerized and orchestrated via a single `docker-compose.yml` at the repository root.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                        │
│                      trackflow-net                          │
│                                                              │
│  ┌──────────────┐    ┌─────────────────┐                     │
│  │   postgres    │◄───│  inventory-api  │                     │
│  │  (PostgreSQL) │    │  (FastAPI/Python)│                    │
│  │    :5432      │    │    :8000         │                   │
│  └──────────────┘    └────────┬─────────┘                    │
│                               │                                │
│  ┌──────────────┐    ┌────────▼─────────┐    ┌──────────────┐ │
│  │  api-backend  │    │    website       │    │  backoffice   │ │
│  │ (FastAPI/Py)  │    │ (Next.js 16)    │    │ (Next.js 16)  │ │
│  │    :8000      │    │    :3000         │    │    :3002      │ │
│  └──────────────┘    └─────────────────┘    └──────────────┘ │
│         │                                                      │
│         └────────── INCIDENTS_API_INTERNAL_URL ──────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Services

| Service | Container Name | Technology | Internal Port | Published Port |
|---------|---------------|------------|---------------|----------------|
| `postgres` | `trackflow-postgres` | PostgreSQL 16 | 5432 | 5432 |
| `api-backend` | `trackflow-api-backend` | FastAPI (Python) | 8000 | 8001 |
| `inventory-api` | `trackflow-inventory-api` | FastAPI (Python) | 8000 | 8003 |
| `website` | `trackflow-website` | Next.js 16 | 3000 | 3000 |
| `backoffice` | `trackflow-backoffice` | Next.js 16 | 3002 | 3002 |

## 📦 Dockerfiles

Each service has its own `Dockerfile` and `.dockerignore`:

| Service | Dockerfile | .dockerignore |
|---------|-----------|--------------|
| API Backend | `services/api/Dockerfile` | `services/api/.dockerignore` |
| Inventory API | `services/inventory/Dockerfile` | `services/inventory/.dockerignore` |
| Website | `uis/website/Dockerfile` | `uis/website/.dockerignore` |
| Backoffice | `uis/backoffice/Dockerfile` | `uis/backoffice/.dockerignore` |

## ⚙️ Environment Files

Each service has a `.env.docker` reference file documenting the variables needed when running inside Docker:

| Service | File |
|---------|------|
| Root (DB password) | `.env.docker` |
| API Backend | `services/api/.env.docker` |
| Inventory API | `services/inventory/.env.docker` |
| Website | `uis/website/.env.docker` |
| Backoffice | `uis/backoffice/.env.docker` |

> **Important:** `.env` files are NOT copied into Docker images. All environment variables are injected via `docker-compose.yml` under the `environment:` key or via `--env-file` flag.

## 🎯 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (plugin v2)

### Start all services

```bash
# From the repository root
docker compose up -d
```

### Start specific services

```bash
# Only database + inventory API
docker compose up -d postgres inventory-api

# Only frontends (requires APIs already running)
docker compose up -d website backoffice
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f inventory-api
```

### Stop services

```bash
# Stop all
docker compose down

# Stop all and remove volumes (⚠️ destroys data)
docker compose down -v
```

## 🌐 URLs (after starting)

| Service | URL | Description |
|---------|-----|-------------|
| Website | http://localhost:3000 | Public product catalog |
| Backoffice | http://localhost:3002 | Internal admin panel |
| Auth API (docs) | http://localhost:8001/docs | Swagger UI — Auth + Incidents |
| Inventory API (docs) | http://localhost:8003/docs | Swagger UI — Inventory CRUD |

## 🔗 Network Details

All services communicate over the internal Docker bridge network `trackflow-net`:

- Services resolve each other by **container name** (e.g., `api-backend`, `postgres`)
- The inventory API connects to PostgreSQL via `postgres:5432`
- Backoffice server-side routes connect to API backend via `api-backend:8000`

### Client-side vs Server-side URLs

This is a critical distinction for Next.js applications:

| Type | Used by | Points to | Example |
|------|---------|-----------|---------|
| `NEXT_PUBLIC_*` | Browser (client JS) | Host ports (`localhost:XXXX`) | `http://localhost:8003` |
| `INCIDENTS_API_INTERNAL_URL` | Next.js server (API routes) | Docker service name | `http://api-backend:8000` |

## 🛠️ Development Mode

For development with hot-reload, you can run services natively (outside Docker)
while using Docker only for PostgreSQL:

```bash
# Start only PostgreSQL
docker compose up -d postgres

# Run the inventory API natively (from services/inventory/)
cd services/inventory
cp .env.example .env
# Set: DATABASE_URL=postgresql+asyncpg://app:devpassword@localhost:5432/inventory
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🏗️ Building Single Images

To build images individually (for debugging or deployment):

```bash
# API Backend
docker build -f services/api/Dockerfile -t trackflow-api-backend .

# Inventory API
docker build -f services/inventory/Dockerfile -t trackflow-inventory-api .

# Website
docker build -f uis/website/Dockerfile -t trackflow-website .

# Backoffice
docker build -f uis/backoffice/Dockerfile -t trackflow-backoffice .
```

> **Note:** The build context is the **repository root** (`.`), not the service folder. This is because the Next.js Dockerfiles need access to `package.json`, `packages/logic/`, etc.

## ✅ Project Requirements Checklist

Based on the "Container Applications with Docker" module (4Geeks Academy):

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Root `docker-compose.yml` orchestrating all services | ✅ |
| 2 | Dockerfiles for each service (Python + Node.js) | ✅ |
| 3 | `.dockerignore` files for efficient builds | ✅ |
| 4 | Multi-stage builds for Next.js apps | ✅ |
| 5 | Image size optimization (slim/alpine bases) | ✅ |
| 6 | Volume mounts for persistent data | ✅ |
| 7 | Health checks for database-dependent services | ✅ |
| 8 | Service dependency ordering (`depends_on`) | ✅ |
| 9 | Internal network for inter-service communication | ✅ |
| 10 | Exposed ports for host access | ✅ |
| 11 | Environment variable injection via compose | ✅ |
| 12 | Zero-dependency startup (Docker only) | ✅ |
| 13 | Documentation (this file) | ✅ |
| 14 | `.env.docker` reference files | ✅ |

### ✅ Telemetry Storage Project (Phase 3)

| # | Requirement | Status |
|---|------------|--------|
| 15 | `telemetry_events` table (8 cols, 3 indexes, write-only) | ✅ |
| 16 | Real `POST /telemetry/events` endpoint with bulk insert | ✅ |
| 17 | Response `{ received, stored, rejected }` | ✅ |
| 18 | Per-event validation (no 422 batch-level) | ✅ |
| 19 | `TelemetryEvent` model reused unchanged | ✅ |
| 20 | Zero frontend changes | ✅ |
| 21 | PostgreSQL connection via asyncpg | ✅ |
| 22 | Project documentation (`docs/telemetry/STORAGE_PROJECT.md`) | ✅ |

## 🔒 Security Notes

- No `.env` files are committed to the repository
- The `.env.docker` files are templates with dev defaults only
- PostgreSQL `DB_PASSWORD` defaults to `devpassword` — **change for production**
- All internal Docker traffic is unencrypted (SSL mode `disable`)
- For production, use Docker secrets or a proper secrets manager
