# Production image for the FastAPI backend — used by Railway/Render/Fly
# (point the platform's build root at this directory, services/api/).
# Not used by local docker-compose, which uses services/Dockerfile
# instead (a dev image with --reload + bind mounts). No --reload here:
# this image is meant to run the code baked into it, not watch for
# live edits.
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# $PORT is injected by most PaaS platforms (Railway, Render); defaults
# to 8000 for platforms that don't set it. Shell form (not exec form) is
# required here so the shell actually expands ${PORT}.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
