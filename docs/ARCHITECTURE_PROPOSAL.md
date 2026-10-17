# Propuesta de Arquitectura de Backend — Nexova

**Para:** CTO / liderazgo técnico
**De:** Equipo de ingeniería, proyecto transversal Nexova
**Objetivo:** proponer, con criterio técnico y sin código, la arquitectura del backend antes de empezar a construirlo.

## Resumen ejecutivo

Propongo **arquitectura en capas** (rutas → servicio/caso de uso → acceso a datos) como patrón, frente a MVC y serverless, porque Nexova es una API pura consumida por varios frontends desacoplados y con cargas de trabajo largas y con estado (IA, websockets) — ninguno de los otros dos patrones encaja con esas características. Sobre ese patrón, propongo desplegarlo como **monolito modular**: un único servicio FastAPI, organizado internamente por dominio de negocio (selección de talento, atención al cliente, agente de IA), con fronteras claras entre módulos que permiten extraer cualquiera de ellos como servicio independiente el día que el uso real lo justifique. No propongo microservicios en esta fase ni un monolito sin estructura interna — ambos extremos tienen un costo que hoy no se justifica con lo que sabemos del sistema.

El resto del documento desarrolla por qué esta arquitectura encaja con lo que Nexova está construyendo, cómo organizo módulos, dominios y rutas, qué decisiones técnicas tomo ya, y qué riesgos o ambigüedades hay que resolver antes de escribir el primer endpoint.

---

## 1. Patrón arquitectónico propuesto y por qué

### 1.1 Patrones evaluados frente a las características reales de Nexova

No elijo el patrón por preferencia; lo comparo contra cuatro características concretas de Nexova, dos del sistema y dos del negocio: **(a)** el backend es una API pura consumida por varios frontends desacoplados (sitio público, portal de candidatos, backoffice, chatbot), no una app que renderiza sus propias vistas; **(b)** hay cargas de trabajo largas y con estado (parsing/scoring de CV con IA, conexiones persistentes de websocket para dashboards en vivo), no solo peticiones cortas y sin estado; **(c)** Nexova es una consultora de RRHH cuyo producto central es la decisión humana sobre personas — el software automatiza *sugerencias* (score de un candidato, prioridad de un ticket), nunca la decisión final, y opera en un dominio ya regulado por su propio negocio (protección de datos de candidatos, no discriminación en procesos de selección) antes incluso de que haya IA de por medio; **(d)** Nexova es, por su modelo de negocio, una empresa donde ingeniería es una función de soporte a Marketing y Operaciones —no el producto que se vende—, así que el equipo de backend es estructuralmente pequeño de forma permanente, no "pequeño por ahora": no es una startup de software que vaya a escalar su plantilla técnica al crecer.

| Patrón | Qué asume sobre el sistema | Por qué encaja o no con Nexova |
|---|---|---|
| **MVC** | El propio backend renderiza vistas para un usuario final (ciclo request → controller → view) | No encaja: Nexova no tiene una sola vista que el backend renderice — tiene varios frontends independientes (`uis/website`, portal, backoffice) que consumen la misma API. Forzar MVC aquí no tiene "View" real que ocupar, y termina mezclando el controlador con lógica de negocio por falta de una capa donde ponerla |
| **Serverless (funciones)** | Invocaciones cortas, sin estado, con tráfico irregular donde pagar solo por ejecución compensa el costo operativo por función | No encaja hoy: el scoring de CV con IA y el chatbot son operaciones potencialmente lentas, y los dashboards en vivo necesitan conexiones de websocket persistentes — ambos casos chocan con el modelo de ejecución corta y el cold start de funciones. Tampoco encaja con (d): gestionar decenas de funciones con sus propios permisos y triggers es más carga operativa para un equipo que nunca va a crecer para absorberla, no menos |
| **Arquitectura en capas (elegida)** | Un servicio separa responsabilidades en niveles — presentación (rutas), lógica de negocio (servicios/casos de uso), acceso a datos (repositorios/modelos) — dentro de un mismo deployable | Encaja con (b): permite testear reglas de negocio (scoring, validación del formulario, cálculo de SLA) sin depender del transporte HTTP ni de la base de datos, y que el agente de IA llame directamente a la capa de servicio de selección y soporte sin pasar por red. Encaja sobre todo con (c): al separar la lógica de negocio del transporte, el score de un candidato o el escalado de un ticket quedan en un único lugar auditable e independiente de cómo se expone por HTTP — condición necesaria, no cosmética, para que un consultor pueda revisar y explicar una decisión sobre una persona, que es lo que el propio negocio de Nexova exige incluso sin IA de por medio. Y encaja con (d): es el nivel de complejidad operativa que un equipo estructuralmente pequeño puede sostener de forma indefinida |

