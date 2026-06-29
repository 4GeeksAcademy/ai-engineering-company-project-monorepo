# AGENTS

## Session bootstrap rule
At the beginning of each session, always read all files under memory-bank/ before making decisions or proposing changes.

## Mandatory pre-commit flow
Before every commit, execute this 4-step flow in order:

1. Review git status.
- Command: git status
- Goal: confirm changed files and branch context.

2. Run build in the affected project.
- Command: npm run build
- Goal: verify the affected project compiles successfully.

3. Verify linting.
- Command: npm run lint (or project equivalent)
- Goal: ensure code quality and style checks pass.

4. Generate a conventional commit message.
- Format: <type>(<scope>): <subject>
- Examples:
  - feat(ui): add lead qualification form validation
  - fix(shared): correct phone normalization in contact schema
  - chore(repo): update memory-bank operational docs

## Enforcement
If any step fails, do not commit until the issue is resolved.
