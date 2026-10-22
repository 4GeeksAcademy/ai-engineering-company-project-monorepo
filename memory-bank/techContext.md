# Contexto técnico — Nexova Solutions

> Guía para futuros agentes de desarrollo. Diferencia el estado descrito para Nexova, lo que existe realmente en este repositorio y las convenciones del template. Las relaciones entre necesidades y módulos son orientativas, no una arquitectura implementada. Para los hechos empresariales y requisitos funcionales, consultar también [`projectbrief.md`](./projectbrief.md) y `CONTEXT.md`.

## 1. Estado técnico actual de Nexova

El briefing describe un stack empresarial heredado y desconectado:

- **HubSpot:** CRM existente, utilizado irregularmente por Ventas.
- **Zendesk legacy:** helpdesk mencionado en el stack tecnológico.
- **ATS interno:** sistema de seguimiento de candidatos construido a medida a principios de los años 2010.
- **Google Workspace:** herramienta de uso transversal; incluye Google Forms y Drive según los procesos descritos.
- También se mencionan hojas de cálculo y un documento Word compartido en Drive como soportes de gestión y conocimiento.

El contexto caracteriza estos sistemas como herramientas que no se han conectado adecuadamente. No especifica versiones, APIs, bases de datos, topología, proveedores de hosting ni integraciones disponibles. Estas herramientas forman parte del contexto empresarial; su configuración técnica no está representada por código de integración en el monorepo revisado.

## 2. Integración, logging y telemetría

Según `CONTEXT.md`, los sistemas de Nexova están desconectados; no hay telemetría ni logging centralizado, y Tecnología suele enterarse de fallos por los usuarios. Los despliegues actuales se describen como manuales. La dirección carece de una vista unificada y recibe información atrasada.

Son **necesidades futuras** la centralización de telemetría y registros, un pipeline de datos que alimente dashboards, monitorización en tiempo real y alertas automáticas. No hay en este documento evidencia de que ya exista una solución de observabilidad, un pipeline corporativo o una estrategia de integración.

## 3. Estructura real del monorepo

El repositorio es una plantilla transversal con documentación y directorios organizados por responsabilidad. El árbol relevante observado incluye:

```text
.
├── README.md / README.es.md
├── CONTEXT.md / CONTEXT.es.md
├── company-choice.md
├── memory-bank/
│   └── projectbrief.md
├── uis/
│   └── README.md / README.es.md
├── services/
│   └── README.md / README.es.md
├── data/
│   ├── raw/       # README bilingüe
│   ├── pipelines/ # README bilingüe
│   ├── process/   # README bilingüe
│   └── eval/      # README bilingüe
├── agents/
│   ├── _template/ # documentación, agent.py y guía de tests
│   └── tools/     # documentación
├── workflows/     # README bilingüe
├── skills/
│   ├── _template/
│   ├── code-review/
│   ├── data-analysis/
│   └── research/
├── packages/
│   └── shared/    # package.json y types/index.ts
├── shared/
├── mcps/
├── docs/
├── infra/
├── scripts/
└── internal/
```

Los directorios `uis/` y `services/` contienen actualmente solo documentación de nivel de carpeta; no hay subcarpetas `website/`, `backoffice/` ni `api/` en ellos. La estructura real no equivale a la estructura ilustrativa completa del README: por ejemplo, existe `memory-bank/`, que no forma parte del árbol ilustrativo de la plantilla, y en la raíz observada no aparece `docker-compose.yml`.

El repo contiene algunos artefactos de plantilla (como `agents/_template/agent.py`), documentación y recursos de skills; eso no significa que las soluciones funcionales de Nexova estén implementadas.

## 4. Ubicación futura de interfaces y backend

Según las guías:

- **`uis/website/`**: futura presencia web pública de Nexova. La guía de `uis/` reconoce `website` como uno de los proyectos principales, pero no fija framework, comandos ni estructura interna.
- **`uis/backoffice/`**: futura aplicación interna. La guía propone usarla para agrupar capacidades de administración, personas, operaciones y comunicación. No existe hoy en el árbol inspeccionado.
- **`services/`**: contiene servicios backend. La guía local indica que cada subcarpeta debe corresponder a un servicio concreto e incluir documentación funcional y técnica. El README principal recomienda una API empresarial FastAPI central (por ejemplo, `services/api/`) y reservar workers separados para casos que lo necesiten.

