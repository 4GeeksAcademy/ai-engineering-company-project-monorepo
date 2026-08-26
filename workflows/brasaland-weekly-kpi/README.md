# Brasaland weekly waste watch (n8n)

Import `brasaland-weekly-kpi.json` into n8n. The workflow stays inactive until you set credentials.

## Trigger

Monday 10:00 (n8n server timezone).

## Steps

1. `GET /reporting/weekly-location-performance`
2. Keep locations whose `waste_ratio` is above 0.06
3. If any remain, `POST /tickets` as `waste_escalation` with `unexplained_shrinkage`, 5.1 kg, and 3 consecutive weeks (the ticket rules in CONTEXT.md)
4. False branch stops with an error so the run is visible in n8n

## Credentials

| Name | Use |
| --- | --- |
| `BRASALAND_API` | Base URL of the FastAPI app, for example `http://127.0.0.1:8000` |
| HTTP Header Auth | `Authorization: Bearer` token from `POST /auth/login` (`mariana` / `brasaland`) |

Amounts stay in the location currency from the KPI payload. This flow does not convert USD to COP.

## Error handling

Set n8n Error Workflow to a notifier of your choice, or keep `Stop on error` on the false/fail path. Do not auto-file tickets from GitHub Pages; this automation talks to the local or hosted API only.
