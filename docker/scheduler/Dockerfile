# Contenedor scheduler dedicado (hito 21, ticket #DEV-53): ejecuta scripts/nightly_export.py
# según docker/scheduler/crontab, con supercronic (cron pensado para contenedores).
#
# Es un proceso aparte del backend: no arranca Uvicorn ni importa FastAPI. Si la API se cae o se
# reinicia, el job nocturno sigue; si el job se cuelga, la API no lo nota.
#
# Contexto de build: ./services (requirements.txt, el mismo que usa el backend) y, como contexto
# adicional `scheduler`, esta carpeta (el crontab). Ver docker-compose.yml.
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.21 /uv /uvx /bin/

# supercronic: lanza los jobs del crontab, pasa las variables de entorno del contenedor a los
# jobs, manda su salida a los logs de Docker y reenvía SIGTERM al job en `docker stop` (el script
# lo convierte en failed). Versión fija y checksum verificado (los de la página de la release).
ARG TARGETARCH
ARG SUPERCRONIC_VERSION=v0.2.49
RUN set -eu; \
    arch="${TARGETARCH:-amd64}"; \
    case "$arch" in \
      amd64) sha1=e63c11a9726b775a6a11801e81af4f3fb926aa68 ;; \
      arm64) sha1=0b6c5bb743e0b0dafed1132198c81807927ac413 ;; \
      *) echo "arquitectura no soportada por este Dockerfile: $arch" >&2; exit 1 ;; \
    esac; \
    url="https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-${arch}"; \
    python -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" \
      "$url" /usr/local/bin/supercronic; \
    echo "${sha1}  /usr/local/bin/supercronic" | sha1sum -c -; \
    chmod +x /usr/local/bin/supercronic

WORKDIR /app

# Mismas dependencias que el backend (uv.lock): el job importa services/ y lanza el pipeline
# (pandas, Prefect, SQLAlchemy).
COPY requirements.txt /tmp/requirements.txt
RUN uv pip install --system --no-cache -r /tmp/requirements.txt

COPY --from=scheduler crontab /etc/supercronic/crontab
# Falla el build si el crontab no se puede interpretar.
RUN supercronic -test /etc/supercronic/crontab

ENV PYTHONUNBUFFERED=1 \
    TZ=UTC

# -passthrough-logs: las líneas del script salen tal cual (ya llevan timestamp, job y estado).
# Sin -overlapping: supercronic no lanza el job si el anterior sigue en marcha; aun así, la
# garantía real es el lock de job_runs, que también cubre ejecuciones manuales y otras máquinas.
CMD ["supercronic", "-passthrough-logs", "/etc/supercronic/crontab"]
