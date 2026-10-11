# Preserve Existing Project

## Scope

**Always active.**

This rule applies to every coding task performed by an agent in the Brasaland monorepo.

## Rule

Agents must preserve existing project functionality and structure unless the task explicitly requires a modification.

Before modifying, moving, renaming, or deleting an existing file or folder, the agent must:

1. Inspect the existing implementation and its purpose.
2. Check whether the file or folder belongs to a previous milestone or existing application.
3. Prefer reusing existing components, utilities, configurations, and services instead of creating duplicates.
4. Avoid modifying unrelated files.
5. Never delete or replace existing functionality only to simplify the implementation of a new task.
6. If a change could affect an existing milestone or application, explain the potential impact before making the change.

## Protected project areas

The following existing areas must be preserved unless the task explicitly requires changes to them:

* Hito 1 files and configuration at the repository root.
* `uis/backoffice/data-lab/` containing the Hito 2 Brasaland Data Lab.
* `uis/backoffice/` containing the Hito 3 Talent Pipeline Tracker.
* Existing project documentation and memory-bank files.

## Expected behavior

When a new feature can be implemented by extending existing code, the agent should extend the existing implementation rather than creating a parallel or duplicated implementation.

If the requested task conflicts with existing functionality, the agent must stop and report the conflict instead of silently removing or replacing the existing functionality.
