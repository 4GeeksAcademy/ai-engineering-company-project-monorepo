# HealthCore backoffice

The backoffice is the internal HealthCore Digital entry view for operational teams. It is intentionally separate from the public patient website in `uis/website`.

## Scope

The root route presents a company-specific operations overview with:

- Network scale across 12 clinics and two countries.
- Patient access, revenue-cycle, and workforce signals from `CONTEXT.md`.
- Department priorities for Clinical Operations, Patient Experience, Revenue Cycle, and People & Workforce.
- A visible HIPAA and UK GDPR privacy reminder.
- A clear note that displayed figures are company context, not live patient data.

It contains no patient-level data and does not claim to be a live operational system.

## Technology and route

This is a static HTML/CSS frontend. The entry route is `index.html`, which is served as `/` when this directory is used as the server root. No backend service is required for the current welcome view. Future APIs or background services belong under the repository's centralized `services/` folder.

## Run locally

From the repository root:

```bash
python3 -m http.server 4174 --directory uis/backoffice
```

Open `http://localhost:4174/`.
