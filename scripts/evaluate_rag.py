"""Evaluate source-document Recall@3 using a configured retriever."""

from __future__ import annotations

import json
from pathlib import Path

from data.pipelines.rag import retrieve

ROOT = Path(__file__).resolve().parents[1]


def evaluate() -> dict[str, float | int]:
    cases = json.loads((ROOT / "data/eval/test-queries.json").read_text(encoding="utf-8"))
    hits = 0
    for case in cases:
        found = {item.get("source_document") for item in retrieve(case["question"], k=3)}
        if found.intersection(case["expected_source_documents"]):
            hits += 1
    return {"recall_at_3": hits / len(cases), "hits": hits, "total": len(cases)}


if __name__ == "__main__":
    print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
