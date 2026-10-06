# Carpeta `uis`

Esta carpeta contiene **todos los proyectos con interfaz de usuario** para el proyecto transversal de AI Engineering de la compañía — por ejemplo: un sitio web público, un frontend de panel de administración, una interfaz de ecommerce, portales para clientes, aplicaciones Streamlit/Gradio u otras herramientas sólo-frontend.

Los proyectos principales que se almacenan aquí son:

- **`website`** — sitio corporativo público de Brasaland (Vite + React).
- **`backoffice`** — consola interna de Brasaland Digital (Vite + React, JWT).
- **`portal`** — portal Next.js (App Router): Brasa Points para invitados (`/points`) y ventas por sede en COP y USD (`/ops/sales`). Ver [`portal/README.md`](./portal/README.md).
- **`web/`** — herramienta HTML de análisis de incidentes (no es el sitio de marketing).

Organiza `uis/` por **distintas áreas de la compañía** — cada subcarpeta agrupa un ámbito diferente (por ejemplo, web pública frente a operaciones internas) e incluye su propia documentación técnica y funcional.

- **Propósito principal**: centralizar en un único lugar todas las aplicaciones frontend que dan soporte a los casos de uso de la compañía.
- **Recomendación**: documenta en este archivo (o en sub-READMEs) las aplicaciones que vayas añadiendo, su objetivo, tecnología usada y cómo ejecutarlas.

> _These instructions are also available in [English](./README.md)._
