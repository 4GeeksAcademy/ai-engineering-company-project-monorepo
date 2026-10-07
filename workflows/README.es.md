# Workflows

Automatizaciones operativas de Brasaland. El entregable de este hito es el informe de liderazgo de los lunes para Mariana Restrepo (Dirección), con las cifras de compra, merma, quiebres de stock y alertas de precio que usan Felipe Guerrero (Operaciones) y Lucía Fernández (Compras).

English: [README.md](./README.md).

## Informe de liderazgo, lunes 07:00

| Pieza | Ruta |
| --- | --- |
| Export n8n importable | [`brasaland-monday-leadership-report.n8n.json`](./brasaland-monday-leadership-report.n8n.json) |
| n8n local | [`docker-compose.n8n.yml`](./docker-compose.n8n.yml) |
| Validación del JSON | [`validate_weekly_report_workflow.py`](./validate_weekly_report_workflow.py) |
| CSV y avisos de fallo | `workflows/out/` (no se versiona; se monta en n8n) |

El workflow se importa **inactivo**. Actívalo solo cuando los placeholders estén definidos. El JSON no lleva contraseñas de personal, SMTP ni tokens de Slack.

### Zona horaria

La programación es **lunes 07:00 America/Bogota** (cron `0 7 * * 1`, lunes = 1).

Coincide con la sede en Medellín y con la semana de cadena de `previous_chain_week_bounds` en `data/pipelines/pipeline.py`: `[lunes 00:00, lunes siguiente 00:00)` America/Bogota. Bogotá no aplica horario de verano. America/New_York sí, así que las 07:00 en Nueva York se separarían una hora del corte de la semana durante parte del año. La zona del workflow y `GENERIC_TIMEZONE` / `TZ` en Compose son `America/Bogota`.

A esa hora el informe cubre la semana que acaba de cerrar.

### Qué hace

1. **Manual test** o **Monday 07:00 America/Bogota**.
2. **API base URL** lee `BRASALAND_API_BASE_URL` (por defecto `http://host.docker.internal:8000`).
3. **Resolve last chain week** calcula `week_start` y `week_end`.
4. **Login to central API**: `POST /auth/login` con `BRASALAND_STAFF_EMAIL` y `BRASALAND_STAFF_PASSWORD`.
5. **Pull weekly location performance**: `GET /reporting/weekly-location-performance?week_start=YYYY-MM-DD` con `Authorization: Bearer <access_token>`.
6. **Format leadership report**: texto con totales de Colombia en **COP** y de Florida en **USD** (sin conversión), y Purchase cost, Waste cost, Waste ratio, Stockout frequency y Price alert frequency por sede.
7. **Write weekly CSV** en `/home/node/brasaland-reports/brasaland-weekly-<week_start>.csv` (en el host: `workflows/out/`).
8. **Send leadership email** (credencial SMTP, CSV adjunto) si las variables de correo están definidas.
9. **Post leadership Slack** si `BRASALAND_SLACK_CHANNEL` está definido.

Login, token ausente, consulta, formato, CSV, correo y Slack tienen salida de error hacia **Describe failure**. Esa rama escribe `workflows/out/brasaland-weekly-failure.txt` y, si las mismas variables de envío están definidas, manda correo y Slack. Esos avisos no vuelven a entrar en la rama de error.

Si las variables de correo o Slack están vacías, esos nodos no se ejecutan y la prueba local puede terminar en el CSV.

El workflow lee la API de reporting. No sustituye el pipeline de Prefect. Carga antes la semana cerrada (`python data/pipelines/pipeline.py --offline --start-date <week_start> --end-date <week_end>`).

### Validar el JSON sin n8n

```bash
python3 workflows/validate_weekly_report_workflow.py
```

Revisa forma del export, cron, zona horaria, rutas de la API, texto COP/USD, nodos de CSV, correo y Slack, la rama de error y que no haya secretos. También ejecuta con Node las funciones de semana y de informe.

```bash
python3 -m pytest tests/test_n8n_weekly_workflow.py -q
```

### n8n en local

Hace falta Docker. El `docker-compose.yml` de la raíz sigue siendo Redis / Flower / Celery.

