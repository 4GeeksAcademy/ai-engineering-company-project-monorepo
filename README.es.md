# HTML Hello

El boilerplate más básico para cualquier estudiante de 4Geeks Academy, empieza tu primer sitio web desde cero.

> Tienes un video tutorial sobre [cómo usar esta plantilla para crear tu primer sitio web aquí](https://youtu.be/dfbDCMu_p-0).

## ¿Qué hacer a continuación?

Crea un archivo `index.html` con [la estructura básica de HTML](https://4geeks.com/es/lesson/what-is-html-learn-html-es#estructura-de-pgina) y ve el resultado en vivo corriendo un servidor web utilizando el siguiente comando:

## Propósito

Este repositorio es la **plantilla de inicio** para los proyectos transversales. Trabajarás con escenarios de empresas reales (Brasaland, TrackFlow, Nexova) construyendo entregables que se corresponden con los hitos del curso (Web, Programación, Backend, Telemetría, RAG, Agentes, Workflows, Tiempo real).

- Crea una plantilla a partir de este repositorio.
- Reemplaza el `CONTEXT.md` placeholder por el contexto de tu empresa asignada.
- Usa `skills/` y los `README.md` por carpeta como guía de trabajo.

---

## Estado actual de la plantilla

Actualmente el repositorio ofrece una **estructura base de carpetas y documentación**, pero todavía no incluye aplicaciones ejecutables ni scripts globales en la raíz.

- `CONTEXT.md` es un placeholder y debe sustituirse por el contexto de la empresa asignada.
- No existe todavía un `AGENTS.md` en la raíz.
- Existe metadata del paquete compartido en `packages/shared/package.json` (`@repo/shared-types`), pero aún no hay runner de workspace en raíz.

---

## Estructura del repositorio

```text
ai-engineering-company-project-monorepo/
├── README.md
├── README.es.md
├── CONTEXT.md                # Placeholder a reemplazar con el contexto asignado
├── agents/                   # Patrones/plantillas de agentes y documentación de tools
├── data/                     # raw, process, pipelines, eval
├── docs/                     # Documentación de proyecto y arquitectura
├── infra/                    # Docker, Terraform, configuraciones de despliegue
├── internal/                 # CLIs, scripts de migración empaquetados, utilidades internas
├── mcps/                     # Servidores Model Context Protocol (MCP)
├── packages/
│   └── shared/               # Paquete compartido (@repo/shared-types)
├── scripts/                  # Convenciones/documentación de scripts
├── services/                 # APIs y workers en segundo plano
├── shared/                   # Recursos/convenciones compartidas a nivel repo
├── skills/                   # Skills reutilizables para agentes
├── uis/                      # Interfaces de usuario (React, Next.js, Streamlit, HTML)
└── workflows/                # Documentación de automatizaciones/orquestación
```

---

## Cómo empezar

1. **Usa este repositorio como plantilla** y crea tu propio repo de proyecto.
2. **Clona** tu repositorio (o ábrelo en Codespaces).
3. **Reemplaza** `CONTEXT.md` con el contexto completo de tu empresa asignada.
4. **Revisa** los `README.md` de cada carpeta raíz para entender responsabilidades (`uis/`, `services/`, `data/`, `skills/`, etc.).
5. **Empieza a implementar** entregables por hito en `uis/` y `services/`, reutilizando `packages/shared/` y `data/` según corresponda.

---

```html
<head>
  ...
  <link rel="stylesheet" type="text/css" href="styles.css">
  ...
</head>
```

- Si deseas usar Tailwind CSS, agrégalo de forma opcional mediante el CDN oficial de Tailwind CSS v4 dentro del mismo `<head>`:

```html
<head>
  ...
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link rel="stylesheet" type="text/css" href="styles.css">
  ...
</head>
```


## Agradecimientos

Esta y otras plantillas son utilizadas para [aprender a programar](https://4geeksacademy.com/es/aprender-a-programar/aprender-a-programar-desde-cero) por parte de los alumnos de 4Geeks Academy [Coding Bootcamp](https://4geeksacademy.com/us/coding-bootcamp). 

Realizado por [Alejandro Sánchez](https://twitter.com/alesanchezr) y muchos otros contribuyentes. 

Conoce más sobre nuestros [Cursos de Programación](https://4geeksacademy.com/es/curso-de-programacion-desde-cero/?lang=es) para convertirte en [Full Stack Developer](https://4geeksacademy.com/es/desarrollador-full-stack/desarrollador-full-stack), o nuestro [Data Science Bootcamp](https://4geeksacademy.com/es/coding-bootcamps/curso-datascience-machine-learning).
