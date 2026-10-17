# ============================================
# Dockerfile - services/api (TrackFlow Auth + Incidents API)
# ============================================
# FastAPI backend para autenticación, usuarios, proveedores e incidencias
# Usa TinyDB como base de datos (archivo local)

FROM python:3.12-slim AS builder

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ──────────────────────────────────────────────
FROM python:3.12-slim AS runner

WORKDIR /app

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copiar código fuente
COPY main.py analyzer.py database.py seed.py ./
COPY routes/ routes/
COPY models/ models/
COPY services/ services/
COPY dependencies/ dependencies/
COPY core/ core/

# Puerto interno del contenedor
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]