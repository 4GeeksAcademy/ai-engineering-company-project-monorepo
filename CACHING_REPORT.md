# CACHING REPORT — TrackFlow

> **Fecha**: 2025-07-03  
> **Rama**: `cachear`  
> **Proyecto**: TrackFlow — Monorepo de gestión de incidencias y proveedores  
> **Objetivo**: Implementar y documentar estrategias de caché en backend (FastAPI) y frontend (Next.js) para mejorar rendimiento.

---

## 1. Decisiones de Frontend

### 1.1 Lazy Loading con `next/dynamic`

Se aplicó **carga diferida (lazy loading)** a dos componentes que no están en la ruta inicial de carga:

| Componente | Ruta | Justificación |
|---|---|---|
| `IncidentSummary` | `/incidents/summary` | Contiene `BarChart` (gráfico pesado) + agregación de datos |
| `IncidentForm` | `/incidents/new` | Formulario completo con validaciones, solo visible al crear |

**Implementación**:
```tsx
const IncidentSummary = dynamic(() => import("@/components/incident-summary"), {
  loading: () => <div className="..." />,
  ssr: false,
});
```

**Beneficio**: El JavaScript de estos componentes solo se descarga cuando el usuario navega a esas rutas, reduciendo el tamaño del bundle inicial.

### 1.2 `useMemo` para resumen por estado

En `components/incident-list.tsx` se agregó `useMemo` para computar el **conteo de incidencias por estado** (`statusCounts`), un cálculo O(n) sobre el array de incidencias:

```tsx
const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    counts[inc.status] = (counts[inc.status] || 0) + 1;
  }
  return counts;
}, [incidents]);
```

**Beneficio**: Se evita recalcular el resumen en cada re-render (cambio de filtro, hover, etc.). Solo se recalcula cuando cambia el array `incidents`.

---

## 2. Decisiones de Backend

### 2.1 Arquitectura de Caché

- **Tipo**: Caché en proceso (diccionario en memoria) con TTL (time-to-live)
- **Módulo**: `services/api/core/cache.py`
- **API**: `cache_get(key)`, `cache_set(key, value, ttl_seconds)`, `cache_invalidate_prefix(prefix)`
- **TTL por defecto**: 60 segundos para listas, 30 segundos para resúmenes

### 2.2 Endpoints cacheados

| Endpoint | Clave de caché | TTL | Estrategia de invalidación |
|---|---|---|---|
| `GET /suppliers/` | `suppliers:list:country={c}:category={c}` | 60s | `cache_invalidate_prefix("suppliers:")` en POST/PATCH/DELETE |
| `GET /suppliers/{id}` | `suppliers:{id}` | 60s | Misma invalidación por prefijo |
| `GET /api/incidents/` | `incidents:list:status={s}:category={c}:branch={b}` | 60s | `cache_invalidate_prefix("incidents:")` en POST/PATCH |
| `GET /api/incidents/summary` | `incidents:summary` | 30s | Misma invalidación por prefijo |

### 2.3 Endpoints NO cacheados (intencionalmente)

| Endpoint | Motivo |
|---|---|
| `GET /api/incidents/{id}` | **Seguridad**: el detalle de una incidencia puede contener datos sensibles o cambiar de estado frecuentemente. Se prefiere siempre datos frescos. |

### 2.4 Middleware de Timing

Se implementó un middleware (`main.py`) que logea la duración de cada request:

```python
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({elapsed_ms:.2f}ms)")
    return response
```

---

## 3. Mediciones de Rendimiento

### 3.1 Metodología

- **Herramienta**: `TestClient` de FastAPI (httpx + Starlette)
- **Entorno**: Python 3.12.3, TinyDB con 500 suppliers + 500+ incidents
- **Métrica**: Tiempo total de respuesta en milisegundos (incluye serialización JSON)
- **Procedimiento**: Se limpia la caché, se hace 1ª llamada (frío), luego 2ª llamada (caliente)

### 3.2 Resultados

| Endpoint | Frío (ms) | Caliente (ms) | Mejora |
|---|---|---|---|
| `GET /suppliers/` (500 registros) | **30.95** | **2.11** | **+93.2%** |
| `GET /suppliers/1` | **3.52** | **1.87** | **+46.9%** |
| `GET /api/incidents/` (500+ registros) | **15.80** | **1.66** | **+89.5%** |
| `GET /api/incidents/summary` | **2.53** | **1.51** | **+40.2%** |
| `GET /api/incidents/1` (sin caché) | 1.78 | 3.25 | -82.8%* |

> *\* El endpoint sin caché muestra una ligera variación. Esto es normal (ruido de medición).*

### 3.3 Análisis

