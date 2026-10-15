# Project Brief — Nexova Solutions

> Documento de contexto para futuros agentes de desarrollo. Los hechos empresariales de este brief proceden exclusivamente de `CONTEXT.md`. El propósito y la organización del monorepo se resumen de `README.md`. Las relaciones con módulos futuros se presentan como orientación derivada de las necesidades, no como sistemas existentes ni como arquitectura aprobada.

## 1. Descripción empresarial

Nexova Solutions es una consultora de recursos humanos y selección de talento fundada en 2011, con sede en Valencia, España, y una oficina de expansión en Miami, Florida. El briefing declara 120 empleados e ingresos anuales aproximados de USD 8 millones. Atiende principalmente a empresas medianas de tecnología, retail y servicios financieros.

## 2. Líneas de negocio

1. **Headhunting:** selección de perfiles de mandos medios y directivos.
2. **Outsourcing de soporte al cliente:** equipos de atención para empresas tecnológicas, retail y finanzas.
3. **Formación corporativa:** programas sobre habilidades blandas, liderazgo, comunicación y gestión de equipos.

## 3. Problema principal

La operación depende en gran medida de tareas manuales, herramientas que no están conectadas adecuadamente y datos con poca disponibilidad o visibilidad operativa. Entre las consecuencias descritas están el trabajo manual de los consultores, la falta de visibilidad para clientes y supervisores, el incumplimiento del SLA de soporte y la toma de decisiones ejecutivas con información atrasada.

El README presenta este repositorio como una plantilla transversal para construir los proyectos de una misma empresa por hitos. Recomienda separar responsabilidades por carpetas: interfaces en `uis/`, APIs y procesos backend en `services/`, datos y transformaciones en `data/`, agentes en `agents/` y documentación transversal en `docs/`.

## 4. Departamentos, responsables y usuarios

| Departamento                     | Responsable según `CONTEXT.md`                                                                        | Usuarios/equipo mencionados                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Dirección Ejecutiva              | Laura Mendoza, CEO                                                                                    | Laura y responsables de área; cada responsable prepara un informe semanal. No se indica el tamaño total del equipo directivo. |
| Operaciones de Selección         | Javier Almeida                                                                                        | 40 consultores; también interactúan clientes que solicitan el estado de sus procesos.                                         |
| Formación Corporativa            | Elena Vargas                                                                                          | 12 personas; clientes y alumnos aparecen como usuarios de las soluciones que se necesitan, sin cantidades indicadas.          |
| Soporte al Cliente Externalizado | Roberto Díaz                                                                                          | 30 agentes y supervisores; atienden incidencias en nombre de clientes.                                                        |
| Ventas y Desarrollo de Negocio   | Discrepancia: Megan Clarke en la descripción organizativa y Marcos Ibáñez en la sección departamental | 18 personas: la sección de necesidades desglosa 6 account managers y 12 SDRs.                                                 |
| Marketing y Comunicación         | Carmen Ruiz                                                                                           | Equipo descrito como pequeño, sin cantidad especificada. Gestiona web, LinkedIn, newsletter y blog.                           |
| Recursos Humanos interno         | Patricia Solís                                                                                        | Equipo de 4; da servicio a los 120 empleados de Nexova.                                                                       |
| Tecnología e Infraestructura     | Sergio Molina, CTO                                                                                    | Equipo de 6.                                                                                                                  |

## 5. Problemas concretos por área

- **Operaciones de Selección:** cribado manual de CVs; comunicaciones individuales sin plantillas; falta de estado en tiempo real; matching dependiente de la intuición del consultor. Los clientes llaman para consultar avances.
- **Formación Corporativa:** catálogo en PDF que se actualiza trimestralmente; inscripciones por Google Form y gestión en hojas de cálculo; seguimiento de finalización mediante listas de asistencia en Excel; propuestas no personalizadas.
- **Soporte externalizado:** incidencias por teléfono, email y chat web; no hay base de conocimiento centralizada ni visibilidad del backlog; los agentes recurren a su experiencia y a un documento Word en Drive. El tiempo de resolución descrito excede el SLA.
- **Ventas y Desarrollo de Negocio:** prospección manual en LinkedIn, listas en Excel y seguimiento por email sin automatización; uso irregular del CRM y deals perdidos por falta de seguimiento. No hay visibilidad sobre la probabilidad de cierre.
- **Marketing y Comunicación:** web construida en 2019, descrita como lenta, no accesible y desalineada con el posicionamiento actual; contenido manual y conocimiento limitado de conversiones.
- **Recursos Humanos interno:** vacaciones, ausencias y consultas por email y hojas de cálculo; onboarding manual; evaluaciones semestrales mediante Google Forms sin revisión sistemática; no hay seguimiento de rotación, absentismo ni tiempo de cobertura de vacantes internas.
- **Tecnología e Infraestructura:** herramientas desconectadas; ausencia de telemetría y logging centralizados; fallos conocidos a través de usuarios y despliegues manuales.
- **Dirección Ejecutiva:** informes PDF semanales elaborados manualmente por responsables; no existe visión unificada y los datos llegan con retraso.

