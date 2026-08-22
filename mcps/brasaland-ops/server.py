"""Brasaland operations MCP server (JSON-RPC over stdio)."""

from __future__ import annotations

import json
import sys
from typing import Any

PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "brasaland-ops"
SERVER_VERSION = "1.0.0"

LOCATION_CURRENCY = {
    "miami-downtown": "USD",
    "bogota-norte": "COP",
    **{f"COL-{index:02d}": "COP" for index in range(1, 11)},
}

WASTE_PROTOCOL = (
    "Locations log waste as expiration, kitchen_error, or unexplained_shrinkage. "
    "Meat protein waste over 2 kg in a shift needs an explanatory note. "
    "Waste over 5 kg of premium protein (tenderloin or ribs), or unexplained shrinkage "
    "for 3 consecutive weeks, is a waste_escalation assigned to Felipe Guerrero. "
    "Operational target: keep total waste below 4% of monthly ingredient cost. "
    "USD and COP amounts are never converted."
)

TOOLS = [
    {
        "name": "list_locations",
        "description": "List Brasaland location IDs and their operating currencies.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "lookup_location_currency",
        "description": "Return USD or COP for a Brasaland location_id.",
        "inputSchema": {
            "type": "object",
            "properties": {"location_id": {"type": "string"}},
            "required": ["location_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "waste_protocol_summary",
        "description": "Return the waste escalation rules used by tickets and the knowledge base.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
]


def _text(payload: Any) -> dict[str, Any]:
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=True)
    return {"content": [{"type": "text", "text": text}]}


def call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    args = arguments or {}
    if name == "list_locations":
        rows = [{"location_id": key, "currency": value} for key, value in LOCATION_CURRENCY.items()]
        return _text(rows)
    if name == "lookup_location_currency":
        location_id = str(args.get("location_id") or "")
        if location_id not in LOCATION_CURRENCY:
            return {"isError": True, "content": [{"type": "text", "text": "Unknown location_id"}]}
        return _text({"location_id": location_id, "currency": LOCATION_CURRENCY[location_id]})
    if name == "waste_protocol_summary":
        return _text(WASTE_PROTOCOL)
    return {"isError": True, "content": [{"type": "text", "text": f"Unknown tool: {name}"}]}


def handle_request(message: dict[str, Any]) -> dict[str, Any] | None:
    method = message.get("method")
    request_id = message.get("id")
    if method == "notifications/initialized":
        return None
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
            },
        }
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        params = message.get("params") or {}
        result = call_tool(str(params.get("name") or ""), params.get("arguments") or {})
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
    if request_id is None:
        return None
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


def main() -> None:
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            continue
        reply = handle_request(message)
        if reply is not None:
            sys.stdout.write(json.dumps(reply, ensure_ascii=True) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
