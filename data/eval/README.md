# `data/eval` folder

This folder is for **evaluation and validation**: evaluation datasets, golden sets, experiment results, metrics, and artifacts used to measure quality for models, RAG, agents, or pipelines.

- **Main purpose**: centralize evaluation inputs and outputs so improvements stay measurable across project milestones.
- **Recommendation**: document each evaluation set (what it measures, how it was built, success criteria) and avoid sensitive data; use synthetic or anonymized data when needed.

## Knowledge Q&A golden set

`knowledge_qa.jsonl` is 28 questions grounded in `docs/company-knowledge-base/` (allergens, waste, supplier ordering, Brasa Points). `eval_knowledge_qa.py` scores retrieval hit rate (expected file appears in `sources`) and answer checks (`must_include` / `must_not_include`). It forces the local embedding path so the run does not need an API key.

```bash
python data/eval/eval_knowledge_qa.py
```

Weekly KPI fixtures in this folder are a separate pipeline check (`validate_weekly_kpis.py`).

> _Spanish version: [README.es.md](./README.es.md)._