## 6. Objetivos de IA y otras necesidades futuras

El briefing expresa estas necesidades como objetivos; no afirma que estén construidas o desplegadas:

- **Selección:** scoring y ranking automático y explicable de CVs, búsqueda RAG sobre la base de candidatos, portal con estado actualizado y comunicación automatizada de seguimiento.
- **Formación:** catálogo buscable e inscripción online, recomendación de programas según perfil, seguimiento de progreso del alumno y chatbot que construya planes personalizados.
- **Soporte:** chatbot de primera línea con RAG, búsqueda semántica de conocimiento, análisis de sentimiento de tickets y dashboard operativo.
- **Ventas:** dashboard de pipeline, secuencias de prospección, alertas por conversaciones inactivas y agente que sugiera un ángulo de propuesta.
- **RRHH:** portal interno, onboarding con checklists progresivos, dashboard de indicadores y agente que responda preguntas sobre políticas y beneficios.
- **Marketing:** rediseño web, optimización SEO/GEO y marcado schema.org, pipeline de contenido asistido por IA y métricas de tráfico, fuentes y conversión.
- **Tecnología:** telemetría y logging centralizados, pipeline de datos, monitorización y alertas, agente interno que consulte documentación técnica.
- **Dirección:** dashboard unificado, informe semanal automático, alertas por umbrales y asistente de consulta en lenguaje natural.

## 7. Indicadores actuales y metas futuras

### Indicadores y condiciones actuales descritos

- **Empresa:** 120 empleados e ingresos aproximados de USD 8 millones anuales.
- **Selección:** 40 consultores; cada proceso puede implicar la revisión manual de 30–80 CVs.
- **Ventas:** el 40% del equipo actualiza HubSpot con regularidad, según la sección de Ventas. El equipo se describe como de 18 personas; la sección departamental especifica 6 account managers y 12 SDRs.
- **Soporte:** tiempo medio de resolución de 48 horas frente a SLA comprometido de 24 horas.
- **RRHH:** evaluaciones de desempeño dos veces al año; el briefing indica que no se siguen sistemáticamente rotación, absentismo ni tiempo de cobertura de vacantes internas.
- **Dirección:** preparación de informes de 4–8 horas por manager, según el texto; los informes son semanales y los datos llegan con varios días de antigüedad.

Estas cifras son las declaradas en el briefing; no se especifican método, periodo de observación ni fuente de medición para todas ellas.

### Metas futuras explicitadas

- Automatizar el **40% de las consultas de soporte sin intervención humana** mediante el chatbot propuesto.
- Mejorar la visibilidad del estado operativo y ofrecer dashboards descritos como “en tiempo real” en varias áreas.
- Automatizar tareas de selección, prospección, onboarding e informes, sin que el briefing establezca porcentajes, fechas objetivo o criterios de aceptación adicionales.

La meta del 40% es un objetivo, no un resultado actual. No se proporcionan metas numéricas de conversión, reducción del tiempo de resolución, calidad de ranking, adopción ni ahorro de horas.

## 8. Relación entre necesidades, datos y módulos futuros

La tabla es una **propuesta de organización funcional**, inferida del briefing y de las responsabilidades del monorepo. Los módulos son posibilidades futuras, no módulos existentes ni una arquitectura aprobada.