```bash
export BRASALAND_API_BASE_URL=http://host.docker.internal:8000
export BRASALAND_STAFF_EMAIL='you@brasaland.test'
# Contraseña local de 8+ caracteres. No la subas al repositorio ni la pegues en el JSON.
read -rs BRASALAND_STAFF_PASSWORD
export BRASALAND_STAFF_PASSWORD
export BRASALAND_REPORT_FROM=''
export BRASALAND_REPORT_TO=''
export BRASALAND_SLACK_CHANNEL=''

mkdir -p workflows/out
chmod a+rwx workflows/out
docker compose -f workflows/docker-compose.n8n.yml up -d
```

n8n queda en `http://localhost:5678`. El primer acceso crea el usuario owner; esa contraseña vive en el volumen `brasaland_n8n_data`. No la subas al repositorio.

Imagen fijada: `n8nio/n8n:1.123.81`. El mismo JSON se importa en n8n 2.x (tipos de nodo estándar).

`extra_hosts` permite que el contenedor llegue a `uvicorn` en el puerto 8000 del host:

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

### Importar

1. En n8n: **Workflows → Import from File** y elige `workflows/brasaland-monday-leadership-report.n8n.json`.
2. O desde el contenedor:

```bash
docker compose -f workflows/docker-compose.n8n.yml exec n8n \
  n8n import:workflow --input=/home/node/brasaland-monday-leadership-report.n8n.json
```

3. n8n marcará como faltantes las credenciales **Brasaland leadership SMTP** y **Brasaland Slack**. Créalas en **Credentials** con esos nombres, o déjalas sin usar hasta definir las variables de envío.
4. Comprueba que la zona del workflow es `America/Bogota`.

### Credenciales

Defínelas en la shell antes de `docker compose up`. Si cambian, recrea el contenedor. No las pegues en el JSON.

| Nombre | Uso | Valor |
| --- | --- | --- |
| `BRASALAND_API_BASE_URL` | Nodo de URL base | `http://host.docker.internal:8000` si la API corre en el host |
| `BRASALAND_STAFF_EMAIL` | `POST /auth/login` | Correo de un usuario del API central |
| `BRASALAND_STAFF_PASSWORD` | `POST /auth/login` | Contraseña de ese usuario (8+ caracteres), solo local |
| `BRASALAND_REPORT_FROM` | Nodos de correo | Remitente permitido por el SMTP |
| `BRASALAND_REPORT_TO` | Nodos de correo | Buzón de liderazgo |
| `BRASALAND_SLACK_CHANNEL` | Nodos de Slack | ID de canal, por ejemplo `C0123456789` |
| Brasaland leadership SMTP | Credencial n8n en los dos nodos de correo | Host, puerto, usuario y contraseña en la UI de n8n |
| Brasaland Slack | Credencial n8n en los dos nodos de Slack | Token de bot en la UI de n8n (credencial Slack API, `chat:write`). No lo pegues en git |

Alta del usuario (la contraseña sale del entorno, no de este archivo):

```bash
curl -sS -X POST http://127.0.0.1:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$BRASALAND_STAFF_EMAIL"'","password":"'"$BRASALAND_STAFF_PASSWORD"'"}'
```

### Prueba manual

Semana cerrada si ejecutas esto el lunes 28 sep 2026: `week_start=2026-09-21`, `week_end=2026-09-28`.

```bash
python data/pipelines/pipeline.py --offline --start-date 2026-09-21 --end-date 2026-09-28
```

En n8n, abre el workflow, selecciona **Manual test** y ejecútalo. **Write weekly CSV** debe dejar `workflows/out/brasaland-weekly-2026-09-21.csv` con filas `COP` y `USD`. Con el correo y Slack vacíos, esos envíos no se llaman.

Para la rama de error, exporta una `BRASALAND_STAFF_PASSWORD` incorrecta, recrea el contenedor y vuelve a ejecutar **Manual test**. Debe aparecer `workflows/out/brasaland-weekly-failure.txt`.

### Activar el lunes

Cuando la prueba manual esté bien, activa el workflow (n8n 1.x **Active**, n8n 2.x **Publish**). El cron sigue siendo lunes 07:00 en `America/Bogota`.
