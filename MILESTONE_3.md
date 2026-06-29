## Hito 3 — Talent Tracker · Recruitment Pipeline

La campaña de reclutamiento del departamento de People & Talent ha recibido más de 100 aplicaciones en menos de dos semanas. El equipo está desbordado: rastrean candidaturas en una hoja de cálculo compartida, escriben notas de entrevista en documentos separados y actualizan estados manualmente mediante hilos de correo electrónico. El proceso se está desmoronando.

El equipo de Tecnología ya ha construido y expuesto una API REST para gestionar el pipeline de candidatos. Tu trabajo es construir el frontend que el equipo de People usará desde el lunes. El sistema debe permitir visualizar todas las aplicaciones de un vistazo, filtrarlas por estado y etapa, y acceder a los detalles de cada una sin perder el contexto de la lista.

### Setup del proyecto

```bash
cd uis/talent-pipeline-tracker
npx create-next-app@latest . --typescript --app --tailwind --eslint
```

`.env.local` en la raíz de la app:

```
NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1
```

Arrancar servidor de desarrollo:

```bash
npm run dev
```

### Estructura de archivos

```
uis/talent-pipeline-tracker/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── app/
│   ├── layout.tsx                 # Root layout (tema oscuro, Space Grotesk)
│   ├── page.tsx                   # Página principal — lista + panel detalle
│   ├── globals.css                # Estilos globales
│   ├── loading.tsx                # UI de carga
│   └── error.tsx                  # Error boundary
├── components/
│   ├── candidates/
│   │   ├── CandidateList.tsx       # Tabla/listado de candidatos
│   │   ├── CandidateCard.tsx       # Fila/tarjeta individual
│   │   ├── CandidateDetail.tsx     # Panel de detalle (side drawer)
│   │   ├── CandidateForm.tsx       # Formulario crear/editar
│   │   └── CandidateFilters.tsx    # Barra de filtros (status, stage, búsqueda)
│   ├── notes/
│   │   ├── NoteList.tsx            # Lista de notas
│   │   └── NoteForm.tsx            # Input para añadir nota
│   └── ui/
│       ├── StatusBadge.tsx         # Badge para estado
│       ├── StageBadge.tsx          # Badge para etapa
│       ├── LoadingSpinner.tsx      # Indicador de carga
│       ├── ErrorMessage.tsx        # Mensaje de error
│       ├── EmptyState.tsx          # Estado vacío
│       └── SidePanel.tsx           # Panel lateral reutilizable
├── lib/
│   ├── api.ts                     # Cliente fetch (URL base, manejo errores)
│   ├── types.ts                   # Interfaces TypeScript para la API
│   └── constants.ts               # Enums de status/stage, etiquetas, colores
└── hooks/
    ├── useCandidates.ts            # Fetch listado con filtros
    ├── useCandidate.ts             # Fetch candidato individual
    ├── useNotes.ts                 # Fetch/crear/eliminar notas
    └── useDebounce.ts              # Debounce para input de búsqueda
```

### Funcionalidades requeridas

| Funcionalidad | Descripción |
|---|---|
| **Listar aplicaciones** | Tabla con columnas: nombre, posición, badge de estado, badge de etapa, fecha de aplicación. Listado scrollable. |
| **Filtrar y buscar** | Filtros por estado y etapa (dropdowns), búsqueda por nombre o email (debounced). Sin recargar página. |
| **Paginación** | Vía parámetros `page` y `limit` de la API. |
| **Detalle de candidato** | Panel lateral deslizable desde la derecha. Muestra info completa, selectores de estado/etapa, notas y acciones. La lista permanece visible detrás. |
| **Cambio de estado/etapa** | Selectores en el panel de detalle, actualizan vía PATCH al cambiar. |
| **Notas internas** | Lista de notas + formulario para añadir dentro del panel de detalle. POST para crear, DELETE para eliminar. |
| **Crear aplicación** | Formulario modal/dialog lanzado desde botón "New Application". POST al enviar. |
| **Editar aplicación** | Mismo formulario reutilizado con datos pre-cargados. PUT al enviar. |
| **Eliminar aplicación** | Diálogo de confirmación → DELETE. |
| **Estados de carga** | `loading.tsx` para cargas de página, spinners para operaciones inline. |
| **Manejo de errores** | `error.tsx` para errores de página, `ErrorMessage` inline para fallos por operación. Sin fallos silenciosos. |

### Árbol de componentes (simplificado)

```
Layout (tema oscuro, Space Grotesk)
└── Page ("/")
    ├── Header (título, botón "New Application")
    ├── CandidateFilters (dropdowns status/stage, input búsqueda)
    ├── CandidateList (tabla)
    │   └── CandidateCard (por fila — nombre, posición, estado, etapa, fecha)
    ├── SidePanel (condicional — se desliza desde la derecha)
    │   ├── CandidateDetail (info completa, selectores status/stage)
    │   ├── NoteList + NoteForm
    │   └── Botones de acción (editar, eliminar)
    └── CandidateForm (modal — crear o editar)
```

### API Endpoints

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/records?status=&stage=&search=&page=&limit=` | Listar aplicaciones con filtros |
| POST | `/records` | Crear nueva aplicación |
| GET | `/records/{id}` | Obtener detalle de aplicación |
| PATCH | `/records/{id}` | Actualizar estado o etapa |
| PUT | `/records/{id}` | Editar datos completos |
| DELETE | `/records/{id}` | Eliminar aplicación |
| GET | `/records/{id}/notes` | Obtener notas de una aplicación |
| POST | `/records/{id}/notes` | Añadir nota |
| DELETE | `/records/{id}/notes/{note_id}` | Eliminar nota |

### Modelo de datos (TypeScript)

```ts
// lib/types.ts

export type CandidateStatus = "received" | "in_progress" | "selected" | "discarded";
export type CandidateStage = "pending" | "review" | "personal_interview" | "technical_interview" | "offer_presented";

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
}

export interface CandidateCreate {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  experience_years: number;
  linkedin_url?: string | null;
  cv_url?: string | null;
}

export interface CandidatePatch {
  status?: CandidateStatus;
  stage?: CandidateStage;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface NoteCreate {
  content: string;
}
```

### Mapeo visual de estados y etapas

| Status | Color |
|---|---|
| `received` | Gris |
| `in_progress` | Azul |
| `selected` | Verde |
| `discarded` | Rojo |

| Stage | Color |
|---|---|
| `pending` | Gris |
| `review` | Ámbar |
| `personal_interview` | Azul |
| `technical_interview` | Púrpura |
| `offer_presented` | Verde |

### Reglas técnicas

- Toda llamada a la API debe ser asíncrona con `try/catch` — sin fallos silenciosos.
- El input de búsqueda debe estar debounced (300ms) para evitar llamadas excesivas.
- Los query params de la URL deben sincronizarse con el estado de los filtros (URL bookmarkeable/compartible).
- El panel de detalle debe preservar la posición de scroll de la lista subyacente.
- Los cambios de estado/etapa deben ser optimistas (PATCH) con rollback en caso de error.
- Toda operación debe mostrar un indicador de carga y manejar errores de forma visible para el usuario.
