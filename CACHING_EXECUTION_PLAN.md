# PLAN DE EJECUCIÓN — Optimización de rendimiento: Caching

> **Basado en:** [Enunciado 4Geeks](https://learn.4geeks.com/es/main-cohort/spain-aie-pt-1/syllabus/architecture-optimization/project/ai-eng-caching)  
> **Rama actual:** `cachear` (commit `dc47593`)  
> **Destino:** Pull Request a `main`  
> **Entregable:** `CACHING_REPORT.md`

---

## 📋 Auditoría de estado actual

### Backend — ✅ COMPLETO (commit `991a7e2`)

| Componente | Archivo | Estado |
|---|---|---|
| Middleware de timing | `services/api/main.py` | ✅ `time.perf_counter()` loguea ms por request |
| Módulo de caché en proceso con TTL | `services/api/core/cache.py` | ✅ `cache_get`, `cache_set`, `cache_invalidate_prefix` |
| `GET /suppliers/` con TTL 60s | `routes/suppliers.py` | ✅ Clave: `suppliers:list:country={c}:category={c}` |
| `GET /suppliers/{id}` con TTL 60s | `routes/suppliers.py` | ✅ Clave: `suppliers:{id}` |
| `GET /api/incidents/` con TTL 60s | `routes/incidents.py` | ✅ Clave: `incidents:list:status={s}:...` |
| `GET /api/incidents/summary` con TTL 30s | `routes/incidents.py` | ✅ Clave: `incidents:summary` |
| Invalidación en escrituras suppliers | `routes/suppliers.py` | ✅ `cache_invalidate_prefix("suppliers:")` en POST/PATCH/DELETE |
| Invalidación en escrituras incidents | `routes/incidents.py` | ✅ `cache_invalidate_prefix("incidents:")` en POST/PATCH |
| Seguridad (datos privados) | — | ✅ No se cachean datos por-usuario |

### Frontend — ❌ PENDIENTE

| Componente | Técnica | Estado |
|---|---|---|
| Lazy Loading en componentes | `next/dynamic` | ❌ No implementado |
| `useMemo` en cálculos pesados | `useMemo` | ❌ No implementado |

### Seed de datos — ❌ PENDIENTE

| Base de datos | Registros | Estado |
|---|---|---|
| `db.json` (suppliers) | Solo 15 semilla + usuarios | ❌ Necesita cientos/miles |
| `incidentes_db.json` | No existe | ❌ Crear y poblar |

### Informe — ❌ PENDIENTE

| Archivo | Estado |
|---|---|
| `CACHING_REPORT.md` | ❌ No existe |

---

## 🎯 Paso a paso (orden de ejecución)

### Paso 1 — Poblar base de datos con datos realistas

**Qué:** Ampliar `services/api/seed.py` para insertar **cientos de proveedores** y crear un **seeder de incidencias** con datos variados y coherentes (nombres, categorías, países, fechas, precios, estados variados).

**Por qué:** Con pocos registros la caché no se justifica. El instructor dice: *"Antes de fiarte del middleware, aumenta el volumen en las tablas que alimentan tus lecturas más pesadas"*.

**Criterio de éxito:**
- [ ] `db.json` → 500+ suppliers con datos realistas (no placeholders)
- [ ] `incidentes_db.json` → 500+ incidents con datos variados
- [ ] Los datos permiten que filtros, joins y ordenaciones cuesten trabajo de verdad

**Archivos a modificar/crear:** `services/api/seed.py`, `scripts/seed_incidents.py`

---

### Paso 2 — Lazy Loading en Frontend (next/dynamic)

**Qué:** Implementar `next/dynamic` en al menos **2 componentes** del backoffice.

**Candidatos seleccionados (con justificación):**

| # | Componente | Ruta | Justificación |
|---|---|---|---|
| 1 | `incident-summary.tsx` | `/incidents/summary` | Panel con gráficos de barras y procesamiento de datos. No está en la ruta principal ni en la carga inicial. Diferir su carga reduce el bundle inicial. |
| 2 | `incident-form.tsx` | `/incidents/new` | Formulario completo con validaciones, solo se monta cuando el usuario navega a crear una incidencia. No necesita cargarse en el bundle inicial. |

**Alternativa si no se usan esas:** `SmokeChecksPanel.tsx` (home) y `register-form.tsx` (registro).

**Archivos a modificar:**
- `uis/backoffice/app/incidents/summary/page.tsx` — import dinámico de `IncidentSummary`
- `uis/backoffice/app/incidents/new/page.tsx` — import dinámico de `IncidentForm`

**Patrón a usar:**
```tsx
import dynamic from "next/dynamic";

const IncidentSummary = dynamic(
  () => import("@/components/incident-summary"),
  { loading: () => <p className="text-slate-500">Cargando resumen...</p> }
);
```

**Criterio de éxito:**
- [ ] Al menos 2 componentes cargados con `next/dynamic`
- [ ] Justificación documentada en el informe
- [ ] Estado de carga visible (loading fallback)
- [ ] `npm run type-check` pasa sin errores

---

### Paso 3 — useMemo en Frontend

**Qué:** Identificar y aplicar `useMemo` a al menos **1 cálculo pesado** en el frontend.

**Candidato seleccionado:**

| Componente | Cálculo | Justificación |
|---|---|---|
| `incident-list.tsx` | Filtrado de incidencias en cliente (status, category, branch) | Cada vez que cambia un filtro se recalcula la lista filtrada. Si hay cientos de incidencias, el filtrado + ordenación es costoso. `useMemo` evita recalcular si no cambian las dependencias. |

**Archivo a modificar:**
- `uis/backoffice/components/incident-list.tsx` — envolver el filtrado en `useMemo`

**Patrón a usar:**
```tsx
const filteredIncidents = useMemo(
  () => {
    let result = incidents;
    if (filterStatus) result = result.filter(i => i.status === filterStatus);
    if (filterCategory) result = result.filter(i => i.category === filterCategory);
    if (filterBranch) result = result.filter(i => i.branch === filterBranch);
    return result;
  },
  [incidents, filterStatus, filterCategory, filterBranch],
);
```

**Criterio de éxito:**
- [ ] `useMemo` aplicado a cálculo no trivial
- [ ] Array de dependencias correcto y completo
- [ ] No se aplicó a cálculos triviales (concatenaciones, etc.)
- [ ] `npm run type-check` pasa sin errores

---

### Paso 4 — Medir y validar (Backend)

**Qué:** Ejecutar el backend con datos poblados y verificar:

1. **Primer GET** de un endpoint → lento (sin caché)
2. **Segundo GET** (misma URL) → rápido (cache hit)
3. **POST/PATCH** → invalida caché, siguiente GET devuelve datos frescos
4. **Swagger `/docs`** funciona con la caché activa

**Qué medir y documentar:**
```
GET /suppliers (500 filas) → sin caché: ~XXXms | con caché: ~Xms
GET /api/incidents/summary (500 incidents) → sin caché: ~XXXms | con caché: ~Xms
```

**Criterio de éxito:**
- [ ] Las mediciones antes/después muestran mejora significativa
- [ ] La invalidación funciona correctamente
- [ ] Los datos sensibles no se cachean

---

### Paso 5 — CACHING_REPORT.md (Informe técnico)

**Qué:** Crear `CACHING_REPORT.md` en la raíz del repo con TODAS las secciones requeridas.

**Estructura requerida por el instructor:**

```markdown
# Caching Report

## Decisiones en el Frontend

| Componente | Técnica | Justificación |
|---|---|---|
| incident-summary | next/dynamic | ... |
| incident-form | next/dynamic | ... |
| incident-list (filtrado) | useMemo | ... |

## Decisiones en el Backend

| Endpoint | Coste estimado | Frecuencia | TTL | Invalidación |
|---|---|---|---|---|
| GET /suppliers | ~XXXms (500 filas) | Alta | 60s | POST/PATCH/DELETE /suppliers |
| GET /suppliers/{id} | ~XXms | Alta | 60s | POST/PATCH/DELETE /suppliers |
| GET /api/incidents | ~XXXms (500 inc) | Alta | 60s | POST/PATCH /api/incidents |
| GET /api/incidents/summary | ~XXXms (500 inc) | Alta | 30s | POST/PATCH /api/incidents |

## Mediciones (antes / después)

| Endpoint | Filas | Antes (ms) | Después (ms) | Delta |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Tradeoffs reconocidos (frescura vs rendimiento)

- **TTL 60s en suppliers:** los datos de proveedores cambian poco (tarifas, estados). 60s de posible desactualización es aceptable para el panel de operaciones.
- **TTL 30s en summary:** las métricas agregadas toleran 30s de desfase para evitar picos de carga en la base de datos.

## Lo que NO se cacheó (y por qué)

- `GET /profiles/me` — datos por-usuario; clave compartida filtraría datos
- `GET /api/incidents/{id}` — cambia en cada update de estado; TTL confundiría la UX
- `POST /auth/login` — no tiene sentido cachear autenticación
```

**Criterio de éxito:**
- [ ] Todas las secciones presentes
- [ ] Decisiones específicas del monorepo (no genéricas)
- [ ] Al menos 1 tradeoff discutido explícitamente
- [ ] Al menos 1 endpoint/componente rechazado con justificación

---

### Paso 6 — Commit final y Pull Request

**Qué:**
1. Ejecutar `npm run type-check` → sin errores
2. Actualizar `memory-bank/progress.md`
3. Commits individuales con **Conventional Commits**
4. Abrir PR `cachear` → `main`

**Estructura de commits sugerida:**
```
feat: [Caching] poblar base de datos con datos realistas (500+ suppliers, 500+ incidents)
feat: [Caching] lazy loading con next/dynamic en incident-summary e incident-form
feat: [Caching] useMemo para filtrado de incidencias en incident-list
docs: [Caching] CACHING_REPORT.md con mediciones, tradeoffs y decisiones
```

---

## 📊 Resumen: Checklist contra requisitos del instructor

| # | Requisito 4Geeks | Estado | Paso |
|---|---|---|---|
| 1 | Middleware de timing | ✅ Hecho (991a7e2) | — |
| 2 | Módulo de caché con TTL | ✅ Hecho (991a7e2) | — |
| 3 | ≥2 endpoints cacheados con TTL | ✅ Hecho (4 endpoints) | — |
| 4 | Invalidación de caché en escrituras | ✅ Hecho | — |
| 5 | No datos privados en caché compartida | ✅ Hecho | — |
| 6 | **≥2 componentes con Lazy Loading** | ❌ Pendiente | **Paso 2** |
| 7 | **≥1 useMemo en cálculo no trivial** | ❌ Pendiente | **Paso 3** |
| 8 | **Poblar BD con datos realistas** | ❌ Pendiente | **Paso 1** |
| 9 | **CACHING_REPORT.md completo** | ❌ Pendiente | **Paso 5** |
| 10 | **Mediciones antes/después** | ❌ Pendiente | **Paso 4** |
| 11 | **Tradeoff frescura vs rendimiento** | ❌ Pendiente | **Paso 5** |
| 12 | **Lo que NO se cacheó (justificado)** | ❌ Pendiente | **Paso 5** |
| 13 | PR a main | ❌ Pendiente | **Paso 6** |

---

## ⚡ Orden de ejecución recomendado

```
Paso 1  →  Poblar BD (seed masivo)
Paso 2  →  Lazy Loading (next/dynamic) x2
Paso 3  →  useMemo en filtrado de incidencias
Paso 4  →  Medir y validar backend
Paso 5  →  CACHING_REPORT.md
Paso 6  →  Commit final + PR
```

> **Nota:** Los pasos 1-5 del plan original (backend caching) ya están completos en el commit `991a7e2`. Este plan se enfoca en lo que falta según el enunciado del instructor.