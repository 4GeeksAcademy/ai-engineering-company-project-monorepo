# `uis` folder

This folder contains **all projects with a user interface** for the cross-functional AI Engineering company project — for example: a public website, admin dashboard frontend, ecommerce UI, customer portals, Streamlit/Gradio app or other frontend-only tools.

The two main projects stored here are:

- **`website`** — the company's public-facing web presence (Brasaland guest site: home, menu, locations, Brasa Points, allergens). Served at `/`.
- **`backoffice`** — the internal admin application (KPI dashboard, telemetry). The **supplier directory** lives at [`application/app/suppliers/`](application/app/suppliers/) and is linked from the application menu.
- **`application`** — supplier directory page at `/application/app/suppliers/`.

Also in this folder:

- **`knowledge`** — commercial knowledge assistant UI (`/knowledge/`).
- **`web`** — incident analysis tool, served at `/incidents/`.

Organize `uis/` by **different concerns** — each subfolder covers a distinct area of the company (for example, public web vs internal operations) and includes its own technical and functional documentation.

- **Main purpose**: to centralize in a single place all frontend applications that support the company's use cases.
- **Recommendation**: document in this file (or in sub-READMEs) the applications you add, their objective, the technology used, and how to run them.

> _Estas instrucciones también están disponibles en [español](./README.es.md)._