Estas son ubicaciones y convenciones, no aplicaciones construidas ni decisiones sobre el stack frontend. Este milestone **no requiere construir aplicaciones Next.js ni servicios**. No instalar dependencias ni crear esas aplicaciones como parte de esta tarea.

## 5. Responsabilidad de otras carpetas del template

- **`data/`**: datos fuente sin modificar (`raw/`), pipelines de ingesta/transformación (`pipelines/`), salidas limpias o intermedias (`process/`) y conjuntos de evaluación/métricas (`eval/`). El flujo recomendado es `raw → pipelines → process`, consumido por servicios, interfaces o agentes.
- **`agents/`**: asistentes autónomos o semiautónomos; un subdirectorio por agente con configuración, prompts, conexión de herramientas y tests. Existe `_template/` como punto de partida, no un agente funcional de Nexova.
- **`workflows/`**: automatización y orquestación (por ejemplo, n8n, jobs programados, webhooks, notificaciones y sincronizaciones). La guía pide documentar triggers, entradas/salidas, credenciales, pasos y manejo de errores.
- **`skills/`**: capacidades/instrucciones reutilizables para agentes y trabajo del equipo, organizadas como carpetas con `SKILL.md` y recursos/scripts opcionales. Hay recursos de ejemplo en el repo; su presencia no acredita automatizaciones de negocio desplegadas.
- **`packages/`**: librerías reutilizables por varias partes del monorepo. Existe `packages/shared/` con metadata de `@repo/shared-types` y `types/index.ts`; el README dice que no hay runner de workspace configurado en la raíz.

## 6. Decisiones arquitectónicas y restricciones documentadas

### Convenciones existentes del template

- Un monorepo para una compañía a través de varios hitos y carpetas con responsabilidades separadas.
- UI en `uis/`; API/servicio o ejecución backend en `services/`; datos y transformaciones en `data/`; agente con objetivo en `agents/`.
- El README recomienda una **API centralizada FastAPI** para mantener baja la complejidad inicial y evitar microservicios tempranos. Es una recomendación del template, no evidencia de una API creada.
- Un worker debe separarse de la API solo si realmente necesita ejecutarse independientemente.
- Los tipos usados por más de un proyecto pueden extraerse a `packages/`; recursos pequeños no empaquetables corresponden a `shared/`.
- Cada app, servicio, agente o pipeline que se añada debe documentarse con un README propio, conforme a la guía general.

### Límites y restricciones

- No inferir versiones, integraciones, endpoints, datos disponibles, infraestructura o despliegues a partir de nombres de herramientas.
- No presentar futuras necesidades del briefing como funciones implementadas.
- No adoptar Next.js ni otro framework frontend como requisito: la guía de `uis/` no lo determina.
- No hay `docker-compose.yml` presente en la raíz observada, aunque el README lo describe como lugar previsto para orquestación local.
- No hay runner de workspace raíz descrito por README ni visible en el inventario actual.
- La documentación empresarial no detalla requisitos de seguridad, privacidad, acceso, retención, cumplimiento normativo ni aprobación humana. Deben aclararse antes de desarrollar con datos de candidatos, alumnos, clientes o empleados.

## 7. Tecnología documentada o configurada y aspectos pendientes

### Documentada en guías o archivos del repo

- **FastAPI:** recomendado en el README principal para un backend centralizado; no hay implementación de API en `services/`.
- **TypeScript:** el paquete compartido define `@repo/shared-types`; hay un archivo `types/index.ts`.
- **n8n:** se menciona como ejemplo de herramienta de workflows, no como instalación o despliegue existente.
- **Python y Node.js:** `.devcontainer/devcontainer.json` declara features para Python 3.12 y Node 22; también declara JupyterLab, Docker CLI e instalaciones/herramientas de GitHub CLI, además de extensiones de VS Code. Es configuración del entorno devcontainer; no confirma por sí sola qué runtimes o paquetes están instalados en el entorno actual.
- El `postCreateCommand` del devcontainer contempla habilitar Corepack/preparar pnpm e instalar/actualizar `pip` y `uv`; los comandos de instalación de dependencias del proyecto son condicionales a encontrar `package.json` o `pyproject.toml` en la raíz. No se ejecutaron ni verificaron como parte de esta documentación.

### Pendiente o no verificado

