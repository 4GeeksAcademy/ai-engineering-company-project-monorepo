# Knowledge query

Department: **Training** (Jake Morrison — searchable standards) and **Executive** (Mariana Restrepo — natural-language questions), served on the **Technology** central API.

`POST /knowledge/query` is mounted on `uvicorn api.app:app`. The handler is `services/knowledge/routes.py`. Indexing and retrieval are `data/process/rag.py` and `data/pipelines/rag.py` (one collection, `brasaland_kb`).

Request:

```json
{"question": "What allergens are in the House Sauce?"}
```

Response: `answer` plus `sources[]` (`source_document`, `section`, `text`, `score`, `chunk_index`, `language`).

Default mode needs no API key: local hashed embeddings and an extractive answer. Set `BRASALAND_RAG_BACKEND=qdrant` and/or `BRASALAND_RAG_LLM=openai` to use Qdrant and a chat model. See `docs/knowledge-rag.md`.

The retired entry points are `scripts/rag.py` (collection `company_knowledge_base`) and `services/api/main.py` (broken `api.routers.knowledge` import). Both now delegate to this path.
