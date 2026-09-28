# `uis` folder

This folder contains **all projects with a user interface** for the cross-functional AI Engineering company project — for example: a public website, admin dashboard frontend, ecommerce UI, customer portals, Streamlit/Gradio app or other frontend-only tools.

The two main projects stored here are:

- **`website`** — Brasaland’s public-facing corporate site (Vite + React). Home route `/`. See [`website/README.md`](./website/README.md).
- **`backoffice`** — internal Brasaland Digital console (Vite + React). Public `/login` and `/register`; staff views (`/`, `/accessible`, `/account/profile`, `/account/change-password`) use a client layout guard (`ProtectedRoute` + `useRequireAuth`) that checks `localStorage` and `GET /auth/me`. `/accessible` shows live no-sales alerts for Felipe Guerrero. See [`backoffice/README.md`](./backoffice/README.md). Legacy static KPI HTML lives in `backoffice/legacy/`.

Also present: **`web/`** — incident-analysis HTML tool (not the public marketing site).

Organize `uis/` by **different concerns** — each subfolder covers a distinct area of the company (for example, public web vs internal operations) and includes its own technical and functional documentation.

- **Main purpose**: to centralize in a single place all frontend applications that support the company's use cases.
- **Recommendation**: document in this file (or in sub-READMEs) the applications you add, their objective, the technology used, and how to run them.

> _Estas instrucciones también están disponibles en [español](./README.es.md)._