- Framework de `uis/website` y `uis/backoffice`, dependencias y comandos de ejecución.
- Implementación, esquema, autenticación, almacenamiento, integraciones y endpoints de la API.
- Paquetes reales de ejecución de agentes, servicios o workflows; credenciales y conectores a HubSpot, Zendesk, ATS o Google Workspace.
- Sistema de bases de datos, búsqueda vectorial, proveedor/modelo de IA, observabilidad, despliegue y CI/CD.
- Scripts generales de test, lint o build y sus resultados: no se identifican comandos raíz documentados en el README ni aplicaciones actuales de `uis/` o `services/` a las que aplicarlos.

## 8. Necesidades empresariales y posibles módulos futuros

Las relaciones siguientes enlazan `projectbrief.md` con las responsabilidades del template. Son **posibles ubicaciones funcionales**, no compromisos de arquitectura ni módulos implementados.

| Necesidad Nexova                                                      | Posibles módulos y relación con datos                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoring, ranking explicable y búsqueda RAG de candidatos              | Datos de CVs y vacantes: `data/`; herramientas/modelo: `agents/`; API: `services/`; interfaz operativa y visibilidad de candidatos: `uis/backoffice/`. El ATS está mencionado como fuente actual, pero no se conocen su esquema ni interfaces de integración.                           |
| Catálogo, recomendación, inscripción y progreso de formación          | PDF, Google Forms, hojas de cálculo y listas de asistencia como fuentes mencionadas; posible preparación en `data/`, API en `services/`, experiencia de catálogo/portal en `uis/`, agente de asesoramiento en `agents/`; sincronizaciones futuras podrían documentarse en `workflows/`. |
| Chatbot RAG, base de conocimiento, sentimiento y dashboard de soporte | Documento Word en Drive e incidencias por teléfono/email/chat son fuentes descritas; futuro tratamiento/evaluación en `data/`, agente en `agents/`, API en `services/` y vista de supervisión en `uis/backoffice/`. La conexión con Zendesk no está definida.                           |
| Pipeline comercial, secuencias y sugerencias de propuesta             | HubSpot, listas de Excel, LinkedIn y email son sistemas/canales mencionados; futura UI en `uis/backoffice/`, API/integraciones en `services/`, automatizaciones en `workflows/` y agente de sugerencias en `agents/`. Disponibilidad y permisos de integración están pendientes.        |
| Portal y asistente de RRHH; KPIs y onboarding                         | Solicitudes por email/hojas, formularios y datos internos son fuentes mencionadas; posibles datos/pipelines en `data/`, interfaz en `uis/backoffice/`, backend en `services/`, workflow de checklist y agente de políticas en `workflows/`/`agents/`.                                   |
| Métricas web, pipeline de contenido y dashboard ejecutivo             | Posibles interfaces en `uis/`, API e ingesta en `services/` y `data/`, y automatización de informes en `workflows/`. No se especifican sistemas de analítica ni formato de los datos ejecutivos estructurados.                                                                          |
| Telemetría, logging y agente de ingeniería interna                    | La necesidad de observabilidad y documentación técnica se declara en el briefing. Futuras piezas podrían distribuirse entre `services/`, `data/`, `uis/backoffice/` y `agents/`; no hay stack de observabilidad seleccionado.                                                           |

Cuando tipos compartidos entre UI y API sean necesarios, el README sugiere evaluarlos para `packages/`. No se debe crear un paquete por anticipado sin un consumidor compartido.

## 9. Validaciones disponibles actualmente

- Las guías del repositorio describen `data/eval/` para conjuntos golden, evaluación de RAG/agentes y métricas de experimentos. La carpeta existe, pero la inspección estructural indica que contiene READMEs; no se encontró un conjunto de evaluación de Nexova.
- `agents/_template/` incluye documentación y un directorio de tests con README; no se identificaron pruebas funcionales de agentes Nexova.
- Existe `skills/data-analysis/scripts/pandas_clean.py` y documentación de métricas como recursos reutilizables; no constituyen por sí solos una suite de validación del sistema Nexova.
- No se hallaron aplicaciones en `uis/` ni servicios en `services/` para ejecutar pruebas de integración/end-to-end, ni configuración raíz de scripts de lint/build/test en la inspección realizada.
- El README recomienda documentar cada incorporación y usar `data/eval/` para medir calidad; no documenta un pipeline CI ni una orden de validación que se haya ejecutado aquí.

Por tanto, las validaciones posibles en esta etapa son revisar consistencia documental y estructura del repositorio. Cualquier test de producto, despliegue, ejecución de aplicación o integración con sistemas empresariales queda pendiente de una implementación y de instrucciones explícitas.
