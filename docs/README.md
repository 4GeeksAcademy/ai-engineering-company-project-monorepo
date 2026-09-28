# `docs` folder

This folder holds **cross-cutting documentation** for the monorepo: architecture guides, technical decisions, conventions, processes, and any material shared across applications, pipelines, agents, and workflows.

- **Main purpose**: provide a single place for “global” project documentation (not tied to one app or agent only).
- **Recommendation**: organize docs by topic (architecture, deployment, data, security, observability, etc.) and keep links from each component’s README to these guides.

- [central-api.md](./central-api.md) — menus, sales, customers, and suppliers on `uvicorn api.app:app` (how to run and what a grader should see in `/docs`).
- [knowledge-rag.md](./knowledge-rag.md) — `POST /knowledge/query` on the same app (cited answers from the company knowledge base).
- [`realtime-no-sales.md`](./realtime-no-sales.md) — live no-sales alert (SSE) for open locations, grader simulator, and how it hooks to a future `/sales` router.

> _Spanish version: [README.es.md](./README.es.md)._
