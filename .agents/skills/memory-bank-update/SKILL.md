# Skill: memory-bank-update

## Objective

Update `memory-bank/progress.md` after completing a milestone feature, keeping the living log accurate for future agents and the human.

---

## Inputs

The human or agent triggering this skill must provide:

| Input            | Description                                                              | Required |
| ---------------- | ------------------------------------------------------------------------ | -------- |
| `change_type`    | One of: `feature`, `fix`, `refactor`, `config`, `docs`                   | Yes      |
| `description`    | 1–3 sentence summary of what was implemented, fixed, or changed          | Yes      |
| `affected_paths` | List of file paths (relative to repo root) that were created or modified | Yes      |
| `milestone`      | The milestone number this change belongs to (e.g., `4`)                  | Yes      |

---

## Procedure

1. Read `memory-bank/progress.md` to determine the current state.
2. Categorize the change:
   - If it completes an item already in the **🚧 In Flight** section, move it to **✅ Completed**.
   - If it is a new completed item not yet listed, add it to **✅ Completed**.
   - If it unblocks or creates new work, add a corresponding item to **🔜 Next Steps**.
3. Append a row to the **Known Decisions Log** with the date, decision, and rationale.
4. Verify no existing content (especially the "Last updated" date) was accidentally removed.

---

## Acceptance Criteria

- [ ] The `progress.md` "Last updated" date has been bumped to the current date.
- [ ] The change is logged under the correct section (Completed, In Flight, or Next Steps).
- [ ] The `affected_paths` are mentioned in the entry so a future agent can find relevant code.
- [ ] If the change was a feature or fix, a row was added to the Known Decisions Log.
- [ ] No pre-existing content was deleted or overwritten.