**Patrón elegido: arquitectura en capas**, implementada como un único servicio FastAPI (`services/api/`) con rutas → servicio/caso de uso → acceso a datos, y organizado internamente por dominio de negocio (bounded context). El trabajo pesado o de larga duración (parsing de CV, llamadas a IA, envío de correo) se ejecuta como tareas en background dentro de la misma plataforma, no como servicios aparte.

### 1.2 Una decisión relacionada pero distinta: topología de despliegue

La arquitectura en capas no decide por sí sola si cada dominio se despliega como servicio propio (microservicios) o todos juntos (monolito). Esa es la segunda decisión de este documento — **monolito modular**, no microservicios ni un monolito sin estructura interna — y está justificada en la sección 2 con las mismas características reales de Nexova, no con preferencia genérica.

---

## 2. Por qué esta topología (monolito modular) encaja con lo que Nexova está construyendo

El backend tiene que soportar, según `CONTEXT.md` y la propuesta de departamentos en `company-choice.md`, dos dominios con necesidades distintas que **comparten datos y un mismo agente de IA**:

| Dominio | Qué necesita | Por qué importa para la arquitectura |
|---|---|---|
| Selección de talento | Alta de candidato, carga y scoring de CV, búsqueda con filtros, portal de estado, dashboard de consultores | Procesamiento asíncrono (parsing/IA) + datos personales sensibles |
| Atención al cliente | Chatbot, tickets, dashboard de supervisores en vivo, detección de sentimiento | Conversación con IA + actualizaciones en tiempo real |
| Agente de IA único | Combina selección y soporte | Necesita leer/escribir sobre candidatos **y** tickets en la misma operación lógica |

Tres hechos del contexto de Nexova empujan directamente hacia el monolito modular y no hacia microservicios:

1. **El agente cruza los dos dominios.** Si `selection` y `support` fueran servicios separados, el agente tendría que resolver consistencia entre servicios (llamadas de red, fallos parciales, reintentos) para algo que en un monolito es una llamada de función. Se pagaría el costo de la distribución sin ganar nada a cambio, porque no hay necesidad de escalar selección y soporte de forma independiente todavía.
2. **El proyecto se construye por hitos, no de una vez** (Backend, Telemetría, RAG, Agentes, Workflows, Real-time llegan en momentos distintos). Una arquitectura que exige decidir límites de servicio y contratos de red desde el hito 1 —cuando solo existe el alta de candidato del sitio web— fuerza a adivinar fronteras antes de tener uso real. El monolito modular permite construir `candidates/` ahora y añadir `selection/`, `support/`, `agent/`, `realtime/` en hitos sucesivos sin reescribir lo anterior.
3. **El equipo de ingeniería es estructuralmente pequeño, no pequeño "por ahora".** Nexova es una consultora de RRHH: su negocio se sostiene con headhunters, consultores y formadores, no con una organización de software que vaya a crecer al ritmo del negocio. Microservicios exigen despliegue independiente, observabilidad distribuida y gestión de contratos entre servicios — una inversión que se amortiza cuando varios equipos de ingeniería necesitan moverse en paralelo, algo que la naturaleza del negocio de Nexova no va a producir. Ese costo operativo competiría de forma permanente, no temporal, con el tiempo de construir producto.

El monolito modular no es una renuncia a escalar después: al aislar cada dominio detrás de una capa de servicio (sección 3.2), el día que el scoring de CVs con IA resulte ser el cuello de botella real, se extrae *ese* módulo como worker independiente sin tocar el resto.

Se descarta también el monolito **sin** estructura interna (rutas de FastAPI con lógica y queries SQL directamente en el handler) porque impide testear reglas de negocio (scoring, validaciones del formulario, cálculo de SLA) sin levantar la app entera, y porque acopla el contrato HTTP al modelo de datos, así que un cambio de esquema rompe la API pública.

---

## 3. Organización de módulos, dominios y rutas

### 3.1 Cómo influyen las convenciones estándar de FastAPI en esta propuesta

Antes de fijar el criterio de separación, comparé dos convenciones ampliamente usadas en proyectos FastAPI reales, para no partir de preferencia genérica sino de prácticas ya probadas:

**1. La convención oficial ("Bigger Applications - Multiple Files", en la documentación de FastAPI).** Propone dividir la app en módulos con `APIRouter`, cada uno con su propio `prefix`, `tags` y `dependencies`, registrados en `main.py` vía `include_router()`; incluye además un paquete `internal/` separado para rutas administrativas con sus propias dependencias de autorización. **Qué tomo de aquí:** el mecanismo concreto de router — prefijo por dominio, tag por dominio para que la documentación autogenerada quede agrupada, y dependencias de autenticación aplicadas al router completo en vez de a cada handler — es exactamente el patrón que uso en la sección 3.3. La separación público/interno de la sección 3.4 también es una instancia directa de la idea de `internal/` con dependencias propias.

