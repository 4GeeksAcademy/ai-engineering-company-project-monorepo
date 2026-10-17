# Feature Branch Origin Rule

Status: active
Scope: entire repository

## Objective

Ensure every new project or feature starts on a dedicated feature branch created from the most up-to-date relevant base branch, using main when main is current and appropriate.

## Rule

When beginning any new project or feature, create a new branch using this naming scheme:

- feature/project-name

Naming requirements:

- Use lowercase.
- Use hyphens for separators.
- Keep project-name short and descriptive.

## Required behavior

1. Sync remotes first:

- Run fetch and prune for remote branches.

2. Determine the correct base branch:

- If the task, ticket, or milestone defines a target branch, use that branch.
- If no target branch is specified and main is up to date with origin/main, use main as the base branch.
- If main is not up to date or another active integration branch is defined, use the most up-to-date active integration branch for the project.

3. Update local base before branching:

- Check out the selected base branch.
- Pull latest changes from its tracked remote branch.

4. Create the feature branch from that updated base:

- Create and switch to feature/project-name.

## Validation checklist

1. Branch name matches feature/project-name format.
2. Base branch was explicitly identified before branch creation.
3. Base branch was updated from remote immediately before creating the feature branch.
4. New branch was created from the updated base, not from stale local history.
5. If no target branch was specified, main was used only when it was confirmed up to date with origin/main.

## Exception

For documentation-only notes with no code change, branch creation can be skipped if repository policy allows direct updates.