| Necesidad                                       | Datos o fuentes mencionados en el briefing                                                                                                                             | Posible módulo futuro en el monorepo                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoring, ranking y búsqueda de candidatos       | CVs, requisitos/perfil solicitado por cliente y base de datos de candidatos mencionada en los objetivos                                                                | Interfaz operativa en `uis/backoffice/`; lógica API en `services/`; ingestión/normalización y evaluación en `data/`; asistencia IA en `agents/`.                                      |
| Catálogo, recomendación y seguimiento formativo | PDF del catálogo, Google Forms, hojas de cálculo y listas de asistencia en Excel                                                                                       | Catálogo/portal en `uis/`; API en `services/`; datos y transformación en `data/`; recomendador o chatbot como agente si se implementa.                                                |
| Soporte automatizado y visibilidad del servicio | Incidencias por teléfono, email y chat web; documento Word compartido en Drive; datos de resolución/SLA/backlog que el briefing indica que necesitan mayor visibilidad | API y funciones de soporte en `services/`; UI de agentes/supervisores en `uis/backoffice/`; conocimiento y evaluación en `data/`; asistente en `agents/`.                             |
| Pipeline y seguimiento comercial                | HubSpot, listas exportadas a Excel, LinkedIn y email                                                                                                                   | Panel y operación en `uis/backoffice/`; integraciones/API en `services/`; agente de sugerencias en `agents/`. Los datos disponibles y permisos de integración no están especificados. |
| KPIs de RRHH                                    | Solicitudes por email y hojas de cálculo; onboarding; Google Forms y registros de desempeño                                                                            | Portal y dashboard en `uis/backoffice/`; API en `services/`; pipelines en `data/`; agente de políticas en `agents/`, si se desarrolla.                                                |
| Métricas de marketing y dirección               | Datos de visitas y fuentes mencionados; informes PDF semanales; el briefing no especifica sistemas de analítica ni formato de los demás datos ejecutivos               | Interfaces en `uis/`; API central propuesta por las convenciones del README en `services/`; ingesta/transformación en `data/`.                                                        |
| Telemetría y conocimiento técnico               | El briefing señala ausencia de telemetría/logging centralizados y menciona documentación técnica como futura fuente del agente                                         | Instrumentación/servicios y pipelines en `services/` y `data/`; vistas en `uis/backoffice/`; agente técnico en `agents/`.                                                             |

Según el README, una interfaz humana corresponde a `uis/`; una API o proceso backend a `services/`; el movimiento o transformación de datos a `data/`; y el trabajo realizado por un modelo a `agents/` (con `skills/` o `mcps/` cuando corresponda). El README recomienda una API centralizada FastAPI y evitar microservicios al inicio; esta es una convención/recomendación del repositorio, no un hecho del stack actual de Nexova.

## 9. Restricciones y hechos pendientes de confirmar

### Restricciones de interpretación

- No tratar ninguna necesidad u objetivo como funcionalidad ya implementada.
- No asumir fuentes, integraciones, bases de datos, modelos, endpoints, permisos, arquitectura o tecnologías que el briefing no identifique.
- No agregar métricas, cifras, plazos o criterios de éxito no declarados.
- Separar los hechos de Nexova de las convenciones de carpetas del monorepo.

### Pendiente de confirmar

- **Responsable de Ventas:** Megan Clarke en la descripción organizativa o Marcos Ibáñez en la sección de necesidades.
- El briefing dice “doce años” de experiencia y a la vez fecha la fundación en 2011; no indica la fecha de referencia de esa duración.
- No se detalla la distribución de empleados entre Valencia y Miami ni el tamaño del equipo de Marketing.
- No se definen los sistemas de origen para analítica web, tickets, datos ejecutivos ni métricas de RRHH, salvo las herramientas citadas expresamente.
- No se especifican formatos/esquemas de CV, vacantes, candidatos, cursos, tickets o registros; tampoco la calidad, disponibilidad o derechos de uso de esos datos.
- No hay definiciones de cálculo, periodos, responsables de medición ni líneas base verificadas para muchos indicadores. Confirmar también el alcance exacto y método de medición de la meta del 40% de resolución automatizada.
- No se indican requisitos de acceso, privacidad, retención, seguridad, regulación, aprobación humana ni manejo de errores para las futuras herramientas. Deben definirse antes de implementar, especialmente para datos de candidatos y empleados.
- El briefing no prioriza qué área o entregable se construye primero ni fija alcance o fechas del hito.
