# FastAPI service (services/api). Build context: ./services; packages/shared comes in as the named
# context "shared" (see docker-compose.yml) because requirements.txt installs the incidents_analyzer
# package from ../../packages/shared by relative path.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/services/api

RUN pip install --no-cache-dir uv

COPY --from=shared incidents_analyzer /app/packages/shared/incidents_analyzer
COPY --from=shared incidents /app/packages/shared/incidents
COPY api/requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY api .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
