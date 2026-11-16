---
name: pre-commit-validation
description: Use before each commit to validate that changes comply with AGENTS.md rules — correct folder, English-only, coherence with CONTEXT.md, documentation completeness, and progress.md update.
---

# Pre-Commit Validation

Based on `AGENTS.md` section 2 — Mandatory flow before each commit (5 steps).

## Rules

1. Receive the list of files modified in the current change set.
2. Execute each validation step defined in `AGENTS.md` section 2, in order.
3. Report a structured result for each step (pass / fail / skip with reason).
4. If any step fails, block the commit and explain which file(s) caused the failure.

## Inputs

| Input | Description | Source |
|-------|-------------|--------|
| Changed files | List of file paths modified, added, or deleted in the change set | `git diff --name-only` or IDE change list |
| Commit message draft | Proposed commit message (optional) | Developer |
| Change type | Type of change — new component, modification, deletion | Developer or inferred from diff |

## Validation steps

### Step 1 — Validate target folder

For each new file, check that its path matches the correct layer folder according to `README.md` "Where should I put this?":

| If the component... | Expected folder |
|---------------------|-----------------|
| Has a UI (human sees and clicks it) | `uis/website/` or `uis/backoffice/` |
| Runs on a server, exposes an API | `services/` |
| Is raw or transformed data | `data/raw/` or `data/process/` |
| Moves data between systems | `data/pipelines/` |
| Is an AI assistant with a goal | `agents/` |
| Is a reusable AI capability | `skills/` |
| AI needs external tools/APIs | `mcps/` |
| Is n8n or scheduled automation | `workflows/` |

### Step 2 — Verify language compliance

Check that all new or modified files contain content in **English**. Flag any code identifiers, comments, documentation, or user-facing text in other languages.

### Step 3 — Verify coherence with `CONTEXT.md`

Review that any term, field name, constraint, or decision mentioned in the new code appears or is justifiable from `CONTEXT.md`. If a concept is introduced that is not in `CONTEXT.md`, flag it and ask for confirmation.

### Step 4 — Document what was added

Verify that every new app, service, agent, or pipeline has its own subfolder with a `README.md` describing its purpose. If documentation is missing, flag the failure.

### Step 5 — Update `memory-bank/progress.md`

If the change completes or advances any item marked with `[ ]` in the "Next Steps" section of `progress.md`, suggest updating the status to `[x]` and adding a note.

## Expected output

```json
{
  "status": "fail",
  "steps": [
    { "step": 1, "name": "validate_target_folder", "result": "pass", "details": "All files in correct folders" },
    { "step": 2, "name": "verify_language", "result": "pass", "details": "All content is in English" },
    { "step": 3, "name": "verify_coherence", "result": "fail", "details": "'pick-and-pack-optimizer' is not mentioned in CONTEXT.md. Confirm before proceeding." },
    { "step": 4, "name": "document_addition", "result": "pass", "details": "" },
    { "step": 5, "name": "update_progress", "result": "skip", "details": "No items in Next Steps are completed by this change set." }
  ]
}
```

## Verification criteria

- [ ] Each step from `AGENTS.md` section 2 produces a clear pass/fail/skip result.
- [ ] The folder validation uses the decision table from `README.md` and `service-placement.md`.
- [ ] Language validation detects non-English content in code, comments, and documentation.
- [ ] Coherence validation flags terms absent from `CONTEXT.md`.
- [ ] Documentation validation confirms or denies the existence of a `README.md` for each new component.
- [ ] The output is structured JSON ready for parsing by an agent or CI script.