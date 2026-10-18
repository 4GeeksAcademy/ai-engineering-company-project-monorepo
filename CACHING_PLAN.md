# PLAN DE TRABAJO — Optimización de Caché (Frontend + Backend)

> **Rama:** `cachear` → destino `main`
> **Entregable principal:** `CACHING_REPORT.md` (informe final con mediciones y decisiones)
> **Contexto de referencia:** `context.md` (solución de referencia de caching)

---

## 0. Lectura obligatoria antes de empezar

Según `AGENTS.md`, el agente debe leer antes de ejecutar:

- `memory-bank/projectbrief.md`
- `memory-bank/techContext.md`
- `DESIGN.md`
- `packages/logic/src/trackflow/contracts.ts`
- `context.md` (referencia del ejercicio de caching)

> ⚠️ **Zonas protegidas (NO modificar sin confirmación):** `.github/`, `package.json` (raíz o paquetes), `tsconfig.json`, `DESIGN.md`, `uis/` (solo se permite tocar archivos concretos que se indican abajo), y `memory-bank/` (excepto actualizar progreso).

---

## 1. Objetivo

Implementar caché deliberada en dos capas:

1. **Frontend (Next.js):** `next/dynamic` (lazy loading) + `useMemo` (derivación de datos pesada).
2. **Backend (FastAPI):** caché en proceso con TTL e invalidación en al menos **dos endpoints** de escritura.

Y documentar todo en `CACHING_REPORT.md` con **mediciones reales** antes/después.

---

## 2. Flujo obligatorio antes de cada commit

Cada cambio DEBE pasar el flujo de 4 pasos de `AGENTS.md`:

1. `npm run type-check` (sin errores TS → continuar; con errores → corregir)
2. Verificar que el cambio respeta `DESIGN.md` (no duplicar lógica fuera de `packages/logic/`)
3. Actualizar `memory-bank/progress.md`
4. `npm run lint` (si está configurado) y commit con **Conventional Commits** (ej: `feat: [Caching] añadir middleware de timing`)

---

## 3. Paso 1 — Middleware de medición de tiempos (Backend)

**Archivo a modificar:** `services/api/main.py`

**Qué hacer:**
- Añadir un middleware HTTP que mida la duración de cada request en ms y la registre por consola.

**Código de referencia (adaptar al proyecto):**

```python
import time
import logging
from fastapi import Request

logger = logging.getLogger("api.timing")

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} | {duration:.1f}ms"
    )
    return response
```

**Salida esperada (ejemplo para citar en el informe):**

```text
GET /suppliers → 200 | 312.4ms
POST /suppliers → 201 | 48.2ms
GET /suppliers → 200 | 12.1ms   ← repeat hit; candidate confirmed
```

> **Nota:** registrar los tiempos ANTES de implementar la caché (medir primero, cachear después).

---

## 4. Paso 2 — Módulo de caché en proceso con TTL (Backend)

**Archivo a crear:** `services/api/core/cache.py` (crear directorio `core/` dentro de `services/api/`)

**Contenido mínimo:**

```python
# core/cache.py — Caché en memoria con TTL e invalidación por prefijo
import time
from typing import Any

_store: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    entry = _store.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    _store[key] = (time.time() + ttl_seconds, value)


def cache_invalidate_prefix(prefix: str) -> None:
    for key in list(_store):
        if key.startswith(prefix):
            del _store[key]
```

---

## 5. Paso 3 — Aplicar caché a endpoints de lectura (Backend)

Aplicar caché con TTL en **al menos** estos endpoints (son los más baratos de justificar):

### 5.1 `GET /suppliers/` — `services/api/routes/suppliers.py`

- Clave de caché: `suppliers:list` (o incluir filtros en la clave si se quiere granularidad: `suppliers:list:country={country}:category={category}`).
- TTL sugerido: **60 segundos**.
- Flujo: consultar `cache_get` → si hay hit, devolver; si no, leer TinyDB, `cache_set` y devolver.

### 5.2 `GET /suppliers/{supplier_id}` — `services/api/routes/suppliers.py`

- Clave de caché: `suppliers:{supplier_id}`.
- TTL sugerido: **60 segundos**.

### 5.3 `GET /api/incidents/summary` — `services/api/routes/incidents.py` ⭐

- **Mejor candidato:** hace agregaciones sobre TODAS las incidencias (suma/agrupa/ordena en memoria).
- Clave de caché: `incidents:summary`.
- TTL sugerido: **30 segundos**.