**2. Dos convenciones de organización de carpetas en conflicto entre sí**, ambas comunes en la práctica:

  - **Por tipo técnico** (usada por el generador oficial de proyectos de FastAPI, *Full Stack FastAPI Template*): `app/api/api_v1/endpoints/`, `app/crud/`, `app/models/`, `app/schemas/`, `app/core/` — todas las rutas juntas, todos los modelos juntos, todo el CRUD junto, agrupados por lo que *son* técnicamente.
  - **Por dominio** (documentada como práctica de referencia en repositorios ampliamente adoptados como `fastapi-best-practices`, inspirada en la estructura interna de Netflix Dispatch): un paquete por dominio (`auth/`, `posts/`, etc.), cada uno con su propio `router.py`, `schemas.py`, `models.py`, `service.py`, `dependencies.py` — agrupados por *de qué capacidad de negocio son dueños*.

  Esa misma fuente señala explícitamente el motivo del cambio: dividir por tipo técnico funciona para proyectos pequeños o microservicios de un solo propósito, pero deja de funcionar en monolitos con muchos dominios, porque un cambio de negocio termina tocando carpetas dispersas por todo el proyecto. Es el mismo argumento, con el mismo ejemplo de fondo, que ya usé en la sección 3.2 para justificar el criterio de dominio — la investigación confirma que no es una intuición aislada, sino el motivo documentado por el que equipos con monolitos de varios dominios abandonan la convención "por tipo" del template oficial en favor de la organización por dominio.

**Conclusión para esta propuesta:** adopto la convención de *mecánica de routers* de la documentación oficial (prefix, tags, dependencies por router), pero **no** la convención de *carpetas por tipo técnico* de su generador de proyectos — en su lugar, adopto la organización por dominio, porque Nexova es exactamente el caso (monolito con varios dominios de negocio) que esa comunidad identifica como el punto donde la convención por tipo deja de escalar.

Esta conclusión no compite con la guía del propio template del curso, la refuerza: `README.md` describe `services/` explícitamente como "**one main FastAPI app** (e.g. `api/`) with **routers/modules per domain**" y recomienda "avoid splitting into many microservices early [...] extract a worker only when necessary" (`services/README.md`). Ambas decisiones de esta propuesta —monolito modular (sección 2) y routers organizados por dominio, no por tipo (esta sección)— son la misma indicación del curso, solo que argumentada aquí contra las características concretas de Nexova en vez de citada sin más.

**Fuentes consultadas para esta sección:**

