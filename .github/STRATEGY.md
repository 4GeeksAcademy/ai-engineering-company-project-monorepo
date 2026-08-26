# README - Propuesta de Arquitectura de Backend

## 🎯 Tu reto

Acabas de completar el cuarto hito: el sitio corporativo de tu empresa ya está desplegado, estructurado y gestionado con agentes de IA. Ahora el equipo de ingeniería tiene que dar el siguiente paso: construir el backend.

Antes de escribir una sola línea de código, tu CTO quiere asegurarse de que el equipo tenga claridad arquitectónica. Nadie va a comenzar a programar sin un criterio compartido sobre cómo organizar el proyecto. Por eso, te ha pedido a ti que redactes el primer borrador del documento de arquitectura.

Llevas cuatro milestones trabajando con esta empresa. Conoces su sector, sus operaciones, los datos que maneja, los usuarios que va a tener y los flujos críticos de su negocio. Y acabas de aprender que no existe una arquitectura universalmente correcta: la elección depende de la naturaleza del sistema y de las necesidades del negocio.

Este es el momento de conectar esas dos cosas.

Tu CTO te ha enviado el siguiente mensaje por Slack:

> ### 💬 Mensaje de tu CTO
>
> Hola, antes de que el equipo empiece a configurar el entorno y los primeros endpoints, necesito que me mandes un documento con tus consideraciones sobre cómo deberíamos estructurar el backend.
>
> No necesito código todavía. Necesito entender tu razonamiento: qué patrón arquitectónico propones, por qué encaja con lo que estamos construyendo, cómo organizarías los módulos y dominios del proyecto, y qué decisiones técnicas iniciales tomarías.
>
> Basa tu análisis en lo que sabemos de la empresa y en lo que has aprendido sobre arquitecturas de backend. Si detectas riesgos o puntos donde podría haber confusión en el equipo, inclúyelos también.
>
> Antes de redactar, te recomiendo que investigues cómo se estructuran habitualmente los proyectos en FastAPI y cómo se organiza una aplicación cuando el frontend y el backend son sistemas separados. Eso te va a dar contexto concreto para fundamentar tus decisiones.
>
> Necesito el documento antes del inicio del próximo sprint. Un Markdown está bien.

---

## ❓ ¿Qué hace una buena propuesta de arquitectura?

Un documento de arquitectura no es una lista de tecnologías. Es un razonamiento técnico documentado: explica qué, por qué, y anticipa consecuencias. Un buen documento de arquitectura permite que cualquier miembro del equipo entienda las decisiones tomadas sin necesidad de preguntar. Incluye al menos:
- El patrón elegido con su justificación.
- La estructura de carpetas y módulos propuesta.
- La organización de rutas y dominios.
- Los riesgos o puntos de atención identificados.

Esta es tu oportunidad de demostrar que sabes pensar en un sistema antes de construirlo.

---

## 🌱 Cómo iniciar el proyecto

Este proyecto no parte de un template de código: el entregable es un documento técnico que vive dentro de tu proyecto transversal existente.

1. Abre el repositorio de tu proyecto transversal (el monorepo que has venido construyendo desde el Hito 1).
2. Crea el archivo `ARCHITECTURE_PROPOSAL.md` dentro del directorio `/docs` del repositorio.
3. Redacta tu propuesta en ese archivo.

---

## 💻 Qué debes hacer

- [x] Crear el archivo `ARCHITECTURE_PROPOSAL.md` dentro del directorio `/docs` de tu repositorio transversal.
- [x] En el documento, identificar y justificar el patrón arquitectónico más adecuado para tu empresa (MVC, arquitectura en capas, serverless u otro). La justificación debe estar vinculada a las características reales de tu empresa, no a una preferencia genérica.
- [x] Proponer y describir la estructura de carpetas y módulos del proyecto backend, explicando el criterio de separación por dominio o responsabilidad utilizado.
- [x] Incluir una sección sobre cómo organizarías los endpoints y routers de FastAPI según los dominios identificados. No es necesario escribir código: basta con describir qué rutas existirían y bajo qué criterio se agruparían.
- [x] Investigar cómo se estructuran habitualmente los proyectos en FastAPI (convenciones de carpetas, separación de routers, modelos y configuración) y documentar en el proposal cómo esa estructura estándar influye en tus decisiones.
- [x] Investigar cómo se organiza una aplicación cuando el frontend y el backend son sistemas separados (separación de repositorios o monorepo, comunicación por API, variables de entorno, CORS) y reflejar esas consideraciones en el documento.
- [x] Incluir una sección de riesgos o puntos de atención con al menos dos consideraciones sobre lo que podría salir mal si el equipo no sigue la estructura propuesta.

> [!IMPORTANT]
> El entregable de este proyecto es un documento Markdown, no código funcional. No se evaluará si FastAPI está instalado ni si el proyecto arranca. Se evaluará la calidad del razonamiento técnico documentado.

---

## ✅ Qué vamos a evaluar

- [x] El patrón arquitectónico elegido está justificado con argumentos vinculados a la naturaleza del negocio y del sistema, no por preferencia genérica.
- [x] La estructura de carpetas propuesta es coherente con el patrón elegido y refleja una separación clara de responsabilidades o dominios.
- [x] La organización de routers y endpoints es reconocible como una aplicación FastAPI válida (rutas agrupadas por dominio, no todas en un único archivo).
- [x] Las decisiones técnicas documentadas son concretas, justificadas y no contradicen los contenidos del curso.
- [x] La propuesta refleja investigación real sobre la estructura estándar de proyectos FastAPI: las convenciones identificadas están presentes en la estructura propuesta y se menciona explícitamente su origen.
- [x] El documento aborda cómo frontend y backend coexisten como sistemas separados: se identifican al menos las implicaciones de comunicación por API y la gestión de CORS o variables de entorno.

> [!NOTE]
> No se evalúa el uso de frameworks, librerías ni herramientas que no hayan sido cubiertas hasta este punto del curso.