"""Retrieval hit rate and answer checks for the Brasaland knowledge golden set.

Questions live in ``data/eval/knowledge_qa.jsonl`` and are grounded in
``docs/company-knowledge-base/``. The script forces the local embedding and
extractive answer path so CI does not call OpenAI or Qdrant.

Run from the monorepo root::

    python data/eval/eval_knowledge_qa.py

Exit status is 0 only when every question hits its expected source file and
passes the phrase checks.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from data.pipelines.rag import answer_question  # noqa: E402

_GOLDEN = Path(__file__).resolve().parent / "knowledge_qa.jsonl"


def load_golden(path: Path | None = None) -> list[dict]:
    source = path or _GOLDEN
    rows: list[dict] = []
    for line in source.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        rows.append(json.loads(stripped))
    return rows


def _source_hit(sources: list[dict], expected: str) -> bool:
    needle = expected.casefold()
    for source in sources:
        name = str(source.get("source_document", "")).casefold()
        if name == needle or name.endswith("/" + needle) or name.endswith(needle):
            return True
    return False


def _fold(text: str) -> str:
    """Case-fold and collapse whitespace so markdown line wraps still match."""
    return " ".join(text.casefold().split())


def _answer_errors(answer: str, row: dict) -> list[str]:
    folded = _fold(answer)
    errors: list[str] = []
    for phrase in row.get("must_include") or []:
        if _fold(phrase) not in folded:
            errors.append(f"missing:{phrase}")
    for phrase in row.get("must_not_include") or []:
        if _fold(phrase) in folded:
            errors.append(f"forbidden:{phrase}")
    return errors


def evaluate(path: Path | None = None) -> dict:
    """Score the golden file with the current ``BRASALAND_RAG_*`` settings."""
    rows = load_golden(path)
    if not rows:
        raise SystemExit("knowledge golden set is empty")
    failures: list[dict] = []
    retrieval_hits = 0
    answer_passes = 0
    for row in rows:
        result = answer_question(row["question"])
        sources = result["sources"]
        hit = _source_hit(sources, row["expected_source"])
        errors = _answer_errors(result["answer"], row)
        if hit:
            retrieval_hits += 1
        if not errors:
            answer_passes += 1
        if not hit or errors:
            failures.append(
                {
                    "id": row["id"],
                    "retrieval_hit": hit,
                    "answer_errors": errors,
                    "sources": [source.get("source_document") for source in sources],
                }
            )
    count = len(rows)
    return {
        "n": count,
        "retrieval_hits": retrieval_hits,
        "retrieval_hit_rate": retrieval_hits / count,
        "answer_passes": answer_passes,
        "answer_pass_rate": answer_passes / count,
        "failures": failures,
    }


def format_report(report: dict) -> str:
    lines = [
        f"knowledge_qa n={report['n']}",
        f"retrieval_hits={report['retrieval_hits']}",
        f"retrieval_hit_rate={report['retrieval_hit_rate']:.3f}",
        f"answer_passes={report['answer_passes']}",
        f"answer_pass_rate={report['answer_pass_rate']:.3f}",
    ]
    for failure in report["failures"]:
        lines.append(
            "fail {id} hit={retrieval_hit} errors={errors} sources={sources}".format(**failure)
        )
    return "\n".join(lines)


def main() -> int:
    os.environ["BRASALAND_RAG_BACKEND"] = "local"
    os.environ["BRASALAND_RAG_EMBEDDINGS"] = "local"
    os.environ["BRASALAND_RAG_LLM"] = "extractive"
    report = evaluate()
    print(format_report(report))
    if report["retrieval_hit_rate"] < 1.0 or report["answer_pass_rate"] < 1.0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
