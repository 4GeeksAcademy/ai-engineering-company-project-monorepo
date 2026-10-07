# ============================================
# Dockerfile - services/inventory (TrackFlow Inventory API)
# ============================================
# FastAPI backend para gestión de inventario con SQLAlchemy ORM.
# Soporta SQLite (dev) y PostgreSQL (prod).
# Usa Alembic para migraciones de base de datos.

FROM python:3.12-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ──────────────────────────────────────────────
FROM python:3.12-slim AS runner

WORKDIR /app

# Solo libpq-dev para psycopg2-binary en runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copiar código fuente
COPY alembic.ini ./
COPY alembic/ alembic/
COPY app/ app/
COPY pyproject.toml ./

# Puerto interno del contenedor
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]