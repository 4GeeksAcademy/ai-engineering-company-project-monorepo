# Workflows

Operational automations for Brasaland. This folder’s milestone deliverable is the Monday leadership report for Mariana Restrepo (Executive), with the purchase, waste, stockout, and price-alert figures Felipe Guerrero (Restaurant Operations) and Lucía Fernández (Procurement) use.

Spanish: [README.es.md](./README.es.md).

## Monday 07:00 leadership report

| Piece | Path |
| --- | --- |
| Importable n8n export | [`brasaland-monday-leadership-report.n8n.json`](./brasaland-monday-leadership-report.n8n.json) |
| Local n8n stack | [`docker-compose.n8n.yml`](./docker-compose.n8n.yml) |
| Structure check | [`validate_weekly_report_workflow.py`](./validate_weekly_report_workflow.py) |
| CSV and failure files | `workflows/out/` (gitignored; mounted into n8n) |

The workflow is inactive on import. Turn it on only after the placeholders below are set. The JSON contains no staff passwords, SMTP passwords, or Slack tokens.

### Timezone

The schedule is **Monday 07:00 America/Bogota** (`0 7 * * 1`, Monday = 1).

That matches headquarters in Medellín and the chain week already used by `previous_chain_week_bounds` in `data/pipelines/pipeline.py`: `[Monday 00:00, next Monday 00:00)` America/Bogota. Bogotá does not observe daylight saving. America/New_York does, so 07:00 in New York would fall an hour away from that boundary for part of the year. The workflow settings timezone and the compose `GENERIC_TIMEZONE` / `TZ` values are all `America/Bogota`.

At that hour the report covers the chain week that just closed (previous Monday through this Monday, end exclusive).

### What runs

1. **Manual test** or **Monday 07:00 America/Bogota** starts the run.
2. **API base URL** reads `BRASALAND_API_BASE_URL` (default `http://host.docker.internal:8000`).
3. **Resolve last chain week** computes `week_start` and `week_end`.
4. **Login to central API** `POST /auth/login` with `BRASALAND_STAFF_EMAIL` and `BRASALAND_STAFF_PASSWORD`.
5. **Pull weekly location performance** `GET /reporting/weekly-location-performance?week_start=YYYY-MM-DD` with `Authorization: Bearer <access_token>`.
6. **Format leadership report** builds plain text with Colombia totals in **COP** and Florida totals in **USD** (no conversion), plus Purchase cost, Waste cost, Waste ratio, Stockout frequency, and Price alert frequency for each location.
7. **Write weekly CSV** to `/home/node/brasaland-reports/brasaland-weekly-<week_start>.csv` (host path `workflows/out/`).
8. **Send leadership email** (SMTP credential, CSV attached) when from/to env vars are set.
9. **Post leadership Slack** when `BRASALAND_SLACK_CHANNEL` is set.

Login, a missing token, the KPI request, formatting, the CSV write, email, and Slack each have an error output into **Describe failure**. That branch writes `workflows/out/brasaland-weekly-failure.txt` and, when the same delivery env vars are set, sends an email and a Slack message. Those failure notices do not connect back into the error branch.

Email and Slack are skipped when their env vars are empty, so a local run can stop at the CSV.

The workflow reads the reporting API. It does not replace the Prefect pipeline. Load the closed week first (`python data/pipelines/pipeline.py --offline --start-date <week_start> --end-date <week_end>`) or the report will say that no location rows came back.

### Check the JSON without n8n

```bash
python3 workflows/validate_weekly_report_workflow.py
```

The script checks the export shape, cron, timezone, API paths, COP/USD copy, CSV/email/Slack nodes, the failure branch, and secret patterns. It also runs the embedded chain-week and report functions with Node and compares the week bounds to the Bogotá rule in `data/pipelines/pipeline.py`.

```bash
python3 -m pytest tests/test_n8n_weekly_workflow.py -q
```

### Run n8n locally

Docker is required. The root `docker-compose.yml` stays the Redis / Flower / Celery stack; start n8n from this snippet instead.

```bash
export BRASALAND_API_BASE_URL=http://host.docker.internal:8000
export BRASALAND_STAFF_EMAIL='you@brasaland.test'
# Local staff password, 8+ characters. Do not commit it and do not paste it into the JSON.
read -rs BRASALAND_STAFF_PASSWORD
export BRASALAND_STAFF_PASSWORD
# Leave these empty for a CSV-only test.
export BRASALAND_REPORT_FROM=''
export BRASALAND_REPORT_TO=''
export BRASALAND_SLACK_CHANNEL=''

mkdir -p workflows/out
chmod a+rwx workflows/out
docker compose -f workflows/docker-compose.n8n.yml up -d
```