- [Bigger Applications - Multiple Files (FastAPI, documentación oficial)](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — mecánica de `APIRouter`, `prefix`, `tags`, `include_router()` y el paquete `internal/`.
- [Full Stack FastAPI Template (FastAPI, generador oficial de proyectos)](https://fastapi.tiangolo.com/project-generation/) — convención de carpetas por tipo técnico (`api/endpoints`, `crud`, `models`, `schemas`), descartada para esta propuesta.
- [fastapi-best-practices (zhanymkanov, GitHub)](https://github.com/zhanymkanov/fastapi-best-practices) — convención de carpetas por dominio (`router.py`, `schemas.py`, `models.py`, `service.py` por paquete), inspirada en la estructura interna de Netflix Dispatch, y el argumento documentado de por qué la organización por tipo deja de escalar en monolitos con varios dominios.

### 3.2 Criterio de separación: dos ejes, no uno

La estructura combina **dos criterios de separación distintos**, cada uno resolviendo un problema diferente:

- **Eje horizontal — por dominio de negocio (bounded context):** cada carpeta de primer nivel dentro de `services/api/` representa una capacidad de negocio de Nexova (candidatos, selección, soporte, agente), no una categoría técnica. El criterio para trazar esta línea es "¿quién en el negocio es dueño de esta regla?" — quien decide cómo se calcula un score no es quien decide un SLA de ticket, así que van en carpetas distintas aunque ambas sean "lógica de negocio".
- **Eje vertical — por responsabilidad técnica (capas), dentro de cada dominio:** dentro de cada carpeta de dominio, los archivos se separan por el tipo de responsabilidad que cumplen frente al patrón en capas de la sección 1 — `router.py` es la capa de presentación (HTTP), `schemas.py` es el contrato de entrada/salida, `service.py` es la lógica de negocio, `models.py` es la persistencia. El criterio aquí es "¿qué cambia junto y qué cambia por separado?" — el contrato HTTP de un endpoint puede cambiar sin tocar cómo se persiste el dato, y viceversa.

Se descarta agrupar por tipo técnico a nivel de proyecto (una carpeta `routers/` con todas las rutas, otra `models/` con todos los modelos) porque, para un cambio de negocio real —"cambiar cómo se calcula el score de un candidato"— esa organización obliga a tocar cuatro carpetas dispersas en vez de una sola. El criterio de dominio prioriza que el código que cambia junto viva junto.

```
services/api/
├── main.py                    # instancia FastAPI, registro de routers, middlewares
├── core/                      # transversal: config, seguridad, logging, excepciones — no pertenece a ningún dominio
├── db/                        # sesión de base de datos, migraciones — infraestructura, no negocio
├── candidates/                 # alta de candidatos (lo que exige el Hito 1 hoy)
│   ├── router.py / schemas.py / service.py / models.py
├── selection/                  # CV, scoring, ranking, búsqueda de candidatos
│   ├── routers/
│   │   ├── cvs.py               # sub-router público: carga de CV, estado de scoring
│   │   └── candidates.py        # sub-router interno: búsqueda, detalle, ranking
│   ├── schemas.py / service.py / models.py
│   └── scoring/                # subcomponente aislado, candidato a extraerse a worker
├── support/                     # tickets, sentimiento
│   ├── routers/
│   │   ├── chat.py               # sub-router público: mensajes del chatbot
│   │   └── tickets.py            # sub-router interno: CRUD de tickets
│   ├── schemas.py / service.py / models.py
├── agent/                       # orquesta el agente combinado
│   └── router.py / service.py  # sin models.py: no posee datos propios, solo llama a selection.service y support.service
├── realtime/                    # websockets para dashboards — cruza dominios, por eso vive aparte y no dentro de selection/ o support/
│   └── router.py                # sin service.py/models.py propios: solo retransmite eventos que ya calculan selection y support
├── notifications/                # correos de seguimiento
│   └── service.py                # sin router.py: no se llama por HTTP, solo lo invocan otros dominios
└── workers/                      # tareas en background (parsing CV, envíos async)
    └── <tarea>.py                # una función por tarea; mismo criterio que notifications/: infraestructura compartida, sin router propio
```

Esta es la traducción directa a carpetas de las dos decisiones ya tomadas: cada módulo de negocio (`candidates`, `selection`, `support`) repite el mismo patrón en capas de la sección 1 (`router.py` → `service.py` → `models.py`), y los módulos que no son dueños de un dominio de negocio (`agent`, `realtime`, `notifications`, `workers`) se reconocen precisamente porque a alguno de esos archivos le falta sentido — sin datos propios no hay `models.py`, sin exposición HTTP directa no hay `router.py`. La ausencia de un archivo es tan informativa como su presencia.

| Carpeta | Responsabilidad | Por qué es su propio módulo y no parte de otro |
|---|---|---|
| `candidates/` | Alta y datos base del candidato | Es el dueño de las reglas de validación del formulario (Hito 1); otros dominios lo consumen pero no lo modifican |
| `selection/` | CV, scoring, ranking, búsqueda | Concentra la lógica de negocio más sensible (scoring explicable, sección 5) — aislarla facilita auditarla y, si hace falta, extraerla |
| `support/` | Tickets, sentimiento, SLA | Reglas de negocio propias (cálculo de SLA) que no tienen relación con cómo se califica a un candidato |
| `agent/` | Orquestación del agente de IA combinado | No tiene datos propios — su única responsabilidad es coordinar `selection` y `support`; separarlo evita que su lógica de orquestación se mezcle con las reglas de negocio de los dominios que consume |
| `realtime/` | Canales de websocket para dashboards | Sirve tanto a `selection` como a `support`; ponerlo dentro de cualquiera de los dos crearía una dependencia cruzada innecesaria |
| `core/`, `db/` | Configuración, seguridad, sesión de base de datos | Infraestructura transversal sin reglas de negocio — separada explícitamente de los dominios para que no se filtre lógica de negocio dentro de código de arranque |

**Regla de frontera entre dominios:** un módulo solo llama a la capa de servicio de otro módulo, nunca a sus modelos ni a su acceso a datos. Es la regla que hace posible extraer `selection/scoring/` como worker independiente sin tocar `agent/` ni `support/` el día que haga falta, y la consecuencia directa de haber separado por dominio en el eje horizontal.

### 3.3 Endpoints y routers de FastAPI por dominio

**Criterio de agrupación:** cada módulo de dominio expone **un `APIRouter` propio**, registrado en `main.py` con un prefijo `/api/v1/<dominio>` y un tag de OpenAPI igual al nombre del dominio — así la documentación autogenerada queda agrupada exactamente como el código. Dentro de un dominio, cuando hay más de un recurso con **consumidores distintos** (por ejemplo, el candidato que sube su CV frente al consultor que lo busca), ese dominio se divide en **sub-routers por recurso**, no se mezclan en uno solo — el criterio es "¿quién llama a esto y con qué permisos?", el mismo eje público/interno que ya se usa para el resto de la organización.

**Cómo se componen sin ensuciar `main.py`:** un dominio con varios sub-routers (`selection`, `support`) los combina primero en su propio `router.py` — que hace su propio `include_router()` de `routers/cvs.py` y `routers/candidates.py`, por ejemplo — antes de exponer un único router hacia afuera. `main.py` solo ve un `include_router()` por dominio, con su prefijo y su tag; nunca ve sub-routers ni endpoints individuales. Es la misma idea que la documentación oficial usa para su paquete `internal/` (routers anidados que se combinan antes de llegar a la app), aplicada aquí para separar consumidores dentro de un dominio en vez de separar solo administración del resto. El resultado es que `main.py` tiene tantas líneas de registro como dominios existen —hoy una, eventualmente cinco—, nunca una por endpoint.

**`candidates`** (router único; hoy es el único dominio con código real, Hito 1):

| Método | Ruta | Propósito |
|---|---|---|
| `POST` | `/api/v1/candidates` | Alta de candidato desde el formulario público del sitio |
| `GET` | `/api/v1/candidates/{id}` | Consulta de sus propios datos (portal del candidato, con token de acceso propio, no rol interno) |

**`selection`** (dos sub-routers, porque el candidato y el consultor no deben compartir el mismo grupo de endpoints):

| Sub-router | Método | Ruta | Propósito |
|---|---|---|---|
| `cvs` (público, del candidato) | `POST` | `/api/v1/selection/cvs` | Subir CV asociado a un candidato ya registrado |
| `cvs` | `GET` | `/api/v1/selection/cvs/{id}/status` | Consultar el estado del scoring (para el portal del candidato) |
| `candidates` (interno, del consultor) | `GET` | `/api/v1/selection/candidates` | Buscar/filtrar candidatos (sector, idioma, disponibilidad) |
| `candidates` | `GET` | `/api/v1/selection/candidates/{id}` | Detalle de un candidato con su score explicado |
| `candidates` | `GET` | `/api/v1/selection/candidates/ranking` | Ranking ordenado por score para una búsqueda dada |

**`support`** (dos sub-routers, por el mismo criterio: cliente/candidato hablando con el chatbot frente al supervisor gestionando tickets):

| Sub-router | Método | Ruta | Propósito |
|---|---|---|---|
| `chat` (público) | `POST` | `/api/v1/support/chat/messages` | Enviar un mensaje al chatbot y recibir respuesta |
| `tickets` (interno) | `POST` | `/api/v1/support/tickets` | Crear un ticket (manual, o generado desde `chat`/`agent` al escalar) |
| `tickets` | `GET` | `/api/v1/support/tickets` | Listar tickets para el dashboard de supervisor, con filtros de estado/SLA |
| `tickets` | `PATCH` | `/api/v1/support/tickets/{id}` | Actualizar estado o asignación de un ticket |

**`agent`** (un único router; su forma final depende de resolver la ambigüedad de la sección 6.2 sobre quién habla con el agente):

| Método | Ruta | Propósito |
|---|---|---|
| `POST` | `/api/v1/agent/query` | Punto de entrada de la conversación del agente combinado; internamente decide si el caso pertenece a `selection` o `support` y llama a su capa de servicio |

**`realtime`** (fuera del árbol REST, no es un `APIRouter` de HTTP sino de websocket):

| Canal | Propósito |
|---|---|
| `WS /ws/dashboard/selection` | Eventos en vivo para consultores: nuevo candidato, cambio de score, cambio de estado |
| `WS /ws/dashboard/support` | Eventos en vivo para supervisores: nuevo ticket, cambio de SLA, alerta de sentimiento negativo |

### 3.4 Criterios generales que atraviesan todos los routers

- **Versión desde el día uno** (`/api/v1`): la API la van a consumir a la vez el sitio público, el portal de candidatos, el dashboard interno y el agente; sin versión, un cambio de contrato rompe a todos los consumidores simultáneamente.
- **Público vs. interno como eje explícito**, no solo el dominio: las rutas públicas (formulario, carga de CV, chatbot) llevan rate limiting y validación estricta de input porque cualquiera en internet puede llamarlas; las internas (dashboards, búsqueda, gestión de tickets) llevan autenticación y autorización por rol, aplicada como dependencia sobre el grupo de router entero, no repetida en cada handler. Es el mismo criterio que separa los sub-routers dentro de `selection` y `support`.
- **Tiempo real fuera del árbol REST** (`/ws/...`): el ciclo de vida de una conexión persistente (auth al conectar, no por mensaje) es distinto al de una request HTTP y mezclarlos genera ambigüedad sobre qué contrato aplica.

---

## 4. Cómo se organiza la separación entre frontend y backend

Nexova ya tiene frontend (`uis/`) y backend (`services/`) como sistemas separados dentro del mismo monorepo. Esta sección documenta las convenciones estándar para ese tipo de separación —repositorios, comunicación por API, variables de entorno, CORS— y cómo se aplican aquí.

### 4.1 Monorepo vs. repositorios separados

En 2026 la tendencia dominante ya no es elegir un extremo, sino un modelo híbrido: monorepo para superficies de producto que cambian juntas (frontend, tipos compartidos, backend que las sirve), y repositorios separados solo cuando un equipo necesita aislamiento fuerte, versionado independiente o stacks muy distintos. El criterio que reportan los equipos que ya pasaron por esta decisión es simple: si los cambios cruzan la frontera frontend/backend con frecuencia, el monorepo se amortiza rápido; si no, coordinarlo cuesta más de lo que aporta.

Aplicado a Nexova, mantener `uis/` y `services/` en el mismo monorepo (la estructura ya existente) encaja porque:

- El equipo es el mismo grupo pequeño trabajando en ambos lados — no hay equipos separados que necesiten desacoplarse.
- `packages/shared` (`@repo/shared-types`) ya existe para tipos compartidos entre frontend y backend; separarlos en repos distintos rompería esa reutilización o exigiría publicarlo como paquete versionado externo, complejidad que no se justifica todavía.
- Los cambios de contrato (nuevo campo en el formulario, nuevo estado de candidato) cruzan la frontera frontend/backend constantemente en la fase actual del proyecto — exactamente el caso en el que un monorepo compensa.

Importante: monorepo es una decisión de **organización de código**, no de despliegue — `uis/website`, `uis/backoffice` y `services/api` siguen desplegándose como artefactos independientes aunque vivan en el mismo repositorio.

### 4.2 Comunicación por API

Frontend y backend se comunican exclusivamente por la API REST versionada de la sección 3 (`/api/v1/...`); el frontend nunca accede directamente a la base de datos ni comparte proceso con el backend. FastAPI genera automáticamente un esquema OpenAPI a partir de los routers y `schemas.py` de cada dominio — ese esquema es el contrato formal entre ambos lados y la fuente para mantener sincronizados los tipos de `packages/shared`, en vez de mantenerlos a mano en dos sitios.

Para el dashboard interno, que combina datos de varios dominios (`selection` + `support`) en una sola vista, se deja anotado el patrón *Backend-for-Frontend* como opción: en vez de que el backoffice haga varias llamadas y las combine en el cliente, un endpoint de agregación puede componer la respuesta del lado del servidor. No se adopta como servicio aparte —sería optimización prematura, sección 2— pero queda como extensión posible dentro del propio monolito si el número de llamadas por vista crece.

### 4.3 Variables de entorno

Backend y frontend gestionan variables de entorno por separado, cada uno con su propio `.env`, por una razón de seguridad y no solo de organización: el código del frontend se entrega al navegador del usuario, así que cualquier variable "horneada" en su build es pública, la haya marcado así o no quien la definió.

- **Backend (`services/api/.env`):** credenciales de base de datos, API keys de IA y secretos de autenticación se leen en tiempo de ejecución desde un servidor que controlamos, nunca se compilan en un artefacto que salga de ese servidor. Rotar una credencial no debería exigir un rebuild.
- **Frontend (`uis/website/.env`, `uis/backoffice/.env`):** solo variables explícitamente marcadas como públicas (ej. la URL base de la API) llegan al bundle del navegador; cualquier variable sin esa marca se trata como secreta y no se referencia desde código de cliente. Si el frontend se construye con un framework que "hornea" variables en build time mediante un prefijo reservado para lo público (convención común en varios frameworks de frontend), la regla es la misma — todo lo que lleve ese prefijo se asume público de forma permanente.
- Ningún `.env` se commitea; cada app documenta sus variables requeridas en un `.env.example`.

### 4.4 CORS

Solo el backend configura CORS, porque es quien recibe peticiones cross-origin desde los frontends. Dos reglas evitan los errores más comunes en configuraciones de FastAPI:

- **Nunca `allow_origins=["*"]` junto con `allow_credentials=True`.** Esa combinación no es válida y el propio middleware la rechaza en tiempo de request; como los dashboards internos necesitan enviar credenciales de sesión, la API nunca puede usar wildcard.
- **Lista explícita de orígenes, gestionada por entorno** (`ALLOWED_ORIGINS` en el `.env` del backend, no hardcodeada): en desarrollo incluye los `localhost` de `uis/website` y `uis/backoffice`; en producción, solo los dominios reales de Nexova. Una validación en el arranque debe impedir que `localhost` quede en la lista de un despliegue de producción por descuido.
- El middleware de CORS se registra antes que cualquier otro middleware que valide la request — si se registra después, las respuestas de error de otros middlewares pueden salir sin cabeceras CORS y el navegador las descarta igual, ocultando el error real.

**Fuentes consultadas para esta sección:**

- [Monorepo vs Polyrepo in 2026 (projectsupply.in)](https://projectsupply.in/blog/monorepo-vs-polyrepo-2026) y [JavaScript Monorepos for Frontend Teams (Growin)](https://www.growin.com/blog/javascript-monorepos-frontend/) — tendencia hacia modelos híbridos y el criterio de frecuencia de cambios cruzando la frontera frontend/backend, usado en 4.1.
- [CORS (Cross-Origin Resource Sharing) - FastAPI, documentación oficial](https://fastapi.tiangolo.com/tutorial/cors/) y [Configure FastAPI CORS for Production APIs](https://adhdecode.com/articles/fastapi/fastapi-cors-configuration-production/) — las reglas de 4.4 (incompatibilidad de wildcard con credenciales, orígenes explícitos por entorno, orden del middleware).
- [Next.js Environment Variables: The Complete Guide](https://dev.to/stacknotice/nextjs-environment-variables-the-complete-guide-2026-1f05) — el mecanismo general de variables "horneadas" en build time frente a leídas en runtime, usado en 4.3 sin atarlo a un framework concreto.

---

## 5. Decisiones técnicas iniciales

Estas son decisiones que se toman ya, con su justificación — no se difieren a "ya se verá":

| Decisión | Elección | Por qué |
|---|---|---|
| **Framework** | FastAPI | Ya es la convención del repo; además su tipado + Pydantic encaja directamente con la validación estricta que exige el formulario de candidatos (`CONTEXT.md`), y su soporte async es necesario para IA y websockets sin bloquear el proceso |
| **Base de datos** | Un único motor de base de datos relacional para todos los dominios | Candidatos, CVs, scores y tickets tienen relaciones entre sí (integridad referencial real); mantener un solo motor reduce la carga operativa de un equipo pequeño frente a usar una base distinta por dominio |
| **Búsqueda semántica (RAG del chatbot, matching de CV)** | Capacidad de búsqueda vectorial sobre el mismo motor de base de datos, no un vector store aparte | Evita introducir una segunda pieza de infraestructura antes de tener volumen que la justifique; se puede migrar a un vector store dedicado después si hace falta, sin tocar el resto del esquema |
| **Almacenamiento de CVs** | Almacenamiento de objetos dedicado, fuera de la base de datos relacional | Mantiene la base de datos liviana y permite escaneo/validación de archivos como paso independiente antes de servirlos |
| **Tareas en background** | Cola de tareas ligera con un worker separado desde el primer endpoint que suba un CV, no `BackgroundTasks` en el mismo proceso | El parsing/scoring puede tardar; si corre en el mismo worker que atiende HTTP, un pico de cargas degrada la latencia de *toda* la API. Esto no contradice la indicación del curso de "extraer un worker solo cuando sea necesario" (`services/README.md`) — la aplica: el propio README pone como ejemplo de servicio separado un `data-processor-worker`, y el parsing de CV con IA es ese mismo caso desde el primer endpoint, no una anticipación especulativa |
| **Tiempo real** | WebSockets con un canal de pub/sub externo como mecanismo de broadcast desde el inicio, aunque hoy corra una sola instancia | El estado de conexiones en memoria de un solo proceso deja de funcionar en cuanto haya más de una instancia (necesario para cualquier despliegue con redundancia); resolverlo desde el primer dashboard evita una reescritura posterior |
| **Autenticación interna** | Token de sesión con un campo de rol (consultor / supervisor / admin) sobre un único modelo de usuario interno | No hay hoy necesidad de un proveedor de identidad externo; un modelo de roles simple cubre la diferencia de permisos entre dashboards de selección y de soporte |
| **Scoring de candidatos** | El endpoint de scoring devuelve puntaje **y razones explicables**; ninguna ruta ejecuta descarte automático de un candidato | Restricción de arquitectura, no de producto: dejar el descarte fuera del alcance técnico del módulo evita que se implemente por accidente una decisión de alto riesgo legal (ver 6.1) |

---

## 6. Riesgos y puntos de confusión anticipados

### 6.1 Riesgos técnicos y legales

- **Datos personales y cumplimiento.** Nexova opera en España (GDPR) y Miami (transferencia entre jurisdicciones); se van a almacenar CVs, teléfonos y, si el scoring usa IA, inferencias sobre idoneidad de la persona. Falta definir retención/borrado y qué consentimiento cubre qué uso — el checkbox actual del formulario cubre el registro, no necesariamente el uso del CV para scoring automatizado.
- **Scoring automatizado como decisión de alto riesgo.** Rankear candidatos sin humano en el circuito es un riesgo legal y reputacional (sesgo, falta de explicabilidad; en la UE el scoring de empleo es "alto riesgo" bajo el AI Act). Ya mitigado a nivel de diseño en la sección 5 (score explicable, sin descarte automático), pero requiere que el flujo de producto respete esa restricción.
- **IA conversacional sin control de alcance.** El chatbot y el agente combinado pueden alucinar o gestionar mal un cliente insatisfecho detectado por sentimiento. Se necesita una ruta de escalado obligatoria a un ticket humano cuando el sentimiento cruza un umbral, y respuestas ancladas a una base de conocimiento acotada (RAG), no generación libre.
- **Acoplamiento entre scoring pesado y disponibilidad de la API**, si no se respeta la frontera de la sección 3.2/5 desde el primer endpoint de carga de CV.
- **Ambición del alcance vs. capacidad del equipo.** Lo declarado (scoring con IA, portal en tiempo real, chatbot, tickets con SLA, agente combinado) es mucho mayor que el Hito 1 actual (sitio + captura de leads). Mitigado por construir `candidates/` primero y el resto por hitos, pero es un riesgo de calendario, no solo técnico.

### 6.2 Puntos de confusión que hay que resolver con el negocio antes de construir (no son decisiones técnicas)

- **¿Quién usa el agente de IA?** `company-choice.md` no deja claro si el candidato/cliente habla directamente con el agente, o si es un copiloto interno para consultores/supervisores. La respuesta cambia por completo si `agent/` expone rutas públicas o solo internas — es una decisión de producto que bloquea el diseño de esa superficie de rutas.
- **¿"Consultor" y "supervisor" son el mismo portal con permisos distintos, o dos aplicaciones separadas?** Afecta si `selection` y `support` comparten un único dashboard interno o dos, y por tanto cuántos canales de websocket y esquemas de rol hacen falta.
- **Definición operativa de "estado en tiempo real" del candidato.** Sin una lista cerrada de estados y qué evento dispara cada transición, el módulo `selection` no puede definir su modelo de datos ni el contrato de `realtime/`.
- **Definición de SLA de tickets**, incluida la diferencia horaria entre la oficina de Valencia y la de Miami — sin esto, `support.service` no puede calcular cuándo un ticket está en riesgo de incumplimiento.
- **Alcance de idioma del agente/chatbot.** `CONTEXT.md` deja el multiidioma como opcional para el sitio, pero no dice si la base de conocimiento del chatbot y el scoring de CVs deben operar en español, inglés, o ambos — afecta directamente el diseño de la búsqueda semántica del RAG.

### 6.3 Qué puede salir mal si el equipo no sigue esta estructura

Esta estructura no es una preferencia estética; cada desviación tiene un costo concreto y rastreable hasta un riesgo ya identificado arriba:

- **Saltarse la regla de frontera entre dominios (sección 3.2)**, por ejemplo si `agent/` importa directamente `selection.models` en vez de `selection.service` "porque es más rápido". El acoplamiento queda oculto: un cambio en el esquema de datos de `selection` rompe `agent` sin que nada en el código de `agent` lo anuncie. El día que haga falta extraer `selection/scoring` como worker (sección 2, el motivo por el que se eligió monolito modular y no monolito plano), esa extracción deja de ser limpia — hay que auditar todo el proyecto buscando accesos directos, exactamente el costo operativo que esta estructura estaba diseñada para evitar.
- **Mezclar capas dentro de un dominio (sección 3.2)**, por ejemplo escribiendo el cálculo de score o la validación de SLA directamente en `router.py` en lugar de `service.py`. Se pierde la razón de fondo por la que se eligió arquitectura en capas frente a MVC o serverless en la sección 1: poder testear la lógica de negocio sin levantar un cliente HTTP ni una base de datos. En la práctica, esas pruebas dejan de escribirse, y un cambio de scoring se descubre roto en producción — lo que vuelve más probable, no menos, el riesgo legal de scoring sin explicabilidad verificada de 6.1.
- **Omitir la separación público/interno en un router (sección 3.4)**, por ejemplo copiando el router de `candidates` (público) como base para un endpoint de `selection/candidates` (búsqueda interna) y olvidando añadir la dependencia de autenticación por rol. El resultado no es un bug cosmético: expone datos personales de candidatos a cualquiera en internet, materializando directamente el riesgo de cumplimiento de datos de 6.1.
- **No respetar la separación de variables de entorno (sección 4.3)**, por ejemplo marcando como pública una API key de IA para que el frontend la lea directamente en vez de pasar por el backend. Una vez compilada en el bundle del navegador, esa clave queda expuesta de forma permanente — rotarla es la única mitigación posible, no hay forma de "retirarla" del código ya distribuido.

---

## 7. Próximo paso

Antes de escribir el primer endpoint, resolver los puntos de la sección 6.2 con el stakeholder correspondiente (Carmen Ruiz u otro según el dominio): son ambigüedades de producto, no de arquitectura, pero determinan detalles del modelo de datos de `candidates/` y `support/` que sí son costosos de cambiar una vez construidos.
