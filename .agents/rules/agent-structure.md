# Rule: Agent Structure and Naming

> Based on `agents/_template/`, `agents/README.md`, and the root `README.md`.

**Scope:** 🔁 Always active — applies whenever creating, modifying, or documenting agents under `agents/`.

## Naming convention

- Each agent gets its own subfolder under `agents/`.
- Use **kebab-case** for the folder name, e.g. `support-agent/`, `returns-inspector/`, `cx-first-line/`.
- Match the folder name to the agent's purpose as described in `CONTEXT.md`.

## Required files

Every agent folder **must** contain:

| File | Purpose |
|------|---------|
| `agent.py` | Main agent logic (entry point), following the `agents/_template/agent.py` structure |
| `README.md` | Documentation: goal, capabilities, knowledge/memory sources, available tools, and how to test it (as specified in `agents/README.md`) |
| `tests/` | Test folder with at least one test file or a `tests/README.md` describing the testing strategy (following `agents/_template/tests/README.md`) |

## Optional files (as needed)

| File | When to include |
|------|-----------------|
| `requirements.txt` or `pyproject.toml` | When the agent has dependencies beyond the project base |
| `prompts/` folder | When the agent uses multiple system/user prompts |
| `tools/` folder | When the agent needs custom tools not shared in `agents/tools/` |

## How to start a new agent

Copy the template from `agents/_template/` and adapt it:

```text
cp -r agents/_template/ agents/your-agent-name/
```

Then update the new agent's `README.md` with its specific purpose and configuration, and document what changed (goal, tools, prompts, memory, evaluations, and tests) as recommended by `agents/_template/README.md`.

## References

- `agents/_template/` — base template for new agents
- `agents/README.md` — agent folder purpose and conventions
- `agents/tools/README.md` — reusable tools documentation
- Root `README.md` — *"Document what you add: each new app, service, agent, or pipeline gets a subfolder + README"*