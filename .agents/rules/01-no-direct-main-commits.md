# Rule: No Direct Commits To Main

## Policy
Direct commits to main are forbidden.

## Required workflow
- Always work on a feature branch.
- Branch naming should follow milestone-oriented naming, for example milestone-4.
- Open a pull request to merge into main.

## Enforcement checks
Before committing, verify:
1. Current branch is not main.
2. Branch name matches the active milestone or workstream.

If branch is main, stop and create/switch to a valid branch before continuing.
