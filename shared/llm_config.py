"""Shared LLM configuration for RAG: separate embedding vs generation clients.

The embedding client/model must only be used through ``data.process.rag.embed()``.
The generation client/model must only be used through ``data.pipelines.rag.query()``
and ``query_stream()``.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

EMBEDDING_MODEL_ID = os.getenv(
    "EMBEDDING_MODEL_ID",
    "downtown-miami/openrouter/perplexity/pplx-embed-v1-0.6b",
)
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1024"))

GENERATION_MODEL_ID = os.getenv(
    "GENERATION_MODEL_ID",
    "downtown-miami/groq/llama-3.1-8b-instant",
)


def _client(api_key_var: str, base_url_var: str) -> OpenAI:
    api_key = os.getenv(api_key_var) or os.getenv("OPENAI_API_KEY")
    base_url = os.getenv(base_url_var) or os.getenv("OPENAI_BASE_URL")
    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    return OpenAI(api_key=api_key)


embedding_client = _client("EMBEDDING_API_KEY", "EMBEDDING_BASE_URL")
generation_client = _client("GENERATION_API_KEY", "GENERATION_BASE_URL")