### 5.4 `GET /api/incidents/` — `services/api/routes/incidents.py`

- Clave de caché: `incidents:list` (incluir filtros y ordenación en la clave si se desea).
- TTL sugerido: **60 segundos**.

> **Importante:** las claves de caché con datos por-usuario NO deben ser globales (ver Paso 5 — seguridad).

---

## 6. Paso 4 — Invalidación de caché en escrituras (Backend)

Cuando se modifica un recurso, se debe invalidar el prefijo de caché relacionado.

### En `services/api/routes/suppliers.py`:

| Endpoint de escritura | Invalidación |
|---|---|
| `POST /suppliers/` | `cache_invalidate_prefix("suppliers:")` |
| `PATCH /suppliers/{id}/rate` | `cache_invalidate_prefix("suppliers:")` |
| `PATCH /suppliers/{id}/status` | `cache_invalidate_prefix("suppliers:")` |
| `DELETE /suppliers/{id}` | `cache_invalidate_prefix("suppliers:")` |

### En `services/api/routes/incidents.py`:

| Endpoint de escritura | Invalidación |
|---|---|
| `POST /api/incidents/` | `cache_invalidate_prefix("incidents:")` |
| `PATCH /api/incidents/{id}/status` | `cache_invalidate_prefix("incidents:")` |

> La invalidación por prefijo es la forma más segura de no dejar entradas obsoletas.

---

## 7. Paso 5 — Checklist de seguridad de caché

- [ ] No guardar datos de sesión/JWT/perfil bajo claves compartidas.
- [ ] TTL obligatorio en TODA entrada cacheada.
- [ ] Invalidación (o purga por prefijo) en TODA escritura que afecte a una lectura cacheada.
- [ ] Documentar **al menos un** endpoint/componente rechazado para caché con su motivo.

**Endpoints que NO se cachean (y por qué):**

| Endpoint | Motivo |
|---|---|
| `GET /profiles/me` | Datos por-usuario; clave compartida filtraría datos a otros usuarios |
| `POST /auth/login` | No tiene sentido cachear autenticación |
| `GET /api/incidents/{id}` (si se elige) | Cambia en cada update de estado; TTL confundiría la UX |

---

## 8. Paso 6 — Caché en Frontend (Next.js)

### 8.1 `useMemo` — memorizar cálculos pesados

Componentes a revisar (todos con filtrado/ordenado de listas en memoria):

- `uis/backoffice/components/incident-list.tsx` — filtros y orden de incidencias.
- `uis/backoffice/app/suppliers/components/SuppliersClient.tsx` — filtrado de proveedores (si se hace en cliente).
- `uis/backoffice/components/incident-summary.tsx` — derivación de métricas.

Patrón:

```tsx
import { useMemo } from "react";

const filtered = useMemo(
  () => items.filter(...).sort(...),
  [items, dependency1, dependency2],
);
```

> **No** memoizar concatenaciones de strings triviales ni one-liners.

### 8.2 `next/dynamic` — lazy loading de componentes pesados o poco usados

Candidatos (elegir y documentar al menos 2 distintos):

| Componente / Ruta | Justificación |
|---|---|
| `uis/backoffice/components/incident-summary.tsx` | No está en la ruta de primer render; agrega trabajo inicial |
| `uis/backoffice/components/incident-form.tsx` | Solo se monta cuando el usuario abre el formulario |
| `uis/backoffice/components/register-form.tsx` / `forgot-password-form.tsx` / `reset-password-form.tsx` | Flujos secundarios que reducen TTI de la home |
| `uis/backoffice/components/SmokeChecksPanel.tsx` | Panel pesado en la home del backoffice |

Patrón:

```tsx
import dynamic from "next/dynamic";

const ComponentePesado = dynamic(() => import("@/components/ComponentePesado"), {
  loading: () => <p>Cargando…</p>,
  ssr: false, // solo si es estrictamente cliente
});
```

> Respetar la zona protegida: **solo** se modifican los archivos de componentes listados arriba, no estructura general de `uis/`.

---

## 9. Paso 7 — Poblar la base de datos con datos realistas

La caché solo se justifica con volumen de datos. Con pocas filas, todo es rápido y no hay evidencia.

**Qué hacer:**
- Añadir **cientos/miles de registros realistas** a las tablas detrás de los endpoints cacheados:
  - `suppliers` (TinyDB `db.json`)
  - `incidents` (TinyDB `incidentes_db.json`)
