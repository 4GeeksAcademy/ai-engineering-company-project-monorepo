# 🚀 Implementation Plan: Talent Pipeline Tracker (Método de los 3 Expertos en 5 Fases)

Este plan de implementación articula los requisitos de `.github/STRATEGY.md` y el contexto empresarial de **Nexova Solutions** (`CONTEXT.md`) integrando el criterio de tres expertos en las **5 Fases de Desarrollo (100% COMPLETADAS)**:

1. 🏗️ **Arquitecto Frontend & Next.js App Router**: Enfoque en rutas puras, TypeScript estricto, modularidad y gestión de estado mediante hooks nativos de React (sin librerías externas).
2. 🎨 **Diseñador UX/UI & Dominio Nexova Solutions**: Enfoque en la experiencia de usuario para el equipo de *Operaciones de Selección*, semaforización de estados y branding corporativo.
3. ⚡ **Ingeniero de APIs & Resiliencia Asíncrona**: Enfoque en resiliencia HTTP (`async/await`), cumplimiento de los 3 estados en UI (cargando, éxito, error), mutaciones asíncronas (`PATCH`, `POST`, `PUT`, `DELETE`) y variables de entorno.

---

## 📅 Planificación por Fases y Criterio de los 3 Expertos

### ✅ 🔹 Fase 1: Infraestructura de Tipos, Cliente API REST y Variables de Entorno (COMPLETADA)
- ✅ 🏗️ **Arquitecto Next.js**: Definición de interfaces TypeScript en `types/candidate.ts` (`Candidate`, `CandidateNote`, `Status`, `Stage`, `CandidateFilters`).
- ✅ 🎨 **Experto UX/Nexova**: Mapeo de valores de dominio y etiquetas para el flujo de selección de Nexova Solutions (ej. Pendiente, En Revisión, Entrevista, Oferta).
- ✅ ⚡ **Ingeniero de APIs**: Implementación de `services/api.ts` con cliente `fetch` nativo encapsulando `GET`, `POST`, `PUT`, `PATCH`, `DELETE` hacia `NEXT_PUBLIC_API_URL`. Creación de `.env.example`.
- ✅ 📦 **Git Commit**: Commit de valor registrado (`añadir interfaces TypeScript, cliente de servicio API REST y .env.example (Fase 1)`).

---

### ✅ 🔹 Fase 2: Layout de Nexova Solutions y Componentes Base de UI (COMPLETADA)
- ✅ 🏗️ **Arquitecto Next.js**: Creación de la estructura base de componentes en `components/ui/` (`Badge.tsx`, `LoadingSpinner.tsx`, `ErrorMessage.tsx`) y `components/layout/` (`Header.tsx`).
- ✅ 🎨 **Experto UX/Nexova**: Implementación de `Header.tsx` con la identidad de *Nexova Solutions - Operaciones de Selección*.
- ✅ ⚡ **Ingeniero de APIs**: Creación de primitivos de feedback para los 3 estados obligatorios: `LoadingSpinner.tsx`, `ErrorMessage.tsx` y `Badge.tsx`.
- ✅ 📦 **Git Commit**: Commit de valor registrado (`añadir layout de Nexova Solutions y componentes base de UI (Fase 2)`).

---

### ✅ 🔹 Fase 3: Listado de Candidaturas, Buscador y Filtros Dinámicos (`/`) (COMPLETADA)
- ✅ 🏗️ **Arquitecto Next.js**: Sincronización de filtros de búsqueda (`query`), `status` y `stage` en la URL usando `useSearchParams` y `useRouter` sin recarga de página.
- ✅ 🎨 **Experto UX/Nexova**: Componente `CandidateCard.tsx` con vista rápida de nombre, puesto, experiencia, badges semaforizados y enlace al detalle.
- ✅ ⚡ **Ingeniero de APIs**: Integración de `GET /records` en `src/app/page.tsx` gestionando estados visuales de carga (spinner), éxito (grid de tarjetas) y error de red.
- ✅ 📦 **Git Commit**: Commit de valor registrado (`implementar vista de listado de candidaturas, buscador y filtros dinámicos (Fase 3)`).

---

### ✅ 🔹 Fase 4: Vista de Detalle, Actualización Rápida (PATCH) y Notas (`/candidates/[id]`) (COMPLETADA)
- ✅ 🏗️ **Arquitecto Next.js**: Configuración de ruta dinámica en `app/candidates/[id]/page.tsx`.
- ✅ 🎨 **Experto UX/Nexova**: Visualización completa del candidato (LinkedIn, CV, teléfono, experiencia) y panel de notas internas para consultores.
- ✅ ⚡ **Ingeniero de APIs**:
  - Actualización rápida de Estado y Etapa mediante `PATCH /records/:id` (`StatusStageControls.tsx`).
  - Componente `CandidateNotesSection.tsx` para listar (`GET`), agregar (`POST`) y eliminar (`DELETE`) notas en tiempo real.
- ✅ 📦 **Git Commit**: Commit de valor registrado (`implementar vista de detalle, controles PATCH y gestión de notas internas (Fase 4)`).

---

### ✅ 🔹 Fase 5: Formularios de Registro (POST), Edición (PUT) y Verificación Final (COMPLETADA)
- ✅ 🏗️ **Arquitecto Next.js**: Componente `CandidateForm.tsx` reutilizable con validación en cliente.
- ✅ 🎨 **Experto UX/Nexova**: Vistas de alta en `/candidates/new` (`POST /records`) y edición en `/candidates/[id]/edit` (`PUT /records/:id`) con mensajes de éxito/error.
- ✅ ⚡ **Ingeniero de APIs**: Pruebas de integración de mutaciones completas y verificación técnica ejecutando `npm run build` sin errores de compilación.
- 📦 **Git Commit**: Commit de valor final sugerido (`implementar formularios de alta/edición y verificación del build (Fase 5)`).

---

## 🧪 Plan de Verificación

### Comandos de Verificación
- `npm run build`: Certificar la compilación sin errores de TypeScript ni Next.js Turbopack. (Verificado ✅)
- `npm run lint`: Validar código limpio con ESLint.

### Checklist de Verificación
1. ✅ Búsqueda y filtrado en URL sin recarga de página.
2. ✅ Navegación SPA fluida entre páginas (`/`, `/candidates/[id]`, `/candidates/new`, `/candidates/[id]/edit`).
3. ✅ Mutaciones asíncronas probadas: `POST`, `PUT`, `PATCH`, `DELETE`.
4. ✅ Visibilidad de los 3 estados en UI (Loading, Success, Error).
