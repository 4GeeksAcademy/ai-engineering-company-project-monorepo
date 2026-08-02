# SKILL: Release Readiness Check

## Objective
Perform a single, reusable pre-delivery verification pass for modified apps/services and report pass/fail status with concrete evidence.

## When to Use
- Before creating a commit or pull request.
- After implementing features across `uis/` or `services/`.

## Inputs
- `changed_paths`: list of changed files/folders.
- `validation_commands`: map of folder -> command (example: `uis/website -> npm run build`).
- `acceptance_requirements`: checklist that must be true at delivery time.

## Procedure
1. Identify runnable projects impacted by `changed_paths`.
2. Execute each mapped validation command in its corresponding folder.
3. Collect outcomes (exit code + key output summary).
4. Compare outcomes with `acceptance_requirements`.
5. Emit a final `PASS` or `FAIL` decision with blockers listed.

## Output Format
- `status`: PASS | FAIL
- `validated_targets`: list of targets and commands executed
- `evidence`: concise per-target result
- `blockers`: explicit list (empty if PASS)

## Acceptance Criteria (Verifiable)
- Every impacted runnable target has at least one executed validation command.
- Every executed command exits with code 0.
- Final report contains `status`, `validated_targets`, `evidence`, and `blockers`.
- If any command fails, `status` must be `FAIL`.
