# Plan de Implementación: Auditoría de Gestión de Errores

## 📌 Objetivo
Aplicar una estrategia de gestión de errores robusta y consistente en todas las capas del monorepo (Frontend, Backend y Scripts) sin introducir nuevas funcionalidades. El sistema no debe romperse en silencio, debe dar feedback visual al usuario en cada estado (cargando, éxito, error), usar mensajes amigables y no filtrar datos sensibles.

## 🛠️ Alcance de la Auditoría y Modificaciones

### 1. Capa Frontend (Next.js / TypeScript)
**Módulos a revisar:** `/uis/application/src/` (Componentes, Contexts y Páginas, ej. Proveedores, Incidencias, Perfil, Autenticación).
- **Control de Excepciones:** Auditar cada llamada a la API (`api.get`, `api.post`, `fetch`). Añadir `try/catch` local a la petición, evitando bloques gigantes.
- **Patrón de 3 Estados:** Asegurar que cada vista que carga datos tenga variables `loading`, `data` (éxito) y `error`. Implementar skeletons o spinners y manejo en bloque `finally`.
- **Mensajes y UX:** Sustituir errores crudos (e.g. `Error 500`, `Unexpected token`) por alertas legibles y amistosas (e.g., *"No pudimos cargar los proveedores en este momento"*). Añadir un botón o enlace para reintentar la acción.
- **Robustez de UI:** Implementar Optional Chaining (`?.`) y Nullish Coalescing (`??`) al mapear datos dinámicos.

### 2. Capa Backend (Python / FastAPI)
**Módulos a revisar:** `/services/api/routes/` y `/services/api/main.py`.
- **Scoping de Errores:** Refactorizar handlers que envuelven todo en un `try/except Exception as e` genérico. Capturar excepciones específicas (ej. `HTTPException`, `ValueError`, errores de base de datos) lo más cerca posible de la operación que los genera.
- **Respuestas Estructuradas HTTP:** Retornar códigos semánticos correctos (`400` validación, `404` no encontrado, `401/403` auth, `500` error de servidor) mediante `HTTPException(status_code, detail)`.
- **Protección de Datos:** Asegurar que en ningún momento se pase `str(e)` directamente al `detail` si `e` contiene rutas del sistema local, contraseñas de DB o trazas de la pila (Stack Traces).
- **APIs Externas:** Añadir timeouts y try/except a llamadas externas si las hubiera.

### 3. Capa de Scripts (Python)
**Módulos a revisar:** `/scripts/` (ej. `seed_candidates.py`, `seed_incidents.py`, `analyzer_core.py`).
- **Control I/O:** Envolver `open()` y operaciones de lectura/escritura CSV en `try/except`.
- **Salida de Errores:** Imprimir los errores críticos a `sys.stderr` usando `print(..., file=sys.stderr)`.
- **Códigos de Salida (Exit Codes):** Añadir `sys.exit(1)` en excepciones críticas para asegurar que cualquier pipeline CI/CD o proceso automatizado falle si el script falla.
- **Validación Defensiva:** Validar que los archivos de entrada existen o tienen las cabeceras correctas antes de iterar ciegamente.

### 4. Limpieza Transversal
- Eliminar o sustituir los `console.log`, `console.error` y `print` de depuración que expongan credenciales, tokens JWT o estados internos innecesarios en producción.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

Para asegurar una ejecución sistemática y evitar regresiones, la implementación se dividirá en las siguientes fases secuenciales:

### Fase 1: Auditoría y Diagnóstico (Discovery)
- [x] Ejecución del análisis transversal del monorepo mediante agentes para identificar las debilidades concretas (bloques try/catch ausentes, errores silenciados, fallos de UX).
- [x] Generación de un reporte interno de estado.

**📝 Hallazgos de la Auditoría (Reporte Fase 1):**
- **Frontend:** Llamadas asíncronas no protegidas (`fetch` sin `try/catch` o con catches genéricos) en `trackerApi.ts`, `AuthContext.tsx`, `register/page.tsx` y rutinas restantes en `incidents/page.tsx`.
- **Backend:** Manejadores masivos `except Exception as e` en `email_utils.py` y `incidents.py`. Fuga de datos críticos detectada enviando `str(e)` directo al frontend en FastAPI.
- **Scripts:** Faltan bloques `try/except` para I/O (`analyze.py`) y ausencia total de salidas seguras `sys.exit(1)` en scripts críticos (`seed_candidates.py`, `seed_incidents.py`, `analyzer_core.py`, `take_screenshots.py`), lo que oculta los errores a los pipelines de CI/CD.

### Fase 2: Robustez de Scripts y Procesos en Segundo Plano
- [x] Refactorización de `scripts/seed_*.py` y utilidades.
- [x] Implementación de comprobaciones defensivas de E/S.
- [x] Inyección de `sys.exit(1)` y mensajes claros hacia `stderr`.

### Fase 3: Seguridad y Semántica del Backend (API)
- [x] Refactorización de los manejadores de rutas en `services/api/routes/`.
- [x] Ajuste del *scoping* de los bloques `try/except` a la operación mínima necesaria.
- [x] Estandarización de las respuestas `HTTPException` con JSON estructurado y eliminación de trazas sensibles.

### Fase 4: Resiliencia y UX del Frontend
- [x] Refactorización progresiva de las vistas en `uis/application/src/app/`.
- [x] Inyección del patrón de 3 estados (Cargando, Éxito, Error) en todos los componentes que obtienen datos.
- [x] Reemplazo de alertas crudas por mensajes de usuario amigables y adición de mecánicas de reintento/resolución.
- [x] Refuerzo de renderizado con *Optional Chaining* (`?.`).

### Fase 5: Limpieza General y Verificación Final
- [x] Purgado de `console.log/error` o `print` que filtren datos.
- [x] Simulación manual de caídas controladas (ej. detener la base de datos) para certificar que todo el flujo de errores responde estéticamente y sin romperse.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)
De acuerdo a las directrices de la Skill `code-refinement-suite`, este plan se encuadra en un **Nivel 2/3 de Complejidad** (Refactorización transversal de resiliencia).
1. **PACK PLANNER (Ejecutado ahora):** Uso de *Step-Back Prompting* para abstraer las metas de la auditoría y formalizarlas en este documento por capas.
2. **PACK CODER (Siguiente fase):** Se empleará *Chain of Verification (CoVe)* al auditar componente por componente. Primero se detectarán las ausencias de `try/catch` y estados de carga, y luego se modificarán y verificarán verificando el correcto tipado de TypeScript y Python.
3. **PACK AUDITOR:** Simulación de fallos (e.g., forzar errores 500 y apagar la DB) para verificar que los estados de carga y error funcionan visualmente y no arrojan pantallas blancas (White Screen of Death). Confirmación manual de "No git push automático".
