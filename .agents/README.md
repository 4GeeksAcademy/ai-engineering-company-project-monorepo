# `.agents/` — rules and skills

Project-local agent infrastructure for **Brasaland**. Every rule and skill must stay consistent with root [`CONTEXT.md`](../CONTEXT.md) (company briefing). Generic template workflows are rejected.

| Path | Purpose |
| --- | --- |
| `rules/` | Development rules. Each file documents its **scope**. |
| `skills/` | Recurring workflows with one objective, inputs, and acceptance criteria. |

## Rule scopes (use exactly one per rule)

| Scope label | Meaning |
| --- | --- |
| **Always active** | Read before any edit in this repo. |
| **File-pattern based** | Apply when matching paths are in the change set (globs listed in the rule). |
| **Agent-requested** | Load only when the user names the rule/skill or the task clearly matches. |

## Current contents

| Artifact | Scope / role | `CONTEXT.md` alignment |
| --- | --- | --- |
| `rules/00-operating-loop.md` | Always active | Maps edits to Brasaland departments; COP+USD; 14 locations; Technology API nouns |
| `skills/verify-brasaland-api/` | Recurring verify | Scores running OpenAPI against Technology needs in `CONTEXT.md` |

Root `AGENTS.md` and `memory-bank/` remain mandatory at session start.