- Reutilizar/extender el seeder existente `services/api/seed.py` (proveedores) y crear o ampliar un seeder de incidencias (puede inspirarse en `scripts/seed_incidents.py`).
- **Calidad:** datos variados y coherentes, NO placeholders duplicados.
- Registrar en el informe el **número de filas** y el **delta de latencia**.

**Ejemplo de evidencia esperada:**

```text
GET /suppliers (1000 filas) → 300ms
GET /suppliers (con caché) → 3ms
```

---

## 10. Paso 8 — Validación manual

- [ ] Primer GET de un endpoint caliente es más lento que el GET cacheado posterior.
- [ ] Hacer 2 GET seguidos: el segundo más rápido (logs del middleware de timing).
- [ ] Tras un POST/PATCH/DELETE del recurso, el siguiente GET refleja los datos nuevos (invalida caché).
- [ ] Swagger `/docs` funciona con la caché activa.

---

## 11. Paso 9 — Entregable `CACHING_REPORT.md`

Crear `CACHING_REPORT.md` en la **raíz del repo** con esta estructura:

```markdown
# Caching Report

## Frontend decisions

| Target              | Technique    | Justification                         |
| ------------------- | ------------ | ------------------------------------- |
| <componente>        | next/dynamic | <por qué>                             |
| <componente>        | useMemo      | <por qué>                             |

## Backend decisions

| Endpoint             | Coste est.   | Frecuencia | TTL | Invalidación             |
| -------------------- | ------------ | ---------- | --- | ------------------------ |
| GET /suppliers       | ~XXXms (N filas) | Alta  | 60s | POST/PATCH/DELETE /suppliers/* |
| GET /api/incidents/summary | ~XXXms (N filas) | Alta | 30s | POST/PATCH /api/incidents/* |

## Mediciones reales (antes / después)

| Endpoint | Filas | Antes (ms) | Después (ms) | Delta |
|----------|-------|-----------|--------------|-------|
| ...      | ...   | ...       | ...          | ...   |

## Tradeoffs reconocidos

- <TTL elegido>: datos potencialmente obsoletos X segundos, aceptable para consulta; para operaciones críticas se re-lee en vivo.

## Lo que NO se cacheó (y por qué)

- GET /profiles/me — por-usuario; clave compartida filtraría datos.
- <otro> — <motivo>.
```

> El informe debe nombrar **componentes y endpoints específicos de ESTE monorepo**, no placeholders genéricos.

---

## 12. Paso 10 — Commit final y Pull Request

1. Ejecutar el flujo de 4 pasos de `AGENTS.md` (type-check, arquitectura, memoria, lint).
2. Commits individuales por cada paso (Conventional Commits).
3. Abrir PR `feature/caching-optimisation` → `main` (o renombrar rama `cachear` a la convención si aplica) con el informe como descripción.

---

## 13. Orden de ejecución sugerido (resumen)

```
1. Leer docs obligatorios (sección 0)
2. Middleware de timing (sección 3)          → commit
3. core/cache.py (sección 4)                  → commit
4. Caché en GETs (sección 5)                  → commit
5. Invalidación en escrituras (sección 6)     → commit
6. Revisar seguridad (sección 7)
7. useMemo + next/dynamic (sección 8)         → commit(s)
8. Seed de datos realistas (sección 9)        → commit
9. Medir y validar (secciones 10 y 11)
10. CACHING_REPORT.md + PR (secciones 11 y 12)
```

---

## 14. Criterios de aceptación (Definition of Done)

- [ ] Middleware de timing implementado y logueando ms por request.
- [ ] Módulo de caché con TTL e invalidación por prefijo.
- [ ] Al menos 2 endpoints de lectura cacheados con TTL.
- [ ] Invalidación en TODAS las escrituras relacionadas.
- [ ] Ninguna clave de caché contiene datos por-usuario compartidos.
- [ ] Al menos 2 componentes/rutas del frontend con `next/dynamic`.
- [ ] Al menos 1 cálculo pesado del frontend con `useMemo`.
- [ ] Base de datos poblada con cientos/miles de filas realistas (registrar nº de filas).
- [ ] `CACHING_REPORT.md` creado con mediciones antes/después, tradeoffs y rechazados.
- [ ] `npm run type-check` pasa sin errores.
- [ ] `memory-bank/progress.md` actualizado.
- [ ] Commits con Conventional Commits y PR hacia `main`.
