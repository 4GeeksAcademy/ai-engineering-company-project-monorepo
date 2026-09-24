# Memory Bank Reference Rule

Status: active
Scope: entire repository

## Objective
Ensure all implementation work uses memory-bank as the working source of truth for context, technology inventory, and progress tracking.

## Rule
Before and during any meaningful coding task, the agent must reference memory-bank files when needed to maintain alignment and continuity.

### Required behavior
1. Context check before changes:
- Read memory-bank/HEALTHCORE_CONTEXT.md.
- Read relevant files in memory-bank/contexts/ when milestone-specific constraints apply.

2. Technology tracking:
- When a framework, library, platform, database, or infrastructure tool is detected or introduced, append an entry to memory-bank/TECH_STACK.md.

3. Progress tracking:
- After each meaningful change set, append a dated entry to memory-bank/PROGRESS_LOG.md with milestone, area, completed change, and next step.

4. Preserve history:
- Keep logs append-only.
- Correct inaccurate entries with a new correction entry instead of deleting history.

## When to apply
Apply this rule when the task includes any of the following:
- New feature implementation
- Bug fixing
- Refactoring
- Infrastructure or workflow changes
- Documentation changes that affect delivery scope

## Exception
For trivial read-only questions or one-line informational answers with no repository change, progress and tech log updates are optional.
