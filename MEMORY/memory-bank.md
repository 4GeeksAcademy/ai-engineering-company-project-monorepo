# Memory Bank

Este archivo sirve como el banco de memoria central del proyecto, un lugar para documentar el contexto actual, decisiones arquitectónicas, estructura del monorepo y estado de las tareas.

## 🏢 Contexto de Negocio
**Nexova Solutions** es una consultora especializada en soluciones B2B. El proyecto actual es la construcción de un sistema de gestión interno unificado para sus **8 departamentos** clave.

## 🏗️ Estructura del Monorepo
- `scripts/`: Scripts de inicialización y migración (ej. `seed_candidates.py`, `seed_incidents.py`).
- `packages/shared/`: Lógica compartida, tipos y validaciones Pydantic.
- `services/api/`: Backend construido en FastAPI con base de datos TinyDB.
- `uis/application/`: Frontend construido en Next.js App Router.
- `.github/`: Planes de implementación y estrategias documentadas (`STRATEGY.md`, `implementation-plan.md`).

## 📋 Reglas Globales (AGENTS.md)
1. **UV Package Manager**: Usar siempre `uv` en lugar de `pip`.
2. **Step-by-Step Tutor**: Actitud de mentor con el usuario, guiando paso a paso.
3. **Auth Guard Standard**: Todos los endpoints (salvo los explícitamente públicos) deben estar protegidos por JWT.

## 🔄 Estado Actual (Current State)
- Panel de Control (Overview) refactorizado para mostrar los departamentos en formato Grid visual.
- Migas de pan dinámicas integradas en todo el Dashboard.
- Botón "Volver a la Web Oficial" añadido en pantallas de autenticación y sidebar.
- Errores de interceptor Axios (`fetch` crudo) solucionados en los módulos de Proveedores e Incidencias.
- Sistema de puntuación IA integrado en el panel de Candidatos.

## 🎯 Próximos Pasos (Next Steps)
*(A rellenar según las prioridades del usuario o el implementation-plan.md)*

---

## 📝 Memorándum del Proyecto (Historial de la Sesión)

A continuación se documenta el registro cronológico de los problemas resueltos y características implementadas durante esta sesión de desarrollo conjunto:

1. **Corrección Crítica de API (Error 404):** Se corrigió un error de enrutamiento en el módulo de Candidatos (`services/api/routes/candidates.py`) ajustando el prefijo del APIRouter para que coincidiese con `/api/candidates`.
2. **Alineación Arquitectónica:** Se creó un plan de implementación (`.github/implementation-plan.md`) para mapear el código y la interfaz con los 8 departamentos oficiales de Nexova definidos en el `CONTEXT-company.md`.
3. **Sistema de Scoring IA para RRHH:**
   - Se añadió el campo `score_ia` a los modelos de base de datos Pydantic.
   - Se modificó `seed_candidates.py` para generar puntuaciones iniciales aleatorias y se regeneró la colección TinyDB.
   - Se programó la base de datos para devolver los candidatos ordenados de mayor a menor puntuación automáticamente.
   - Se implementó semaforización visual (Verde, Amarillo, Rojo) en las tarjetas de candidatos (`CandidateCard.tsx`) del frontend.
4. **Refactorización del Panel Overview:** Se rediseñó el Dashboard Administrativo (`admin/panel/page.tsx`). Se eliminó la navegación lateral interna por pestañas y se construyó una cuadrícula (CSS Grid) que muestra el resumen de todos los departamentos en tarjetas simultáneas.
5. **Navegación UX (Breadcrumbs):** Se construyó e integró un componente dinámico de Migas de Pan (Breadcrumbs) en la cabecera principal (`layout.tsx`), con nombres de ruta amigables y soporte para IDs dinámicos (ej. `Detalle #14`).
6. **Accesos Rápidos:** Se añadieron botones discretos de "Volver a la Web Oficial" en el menú inferior del Sidebar del panel y en las pantallas de Login y Registro.
7. **Corrección de Seguridad (Errores 401 y 400):**
   - **Módulos Proveedores e Incidencias:** El frontend utilizaba `fetch()` nativo, enviando peticiones sin token JWT. Fueron reemplazados por el interceptor `api` de Axios, solucionando el error 401.
   - **Máquina de Estados de Incidencias:** El backend prohibía transiciones ilegales (ej. `Open` a `Resolved`) devolviendo un 400 Bad Request. Se arregló el frontend para capturar el error `detail` del backend y mostrárselo al usuario de forma clara en pantalla.
