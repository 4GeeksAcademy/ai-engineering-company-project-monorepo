# 📌 El reto

Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

El departamento de People & Talent de tu empresa está en medio de una campaña de selección activa. La posición abierta ha recibido más de 100 candidaturas en menos de dos semanas y el equipo está desbordado: llevan el seguimiento de los candidatos en una hoja de cálculo compartida, escriben las notas de las entrevistas en documentos separados y actualizan los estados manualmente por hilos de correo. El proceso se está desmoronando.

El equipo de Tecnología ya ha construido y expuesto una API REST para gestionar el pipeline de candidaturas. Tu trabajo es construir el frontend que el equipo de People empezará a usar el lunes. El sistema debe permitir ver todas las candidaturas de un vistazo, filtrarlas por estado y por etapa, y acceder al detalle de cada una sin perder el contexto del listado.

La responsable de People ha compartido lo que necesitan con urgencia:

### Lo que la herramienta debe hacer
Mostrar todas las candidaturas en un listado — nombre, puesto, estado actual y etapa actual de un vistazo. Permitir filtrar por estado y por etapa, y buscar por nombre o email sin recargar la página. Abrir la vista de detalle de un candidato y, desde ahí, cambiar su estado o etapa con una sola interacción. Añadir notas internas a una candidatura y eliminarlas cuando ya no sean relevantes. Registrar nuevas candidaturas directamente desde la interfaz y editar los datos de una cuando haya que corregir algo. La API ya está lista y está documentada en `https://playground.4geeks.com/tracker/api/v1/docs`. Todas las peticiones deben gestionarse de forma asíncrona — la interfaz debe comunicar los estados de carga y manejar los errores con claridad. El equipo no puede permitirse una herramienta que falle en silencio o que deje al usuario sin saber qué está pasando.

Esta es una herramienta interna real que va a usar gente real desde el primer día. Constrúyela como tal.

---

## 💻 Qué debes hacer

### Vistas y navegación
- [ ] Crea una **página de listado de candidaturas** (`/`) que muestre todos los candidatos obtenidos desde `GET /records`.
- [ ] Crea una **página de detalle de candidatura** (`/candidates/[id]`) que obtenga y muestre los datos completos desde `GET /records/:id`.
- [ ] La navegación entre listado y detalle debe usar el sistema de rutas de Next.js — sin recargas completas de página.

### Listado de candidaturas
- [ ] Muestra el nombre completo, el puesto, el estado actual y la etapa actual de cada candidato.
- [ ] Implementa **filtro por estado** y **filtro por etapa** usando query parameters (`useSearchParams`).
- [ ] Implementa un **campo de búsqueda** que filtre por nombre o email sin recargar la página.
- [ ] Muestra un estado de carga mientras se obtienen los datos y un mensaje de error si la petición falla.

### Detalle de candidatura
- [ ] Muestra todos los campos disponibles: nombre, email, teléfono, puesto, LinkedIn, enlace al CV, años de experiencia, estado, etapa y fecha de aplicación.
- [ ] Incluye un control para **actualizar el estado** mediante `PATCH /records/:id`.
- [ ] Incluye un control para **actualizar la etapa** mediante `PATCH /records/:id`.
- [ ] Muestra el listado de notas obtenidas desde `GET /records/:id/notes`.
- [ ] Permite añadir una nueva nota mediante `POST /records/:id/notes`.
- [ ] Permite eliminar una nota mediante `DELETE /records/:id/notes/:note_id`.

### Gestión de candidaturas
- [ ] Incluye un **formulario para registrar una nueva candidatura** (`POST /records`).
- [ ] Incluye un **formulario para editar los datos de una candidatura** (`PUT /records/:id`).
- [ ] Ambos formularios deben validar los campos requeridos antes de enviarse.
- [ ] Muestra feedback de éxito o error tras cada envío.

### Estado y manejo asíncrono
- [ ] Todas las llamadas a la API deben gestionarse con `async/await`.
- [ ] Cada operación de obtención de datos debe tener al menos tres estados en la UI: cargando, éxito y error.
- [ ] Tras un `PATCH`, `PUT` o `POST`, actualiza la interfaz para reflejar el cambio sin requerir una recarga completa de página.

### Estructura del código
- [ ] Organiza el proyecto con una estructura de carpetas clara: `/components`, `/hooks` (si aplica), `/types`, `/lib` o `/services`.
- [ ] Define tipos TypeScript para todas las estructuras de datos recibidas de la API.

> ⚠️ **IMPORTANTE:** Los nombres de campos, etiquetas visibles, estados y valores específicos del dominio en tu implementación deben coincidir con lo especificado en tu **CONTEXT.md**. Por ejemplo, si tu empresa es TrackFlow, la interfaz debe sentirse como una herramienta interna del equipo de People & Talent de TrackFlow, aunque los nombres de campos de la API sigan siendo los definidos por el tracker backend. Una implementación genérica que ignore el contexto de tu empresa no será aceptada.

> ⚠️ **IMPORTANTE:** Usa únicamente Next.js (App Router), React y TypeScript. No uses librerías externas de gestión de estado (Redux, Zustand, Jotai, etc.). El estado a nivel de componente con hooks es suficiente para este hito.

---

## ✅ Qué vamos a evaluar

- [ ] La página de listado renderiza correctamente los datos obtenidos de la API.
- [ ] Los filtros por estado y etapa funcionan usando query parameters sin recargas de página.
- [ ] La búsqueda por nombre o email funciona sin recargar la página.
- [ ] La página de detalle carga y muestra todos los campos del candidato correcto por ID.
- [ ] El estado y la etapa se pueden actualizar desde el detalle usando `PATCH`.
- [ ] Las notas se pueden listar, añadir y eliminar desde el detalle.
- [ ] Las nuevas candidaturas se pueden registrar mediante un formulario usando `POST`.
- [ ] Los datos de una candidatura existente se pueden editar mediante un formulario usando `PUT`.
- [ ] Los estados de carga, éxito y error son visibles para el usuario en todas las operaciones asíncronas.
- [ ] Los tipos TypeScript están definidos y se usan para las estructuras de datos de la API.
- [ ] La estructura de carpetas separa componentes, tipos y lógica de acceso a datos.
- [ ] El App Router de Next.js se usa correctamente para navegación y rutas dinámicas.
- [ ] No hay prop drilling — el estado está correctamente acotado a nivel de componente.
- [ ] La implementación refleja el contexto de la empresa asignada (nombres de campo, etiquetas, valores del dominio).

> **Nota:** El diseño visual y el estilado no se evaluarán formalmente en este hito, pero la interfaz debe ser usable y mostrar toda la información requerida con claridad.

---

## 📦 Cómo entregar

Sube los cambios a tu repositorio del monorepo en GitHub y comparte el enlace siguiendo las instrucciones de entrega de tu instructor. Asegúrate de que el archivo `.env.local` no está commiteado e incluye un `.env.example` para documentar las variables de entorno necesarias.