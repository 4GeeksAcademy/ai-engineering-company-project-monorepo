# Talent Pipeline Tracker — Implementación

Documentación del Hito 3: frontend del pipeline de candidaturas para el equipo de **People & Talent de Brasaland**.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4  
**Estado:** Implementado

---

## Contexto de dominio (Brasaland)

La UI es una herramienta interna del equipo de **People & Talent de Brasaland** (cadena de asados, 14 locales en Colombia y Florida). Idioma **español**, branding Brasaland. Los nombres de campo de la API se conservan, pero las **etiquetas visibles, estados y etapas** se muestran traducidos:

- Status: `received`=Recibida, `in_progress`=En proceso, `selected`=Seleccionada, `discarded`=Descartada.
- Stage: `pending`=Pendiente, `review`=En revisión, `personal_interview`=Entrevista personal, `technical_interview`=Entrevista técnica, `offer_presented`=Oferta presentada.

## API (contrato confirmado)

Base `NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1`.

- `GET /records?status&stage&search&page&limit` → `{ total, page, limit, data: RecordOut[] }`.
- `GET /records/:id` → `RecordOut` (incluye `notes[]`). `POST /records` (201), `PUT /records/:id`, `PATCH /records/:id` (`{status?, stage?}`), `DELETE /records/:id` (204).
- `GET/POST /records/:id/notes`, `DELETE /records/:id/notes/:note_id`.
- `RecordOut`: `id, full_name, email, phone, position, linkedin_url, cv_url, status, stage, experience_years, notes_count, applied_at, updated_at`.
- `RecordCreate` requeridos: `full_name, email, phone, position, experience_years`.

## Arquitectura

Enfoque **client-side fetching** (cumple `async/await` + estados carga/éxito/error y actualización sin recarga). Páginas delgadas que montan componentes cliente; los filtros del listado viven en la URL vía `useSearchParams` y se envían como query params al API.

### Navegación entre rutas

```mermaid
flowchart LR
  List["/ (listado)"] -->|Link| Detail["/candidates/[id]"]
  List -->|Link| New["/candidates/new"]
  Detail -->|Link| Edit["/candidates/[id]/edit"]
  List -.->|"useSearchParams -> API query"| API[(Tracker API)]
  Detail -.->|"PATCH/notes"| API
  New -.->|POST| API
  Edit -.->|PUT| API
```

### Capas del frontend

```mermaid
flowchart TB
  subgraph appLayer [App Router]
    PageList["app/page.tsx"]
    PageDetail["app/candidates/[id]/page.tsx"]
    PageNew["app/candidates/new/page.tsx"]
    PageEdit["app/candidates/[id]/edit/page.tsx"]
  end

  subgraph componentsLayer [Components]
    Filters["CandidateFilters"]
    Table["CandidateTable"]
    Form["CandidateForm"]
    Notes["NotesPanel"]
    Selects["StatusSelect / StageSelect"]
  end

  subgraph hooksLayer [Hooks]
    useCandidates["useCandidates"]
    useCandidate["useCandidate"]
    useNotes["useNotes"]
  end

  subgraph libLayer [Lib]
    ApiClient["lib/api.ts"]
    Constants["lib/constants.ts"]
    Types["types/index.ts"]
  end

  API[(Tracker API REST)]

  PageList --> Filters
  PageList --> Table
  PageDetail --> Selects
  PageDetail --> Notes
  PageNew --> Form
  PageEdit --> Form

  Filters --> useCandidates
  Table --> useCandidates
  PageDetail --> useCandidate
  Notes --> useNotes
  Selects --> ApiClient
  Form --> ApiClient

  useCandidates --> ApiClient
  useCandidate --> ApiClient
  useNotes --> ApiClient

  ApiClient --> Types
  ApiClient --> API
  Filters --> Constants
  Table --> Constants
  Selects --> Constants
```

### Flujo de datos del listado

```mermaid
sequenceDiagram
  participant User as Usuario
  participant URL as URL query params
  participant Filters as CandidateFilters
  participant Hook as useCandidates
  participant API as Tracker API
  participant UI as CandidateTable

  User->>Filters: Cambia estado, etapa o búsqueda
  Filters->>URL: router.replace con status, stage, search
  URL->>Hook: useSearchParams detecta cambio
  Hook->>Hook: status = loading
  Hook->>API: GET /records?status&stage&search&limit=100
  alt Petición exitosa
    API-->>Hook: PaginatedRecords
    Hook->>UI: status = success, render tabla
  else Petición fallida
    API-->>Hook: ApiError
    Hook->>UI: status = error, mensaje + reintentar
  end
```

### Flujo de mutaciones sin recarga

