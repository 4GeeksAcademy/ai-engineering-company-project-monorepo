FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY api/requirements.txt ./api/requirements.txt
RUN uv pip install --system -r ./api/requirements.txt

COPY api/ ./api/

WORKDIR /app/api

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
