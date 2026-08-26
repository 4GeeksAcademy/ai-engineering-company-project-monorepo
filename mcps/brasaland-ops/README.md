# Brasaland operations MCP

Stdio JSON-RPC server for Cursor or other MCP clients. It exposes Brasaland location IDs, currencies, and the waste escalation summary used by tickets. It does not invent addresses or convert USD to COP.

## Run

From the repository root:

```bash
uv run python mcps/brasaland-ops/server.py
```

## Cursor MCP config example

```json
{
  "mcpServers": {
    "brasaland-ops": {
      "command": "uv",
      "args": ["run", "python", "mcps/brasaland-ops/server.py"],
      "cwd": "/absolute/path/to/ai-engineering-company-project-monorepo-1"
    }
  }
}
```

## Tools

| Tool | Purpose |
| --- | --- |
| `list_locations` | `miami-downtown` (USD), `bogota-norte` and `COL-01`–`COL-10` (COP) |
| `lookup_location_currency` | Currency for one `location_id` |
| `waste_protocol_summary` | 5 kg waste ticket, 3-week unexplained shrinkage, Felipe Guerrero |
