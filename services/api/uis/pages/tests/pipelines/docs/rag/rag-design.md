# RAG System Architecture & Design Document

## 1. Overview & RAG Process Flow
This document details the architecture for the Retrieval-Augmented Generation (RAG) Knowledge Base built for the commercial and sales teams.

### End-to-End Pipeline
1. **Source Knowledge Base:** Markdown and text documents stored in `docs/company-knowledge-base/`.
2. **Indexing (`data/process/rag.py`):**
   - `setup()` parses source documents into semantic chunks.
   - `embed(text)` generates vector representations for each chunk.
   - Chunks are upserted into Qdrant along with payload metadata (`source_document`, `section`, `text`).
3. **Retrieval (`data/pipelines/rag.py`):**
   - At query time, `retrieve(query)` embeds the incoming user prompt.
   - Qdrant is queried for top-$k$ nearest neighbors.
   - Results below `min_score` (cosine similarity) are filtered out.
4. **Generation (`data/pipelines/rag.py`):**
   - `query(question)` constructs a prompt with surviving context chunks.
   - System prompt instructs the LLM to answer strictly using provided context from a commercial/salesperson perspective.
   - Answer string is returned to the client/API endpoint.

---

## 2. Chunking Strategy
- **Approach:** Semantic section chunking based on Markdown headings and functional blocks (e.g., policies, pricing rules, product specifications).
- **Rationale:** Preserves complete logical statements and conditional rules without cutting sentences or rules in half.
- **Chunk Parameters:** Target size of ~200–500 tokens per chunk with semantic boundaries prioritized over fixed token length.

---

## 3. Embedding & Generation Models
- **Embedding Model:** Dedicated text embedding model (`text-embedding-3-small`).
- **Generation Model:** Separate chat completion model (`gpt-4o-mini`).
- **Vector Search Metrics:**
  - **Distance Metric:** Cosine Similarity in Qdrant.
  - **Similarity Threshold (`min_score`):** Set to `0.70` to filter out irrelevant vector matches and prevent hallucinated answers when no relevant information exists.

---

## 4. API & UI Integration
- **Endpoint:** `POST /knowledge/query` accepting `{"question": "..."}` and returning `{"answer": "..."}`.
- **Client UI:** Built under `uis/` with loading/error handling to display answers generated from internal context without exposing raw vector data or similarity scores.