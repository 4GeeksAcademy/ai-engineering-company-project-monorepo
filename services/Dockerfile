FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt
COPY . ./services
EXPOSE 8000
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]