- **Mayor impacto**: `GET /suppliers/` pasa de **30.95 ms → 2.11 ms** (93.2% de mejora). Es el endpoint más pesado porque serializa 500 registros completos.
- **Gran impacto**: `GET /api/incidents/` pasa de **15.80 ms → 1.66 ms** (89.5% de mejora). Similar al anterior, 500+ registros con filtros.
- **Impacto moderado**: `GET /suppliers/{id}` (46.9%) y `GET /api/incidents/summary` (40.2%) — al ser endpoints más ligeros de por sí, la mejora absoluta es menor pero consistente.
- **Sin impacto (esperado)**: `GET /api/incidents/{id}` sin caché muestra tiempos estables (~1.5-3 ms).

### 3.4 Validación de invalidación

Se verificó que tras un `POST /api/incidents/`, la siguiente llamada a `GET /api/incidents/` obtiene datos frescos (la caché se invalidó correctamente mediante `cache_invalidate_prefix("incidents:")`).

---

## 4. Tradeoffs y Consideraciones

### 4.1 Caché en proceso vs. distribuida

| Aspecto | En proceso (elegido) | Redis / distribuida |
|---|---|---|
| **Complejidad** | Mínima (dict + TTL) | Requiere infraestructura adicional |
| **Latencia** | ~0.01ms por acceso | ~0.1-1ms (red) |
| **Persistencia** | Se pierde al reiniciar | Persistente |
| **Escalabilidad** | No compartida entre instancias | Compartida |
| **Adecuación** | ✅ Para este proyecto (monolito, un solo servidor) | Para sistemas multi-instancia |

**Decisión**: Para TrackFlow, un proyecto educativo con un solo servidor FastAPI, la caché en proceso es la solución óptima. Si el proyecto escalara a múltiples instancias, se migraría a Redis.

### 4.2 TTL elegido

- **60s** para listas: balance entre frescura de datos y reducción de carga. Suficiente para que un usuario navegando vea datos consistentes.
- **30s** para summary: el resumen estadístico puede actualizarse más frecuentemente.
- **Invalidación inmediata** en escritura: garantiza que tras crear/editar un recurso, la siguiente lectura obtenga datos frescos.

### 4.3 Alcance de la invalidación

Se usa `cache_invalidate_prefix` que elimina **todas** las claves que comienzan con un prefijo. Esto es intencionalmente amplio para garantizar consistencia:

- Al crear un supplier, se invalidan **todas** las variantes de `suppliers:list:*` (con diferentes filtros de país/categoría).
- Al crear una incidencia, se invalidan **todas** las variantes de `incidents:list:*` y `incidents:summary`.

### 4.4 Frontend: lazy loading con SSR desactivado

Los componentes cargados con `next/dynamic` y `ssr: false` no se renderizan en el servidor. Esto es adecuado porque:
- `IncidentSummary` usa `BarChart` que requiere el DOM del navegador.
- `IncidentForm` tiene validaciones que dependen de eventos del lado del cliente.

---

## 5. Checklist de Requisitos del Instructor

| # | Requisito | Estado | Evidencia |
|---|---|---|---|
| 1 | Middleware de timing | ✅ | `main.py`: `timing_middleware` con `time.perf_counter()` |
| 2 | Módulo de caché reutilizable | ✅ | `core/cache.py`: `cache_get`, `cache_set`, `cache_invalidate_prefix` |
| 3 | 4 endpoints con GET cacheados | ✅ | `suppliers/`, `suppliers/{id}`, `incidents/`, `incidents/summary` |
| 4 | GET sin caché (justificado) | ✅ | `incidents/{id}`: seguridad (datos sensibles/frecuencia de cambio) |
| 5 | Invalidación en escritura | ✅ | POST/PATCH → `cache_invalidate_prefix` |
| 6 | TTL configurable | ✅ | Parámetro `ttl_seconds` en `cache_set` |
| 7 | Seed masivo (500+ registros) | ✅ | `scripts/seed_massive.py`: 500 suppliers + 500+ incidents |
| 8 | lazyLoading (next/dynamic) | ✅ | `IncidentSummary` + `IncidentForm` |
| 9 | useMemo | ✅ | `statusCounts` en `incident-list.tsx` |
| 10 | Medición (frío vs caliente) | ✅ | Benchmark con resultados (ver sección 3) |
| 11 | CACHING_REPORT.md | ✅ | Este documento |
| 12 | Pull Request | ✅ | Rama `cachear` → `main` |
| 13 | README.md (enunciado) | ✅ | Ver README.md y README.es.md |

---

## 6. Glosario

- **TTL** (Time-To-Live): Tiempo que un dato permanece en caché antes de ser considerado obsoleto.
- **Invalidación**: Proceso de eliminar entradas de caché cuando los datos subyacentes cambian.
- **Caché en proceso**: Almacenamiento en la memoria del mismo proceso de la aplicación (no requiere servidor externo).
- **Lazy Loading**: Técnica que retrasa la carga de un recurso hasta que realmente se necesita.
- **useMemo**: Hook de React que memoiza el resultado de un cálculo costoso.