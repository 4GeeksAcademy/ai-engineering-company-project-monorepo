from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "brasaland_ops_mcp",
    ROOT / "mcps" / "brasaland-ops" / "server.py",
)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def test_mcp_lists_locations_and_currencies() -> None:
    listed = module.call_tool("list_locations", {})
    text = listed["content"][0]["text"]
    assert "miami-downtown" in text
    assert "USD" in text
    assert "bogota-norte" in text
    assert "COP" in text
    currency = module.call_tool("lookup_location_currency", {"location_id": "COL-01"})
    assert '"currency": "COP"' in currency["content"][0]["text"]
    unknown = module.call_tool("lookup_location_currency", {"location_id": "madrid"})
    assert unknown.get("isError") is True


def test_mcp_initialize_and_tools_list() -> None:
    init = module.handle_request({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    assert init["result"]["serverInfo"]["name"] == "brasaland-ops"
    listed = module.handle_request({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    names = {tool["name"] for tool in listed["result"]["tools"]}
    assert names == {"list_locations", "lookup_location_currency", "waste_protocol_summary"}
