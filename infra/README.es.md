# Contenedorización Docker de TrackFlow 🐳

> **Módulo:** Container Applications with Docker — 4Geeks Academy AI Engineering Career

## 📋 Descripción

Esta carpeta contiene la **infraestructura Docker** completa para el monorepo TrackFlow.
Todos los servicios están contenerizados y orquestados mediante un único `docker-compose.yml`
en la raíz del repositorio.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Red Docker                             │
│                      trackflow-net                          │
│                                                              │
│  ┌──────────────┐    ┌─────────────────┐                     │
│  │   postgres    │◄───│  inventory-api  │                     │
│  │  (PostgreSQL) │    │  (FastAPI/Python)│                    │
│  │    :5432      │    │    :8000         │                    │
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

## 🚀 Servicios

| Servicio | Nombre del Contenedor | Tecnología | Puerto Interno | Puerto Publicado |
|----------|----------------------|------------|---------------|------------------|
| `postgres` | `trackflow-postgres` | PostgreSQL 16 | 5432 | 5432 |
| `api-backend` | `trackflow-api-backend` | FastAPI (Python) | 8000 | 8001 |
| `inventory-api` | `trackflow-inventory-api` | FastAPI (Python) | 8000 | 8003 |
| `website` | `trackflow-website` | Next.js 16 | 3000 | 3000 |
| `backoffice` | `trackflow-backoffice` | Next.js 16 | 3002 | 3002 |

## 📦 Dockerfiles

Cada servicio tiene su propio `Dockerfile` y `.dockerignore`:

| Servicio | Dockerfile | .dockerignore |
|----------|-----------|--------------|
| API Backend | `services/api/Dockerfile` | `services/api/.dockerignore` |
| Inventory API | `services/inventory/Dockerfile` | `services/inventory/.dockerignore` |
| Website | `uis/website/Dockerfile` | `uis/website/.dockerignore` |
| Backoffice | `uis/backoffice/Dockerfile` | `uis/backoffice/.dockerignore` |

## ⚙️ Archivos de Entorno

Cada servicio tiene un archivo `.env.docker` de referencia:

| Servicio | Archivo |
|----------|---------|
| Raíz (contraseña BD) | `.env.docker` |
| API Backend | `services/api/.env.docker` |
| Inventory API | `services/inventory/.env.docker` |
| Website | `uis/website/.env.docker` |
| Backoffice | `uis/backoffice/.env.docker` |

## 🎯 Inicio Rápido

### Requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (plugin v2)

### Iniciar todos los servicios

```bash
docker compose up -d
```

### Ver logs

```bash
docker compose logs -f
```

### Detener

```bash
docker compose down
```

## 🌐 URLs (después de iniciar)

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Website | http://localhost:3000 | Catálogo público de productos |
| Backoffice | http://localhost:3002 | Panel de administración |
| Auth API (docs) | http://localhost:8001/docs | Swagger UI — Auth + Incidencias |
| Inventory API (docs) | http://localhost:8003/docs | Swagger UI — CRUD Inventario |

## ✅ Checklist de Requisitos del Proyecto

Basado en el módulo "Container Applications with Docker" de 4Geeks Academy:

| # | Requisito | Estado |
|---|-----------|--------|
| 1 | `docker-compose.yml` raíz orquestando todos los servicios | ✅ |
| 2 | Dockerfiles para cada servicio (Python + Node.js) | ✅ |
| 3 | `.dockerignore` para builds eficientes | ✅ |
| 4 | Multi-stage builds para apps Next.js | ✅ |
| 5 | Optimización de tamaño (imágenes slim/alpine) | ✅ |
| 6 | Volúmenes para datos persistentes | ✅ |
| 7 | Health checks para servicios con dependencias de BD | ✅ |
| 8 | Orden de dependencias (`depends_on`) | ✅ |
| 9 | Red interna para comunicación entre servicios | ✅ |
| 10 | Puertos expuestos para acceso desde host | ✅ |
| 11 | Variables de entorno via docker-compose | ✅ |
| 12 | Arranque zero-dependency (solo Docker) | ✅ |
| 13 | Documentación (este archivo) | ✅ |
| 14 | Archivos `.env.docker` de referencia | ✅ |

### ✅ Proyecto Telemetría — Almacenamiento (Fase 3)

| # | Requisito | Estado |
|---|-----------|--------|
| 15 | Tabla `telemetry_events` (8 cols, 3 índices, write-only) | ✅ |
| 16 | Endpoint real `POST /telemetry/events` con bulk insert | ✅ |
| 17 | Response `{ received, stored, rejected }` | ✅ |
| 18 | Validación por evento (sin 422 batch-level) | ✅ |
| 19 | `TelemetryEvent` model reutilizado sin cambios | ✅ |
| 20 | Cero cambios en frontend | ✅ |
| 21 | Conexión PostgreSQL via asyncpg | ✅ |
| 22 | Documentación del proyecto (`docs/telemetry/STORAGE_PROJECT.md`) | ✅ |

## 🔒 Notas de Seguridad

- Los archivos `.env` no se suben al repositorio
- `.env.docker` son plantillas con valores por defecto para desarrollo
- Para producción, usar Docker secrets o un gestor de secretos