```mermaid
sequenceDiagram
  participant User as Usuario
  participant UI as Componente UI
  participant API as Tracker API
  participant State as Estado local

  User->>UI: Cambia estado/etapa, envía formulario o nota
  UI->>UI: Muestra estado enviando
  UI->>API: PATCH / PUT / POST / DELETE
  alt Mutación exitosa
    API-->>UI: RecordOut o Note actualizado
    UI->>State: Actualiza sin router.refresh
    UI->>User: Feedback de éxito
  else Mutación fallida
    API-->>UI: ApiError
    UI->>User: Mensaje de error claro
  end
```

### Estados async en la UI

```mermaid
stateDiagram-v2
  [*] --> Loading: Inicia fetch o mutación
  Loading --> Success: Respuesta OK
  Loading --> Error: ApiError o red
  Error --> Loading: Usuario reintenta
  Success --> Loading: Cambio de filtros o refetch
  Success --> Success: Mutación local sin recarga
```

## Estructura de carpetas

- `types/index.ts` — tipos `RecordOut`, `Note`, `RecordCreate`, `RecordPatch`, `PaginatedRecords`, uniones `Status`/`Stage`.
- `lib/api.ts` — wrapper `request()` con `async/await`, manejo de errores (lanza `ApiError` con status/detalle) y funciones tipadas (`getRecords`, `getRecord`, `createRecord`, `updateRecord`, `patchRecord`, `deleteRecord`, `getNotes`, `addNote`, `deleteNote`).
- `lib/constants.ts` — arrays `STATUS_OPTIONS`/`STAGE_OPTIONS` con `{value,label}` y mapas de color para badges.
- `hooks/` — `useCandidates` (lista + filtros), `useCandidate` (detalle), `useNotes`.
- `components/` — `Header`, `CandidateFilters` (estado, etapa, búsqueda con debounce), `CandidateTable`/`CandidateRow`, `StatusBadge`, `StageBadge`, `StatusSelect`, `StageSelect`, `NotesPanel`, `CandidateForm` (reusado en alta/edición), `Alert`, `Spinner`/`LoadingState`, `ErrorState`, `EmptyState`.

## Rutas (`app/`)

- `app/layout.tsx` — root layout Brasaland (metadata, header, español, Tailwind).
- `app/page.tsx` — listado; monta `CandidateFilters` + `CandidateTable`. Lee filtros con `useSearchParams`, refleja cambios con `useRouter().replace()`; fetch al API con esos params; estados carga/error/vacío.
- `app/candidates/[id]/page.tsx` — detalle (client, `useParams`): todos los campos, `StatusSelect`/`StageSelect` con `PATCH`, panel de notas (`GET/POST/DELETE`), enlaces a LinkedIn/CV, botón Editar.
- `app/candidates/new/page.tsx` — `CandidateForm` en modo alta (`POST`), validación de requeridos, feedback y redirección al detalle.
- `app/candidates/[id]/edit/page.tsx` — `CandidateForm` precargado (`PUT`), validación y feedback.

## Detalles de implementación

- **Filtros/búsqueda**: `CandidateFilters` actualiza query params (`status`, `stage`, `search`) sin recargar; búsqueda con debounce; el hook re-fetchea al cambiar params. Se usa `limit` alto (p.ej. 100) para "ver todas de un vistazo".
- **Mutaciones sin recarga**: tras `PATCH`/`POST`/notes, se actualiza el estado local con la respuesta del API (no `router.refresh()` completo).
- **Estados UI**: cada fetch expone `loading | data | error`; errores muestran mensaje claro y opción de reintentar; formularios muestran feedback de éxito/error y estado enviando.
- **Validación**: en `CandidateForm`, requeridos (`full_name`, `email` con formato, `phone`, `position`, `experience_years` numérico ≥ 0) antes de enviar; `linkedin_url`/`cv_url` opcionales validando URL si se ingresan.
- **Config**: `.env.local` con `NEXT_PUBLIC_API_URL` y fallback a la URL en `lib/api.ts`. Metadata actualizada en `layout.tsx`.

## Verificación

- `npm run dev` — probar flujos en local.
- `npm run lint` — sin errores de ESLint.
- `npm run build` — compilación de producción exitosa.

## Tareas completadas

1. **types-lib** — `types/index.ts`, `lib/api.ts`, `lib/constants.ts`, `.env.local`
2. **layout-header** — `app/layout.tsx` con branding Brasaland y `Header`
3. **shared-components** — badges, estados de carga/error/vacío, `Alert`
4. **list-page** — listado con filtros, búsqueda y tabla de candidaturas
5. **detail-page** — detalle con PATCH de estado/etapa y panel de notas
6. **forms** — alta y edición de candidaturas con validación
7. **verify** — lint y build verificados
