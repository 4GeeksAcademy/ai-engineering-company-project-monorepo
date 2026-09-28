# Brasaland knowledge RAG

Department: **Training** (Jake Morrison — one searchable standard for recipes, waste, allergens, and ordering) and **Executive** (Mariana Restrepo — a question she can ask without calling a manager). The route sits on the **Technology** central API.

## One path

| Step | Module | Role |
| --- | --- | --- |
| Sources | `docs/company-knowledge-base/*.md` | Allergen guide, waste protocol, supplier ordering, Brasa Points |
| Index | `data/process/rag.py` | Paragraph chunks, collection name `brasaland_kb` |
| Retrieve + answer | `data/pipelines/rag.py` | Top chunks, then an answer that stays inside those chunks |
| HTTP | `services/knowledge/routes.py` | `POST /knowledge/query` |
| App | `services/api/app.py` | Loaded by `uvicorn api.app:app` |

`scripts/rag.py` is deprecated. It searched collection `company_knowledge_base` with a generic sales prompt, so it did not read the index `data/process/rag.py` wrote. It now delegates to `data.pipelines.rag`.

`services/api/main.py` is deprecated. It imported a missing `api.routers.knowledge` module. Running it starts the central app.

`services/api/uis/pages/knowledge.js` is not mounted in `uis/website` or `uis/backoffice`. Staff call the HTTP route.

## Request and response

```bash
curl -sS -X POST http://127.0.0.1:8000/knowledge/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"What allergens are in the House Sauce?"}'
```

```json
{
  "answer": "Source: brasaland-menu-allergens.en.md (...)\n...",
  "sources": [
    {
      "source_document": "brasaland-menu-allergens.en.md",
      "section": "Menu Allergen Guide · part 2",
      "text": "...",
      "score": 0.42,
      "chunk_index": 1,
      "language": "en"
    }
  ]
}
```

Empty or whitespace questions return HTTP 400. A question with no supporting chunk returns the sentence `There is not enough information available to answer this question.` and `"sources": []`. Qdrant or OpenAI failures return HTTP 503 with a generic message (no keys, no host paths).

The route is not behind JWT so a kitchen lead can query standards without the staff console token. Locations and the Monday report stay authenticated.

## Offline by default

Tests and CI do not need `OPENAI_API_KEY` or a Qdrant process.

| Variable | Default | Effect |
| --- | --- | --- |
| `BRASALAND_RAG_BACKEND` | `local` | `qdrant` searches collection `brasaland_kb` |
| `BRASALAND_RAG_EMBEDDINGS` | `local` | `openai` uses `text-embedding-3-small` (1536-d) when indexing or querying Qdrant |
| `BRASALAND_RAG_LLM` | `extractive` | `openai` calls a chat model (`BRASALAND_RAG_LLM_MODEL`, default `gpt-4o-mini`) |
| `OPENAI_API_KEY` | unset | Required only for the openai embedding or llm modes |
| `OPENAI_BASE_URL` | unset | Optional compatible endpoint |
| `QDRANT_HOST` / `QDRANT_PORT` | `localhost` / `6333` | Used only when backend is `qdrant` |
| `BRASALAND_KNOWLEDGE_DIR` | `docs/company-knowledge-base` | Corpus directory |

Local mode hashes tokens into a 384-d vector (SHA-256 buckets, L2-normalised) and ranks chunks with token overlap (0.75) plus cosine (0.25). Chunks scoring under 0.30 are dropped. Qdrant mode keeps cosine hits at or above 0.40. The answer quotes the retrieved paragraphs and names the file. Currency figures stay as written (COP and USD). The prompt used for the optional model forbids “zero risk” / “100% safe” on allergens and forbids inventing quantities.

`qdrant-client` is imported only when `BRASALAND_RAG_BACKEND=qdrant`. It is not required for the default path. Index Qdrant with the same embedding mode you will query:

```bash
BRASALAND_RAG_BACKEND=qdrant BRASALAND_RAG_EMBEDDINGS=openai \
  OPENAI_API_KEY=... python -m data.process.rag
```

Local index build (no network):

```bash
python -m data.process.rag
```

## Golden set

`data/eval/knowledge_qa.jsonl` holds questions grounded in the four knowledge files. `data/eval/eval_knowledge_qa.py` prints retrieval hit rate (expected file in `sources`) and answer checks (`must_include` / `must_not_include` against the answer text). The script forces the local/extractive path so a key in the environment does not change the score.

```bash
python data/eval/eval_knowledge_qa.py
python -m pytest tests/test_knowledge_query.py -q
```

Brasa Points copy in the knowledge file matches `CONTEXT.md`: physical stamp cards, no digital app yet. Earn and redeem amounts stay in COP and USD as written.