n8n listens on `http://localhost:5678`. The first visit asks you to create an owner account; that password stays in the `brasaland_n8n_data` volume. Do not commit it.

The image pin is `n8nio/n8n:1.123.81`. Import from file also works on current n8n 2.x because the export uses built-in node types (`scheduleTrigger`, `httpRequest`, `code`, `emailSend`, `slack`, `readWriteFile`).

`extra_hosts` maps `host.docker.internal` to the host so the container can reach `uvicorn` on port 8000. Start the central API on the host first:

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

### Import

1. In n8n: **Workflows → Import from File** and choose `workflows/brasaland-monday-leadership-report.n8n.json`.
2. Or from the running container:

```bash
docker compose -f workflows/docker-compose.n8n.yml exec n8n \
  n8n import:workflow --input=/home/node/brasaland-monday-leadership-report.n8n.json
```

3. Open the workflow. n8n will mark **Brasaland leadership SMTP** and **Brasaland Slack** as missing credentials. That is expected. Create them in **Credentials** with those exact names, or leave them unused until you set the delivery env vars.
4. Confirm the workflow timezone shown in settings is `America/Bogota`.

### Credentials

Set variables in the shell before `docker compose up`. Changing them later requires recreating the container so n8n’s `$env` picks them up. Never paste the values into the workflow JSON.

| Name | Where it is used | What to put |
| --- | --- | --- |
| `BRASALAND_API_BASE_URL` | API base URL node | `http://host.docker.internal:8000` when the API runs on the host |
| `BRASALAND_STAFF_EMAIL` | `POST /auth/login` | Email of a staff user in the central API |
| `BRASALAND_STAFF_PASSWORD` | `POST /auth/login` | That user’s password (8+ characters). Local only |
| `BRASALAND_REPORT_FROM` | Email nodes | Sender address your SMTP credential allows |
| `BRASALAND_REPORT_TO` | Email nodes | Leadership inbox, for example Mariana’s |
| `BRASALAND_SLACK_CHANNEL` | Slack nodes | Channel ID such as `C0123456789` (By ID mode) |
| Brasaland leadership SMTP | n8n credential on both email nodes | Host, port, user, password entered in the n8n UI |
| Brasaland Slack | n8n credential on both Slack nodes | Bot token entered in the n8n UI (Slack API credential, `chat:write`). Do not paste it into git |

Create the staff user against the central API (password from the environment, not from this file):

```bash
curl -sS -X POST http://127.0.0.1:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$BRASALAND_STAFF_EMAIL"'","password":"'"$BRASALAND_STAFF_PASSWORD"'"}'
```

If the email is already registered, skip register and use `POST /auth/login` with the same pair.

### Manual test

Example closed week when you run this on Monday 28 Sep 2026: `week_start=2026-09-21`, `week_end=2026-09-28`. On another Monday, use the previous Monday and that Monday.

```bash
python data/pipelines/pipeline.py --offline --start-date 2026-09-21 --end-date 2026-09-28
```

Then in n8n:

1. Open **Brasaland Monday leadership report**.
2. Select the **Manual test** node and execute the workflow (n8n 1.x: **Execute workflow**. n8n 2.x: test from that trigger).
3. Expect **Write weekly CSV** to succeed and `workflows/out/brasaland-weekly-2026-09-21.csv` to list location rows with `currency` `COP` and `USD`.
4. With `BRASALAND_REPORT_TO` and `BRASALAND_SLACK_CHANNEL` empty, **Email delivery configured** and **Slack delivery configured** take the false branch and do not call SMTP or Slack.

Failure path: export a wrong `BRASALAND_STAFF_PASSWORD`, recreate the n8n container, and execute **Manual test** again. Login fails, **Describe failure** runs, and `workflows/out/brasaland-weekly-failure.txt` explains the failure. Fix the password and recreate the container before the next try.

### Turn on the Monday schedule

After a manual run looks right, activate the workflow (n8n 1.x **Active**, n8n 2.x **Publish**). The cron stays Monday 07:00 in `America/Bogota` even if the laptop’s local zone is different, because the workflow timezone is set in the export and `GENERIC_TIMEZONE` is set in compose.
