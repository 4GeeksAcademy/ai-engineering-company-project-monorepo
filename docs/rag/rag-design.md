# Diseño RAG de TrackFlow

## Objetivo y audiencia

La base de conocimiento ayuda a los account managers y al equipo de business development a responder preguntas de prospectos y clientes sobre entregas, devoluciones, transportistas y almacenamiento. La respuesta se redacta como un account manager de TrackFlow: exacta, cautelosa y limitada a la documentación oficial.

## Flujo end-to-end

1. Los cuatro documentos Markdown oficiales viven en `docs/company-knowledge-base/`.
2. `load_chunks()` los separa por párrafos semánticos, preservando el título del documento y las condiciones en cada chunk.
3. `setup()` recrea de forma idempotente la colección Qdrant `trackflow_knowledge`, calcula embeddings y sube puntos con el payload contractual.
4. `retrieve()` embebe la pregunta y consulta Qdrant una sola vez con sobre-muestreo (`limit = max(k*4, 20)`). Descarta candidatos por debajo de `min_score=0.35` (score denso coseno) y re-ordena los supervivientes combinando score denso (peso 0.7) con solapamiento léxico español, insensible a acentos (peso 0.3). Por ello puede devolver menos de `k` resultados.
5. `generate_answer()` construye un prompt con el contexto seleccionado y llama al modelo generativo.
6. `query()` compone exclusivamente `retrieve()` y `generate_answer()`.
7. `POST /knowledge/query` devuelve solo `{ "answer": "..." }`; nunca devuelve chunks, vectores ni puntuaciones.

## Chunking y payload

El chunking usa párrafos Markdown como unidades semánticas. No corta listas de reglas ni condiciones por tamaño arbitrario, lo que mantiene juntos hechos como ventana, excepción y responsable de aprobación. Cada chunk contiene `company`, `source_document`, `section`, `language`, `chunk_index` y `text`. El corpus actual genera 18 chunks: SLA 4, devoluciones 6, cobertura de transportistas 4 y tarifas de almacenamiento 4. Los fragmentos que solo contienen encabezados se excluyen del índice.

## Modelos y vectores

- Embeddings: `EMBEDDING_MODEL`, por defecto `text-embedding-3-small`. Runtime actual: `bge-m3` (1024 dimensiones, multilingüe) servido por Ollama en `http://localhost:11434/v1`.
- Generación: `GENERATION_MODEL`, por defecto `gpt-4o-mini`. Runtime actual: `openai/gpt-oss-120b` vía API de Groq.
- Son identificadores distintos y se configuran de forma independiente.
- Dimensión: `EMBEDDING_DIMENSION`, por defecto 1536.
- Distancia Qdrant: cosine.
- Los clientes se conectan a endpoints OpenAI-compatible configurables mediante `EMBEDDING_API_BASE_URL`, `GENERATION_API_BASE_URL` y sus claves respectivas; `LLM_API_BASE_URL`/`LLM_API_KEY` son fallback común para desarrollo.

## Preprocesamiento, umbral e idempotencia

Los archivos se leen como UTF-8, se eliminan espacios externos y se conserva el texto español sin traducir. El umbral inicial `0.35` es deliberadamente conservador: evita introducir contexto débil y permite que el sistema reconozca falta de información. Se valida con `data/eval/test-queries.json` mediante Recall@3. La validación híbrida (dense + léxico con sobre-muestreo) alcanzó Recall@3 = 1.0 (8/8), superando el umbral requerido de 0.8. El re-ranking léxico usa tokens normalizados (minúsculas, sin acentos, stopwords de pregunta en español filtradas) con coincidencia por prefijo, de modo que variantes como "plazo"/"plazos" empatan. `setup()` usa `recreate_collection()` y UUID determinista derivado de documento, índice y texto; repetir la carga no duplica contenido.

## Seguridad comercial y respuestas

El prompt prohíbe inventar condiciones y exige declarar insuficiencia de información. En particular, no se promete SLA durante Black Friday, Navidad o Rebajas de enero; las devoluciones internacionales requieren gestión manual de Sofía Ramos; los descuentos de almacenamiento requieren aprobación de Miguel Torres; y las excepciones de transportista requieren aprobación de Carlos Vega. El endpoint expone únicamente la respuesta generada.

## Ejecución local

```bash
# Instalar dependencias cuando uv esté disponible
uv sync

# Arrancar Redis, Flower y Qdrant
 docker compose up -d qdrant

# Configurar modelos y credenciales en .env
# QDRANT_URL=http://localhost:6333
# EMBEDDING_API_BASE_URL=...
# EMBEDDING_API_KEY=...
# EMBEDDING_MODEL=...
# GENERATION_API_BASE_URL=...
# GENERATION_API_KEY=...
# GENERATION_MODEL=...

# Indexar el corpus
python -c 'from data.process.rag import setup; print(setup())'
```
