from __future__ import annotations

import csv
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import agent as inventory_agent


def test_agent_loop_observe_think_act_update_repeat(monkeypatch: Any, tmp_path: Any) -> None:
    log_path = tmp_path / "conversation_log.csv"
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", log_path)
    monkeypatch.setattr(
        inventory_agent,
        "execute_tool",
        lambda name, arguments: {"ok": True, "tool": name, "arguments": arguments},
    )

    tool_call = SimpleNamespace(
        id="call_1",
        function=SimpleNamespace(name="list_inventory", arguments="{}"),
    )
    first = SimpleNamespace(content="", tool_calls=[tool_call])
    second = SimpleNamespace(content="We have 8 products in stock.", tool_calls=None)

    class FakeCompletions:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []
            self._queue = [first, second]

        def create(self, **kwargs: Any) -> SimpleNamespace:
            self.calls.append(kwargs)
            message = self._queue.pop(0)
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    messages: list[dict[str, Any]] = [{"role": "system", "content": "test"}]

    reply = inventory_agent.run_agent_loop(client, messages, "List all products")

    assert reply == "We have 8 products in stock."
    assert messages[1] == {"role": "user", "content": "List all products"}
    assert messages[2]["role"] == "assistant"
    assert messages[2]["tool_calls"][0]["function"]["name"] == "list_inventory"
    assert messages[3]["role"] == "tool"
    assert messages[3]["tool_call_id"] == "call_1"
    assert json.loads(messages[3]["content"])["ok"] is True
    assert messages[4]["role"] == "assistant"
    assert messages[4]["content"] == reply
    assert len(completions.calls) == 2
    assert completions.calls[0]["tools"] == inventory_agent.TOOLS
    assert completions.calls[1]["messages"][3]["role"] == "tool"


def test_session_keeps_history_in_memory_across_turns(monkeypatch: Any, tmp_path: Any) -> None:
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", tmp_path / "conversation_log.csv")

    replies = [
        SimpleNamespace(content="First answer.", tool_calls=None),
        SimpleNamespace(content="Second answer, still remembering turn one.", tool_calls=None),
    ]

    class FakeCompletions:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []

        def create(self, **kwargs: Any) -> SimpleNamespace:
            self.calls.append(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=replies.pop(0))])

    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    session = inventory_agent.AgentSession(session_id="test-session")

    first = session.handle_turn(client, "What is in stock?")
    second = session.handle_turn(client, "And which of those is low?")

    assert first == "First answer."
    assert second.startswith("Second answer")
    roles = [item["role"] for item in session.messages]
    assert roles == ["system", "user", "assistant", "user", "assistant"]
    assert session.messages[1]["content"] == "What is in stock?"
    assert session.messages[3]["content"] == "And which of those is low?"
    second_turn_context = completions.calls[1]["messages"]
    assert second_turn_context[1]["content"] == "What is in stock?"
    assert second_turn_context[2]["content"] == "First answer."


def test_each_tool_has_name_description_and_typed_parameters() -> None:
    expected = {
        "list_inventory": "GET /inventory",
        "add_product": "POST /inventory/{product_id}",
        "update_stock": "PATCH /inventory/{product_id}",
        "get_low_stock_alerts": "GET /inventory/alerts",
    }
    assert len(inventory_agent.TOOLS) == 4
    for tool in inventory_agent.TOOLS:
        spec = tool["function"]
        name = spec["name"]
        assert name in expected
        assert expected[name] in spec["description"]
        assert spec["description"].strip()
        params = spec["parameters"]
        assert params["type"] == "object"
        assert params["properties"]
        for field_name, schema in params["properties"].items():
            assert "type" in schema, f"{name}.{field_name} is missing a type"
            assert "description" in schema, f"{name}.{field_name} is missing a description"


def test_execute_tool_maps_to_inventory_routes(monkeypatch: Any) -> None:
    calls: list[tuple[str, str, dict[str, Any] | None]] = []

    def fake_request(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, str]:
        calls.append((method, path, body))
        return {"ok": True}

    monkeypatch.setattr(inventory_agent, "_api_request", fake_request)

    inventory_agent.execute_tool("list_inventory", {"location": "Downtown"})
    inventory_agent.execute_tool(
        "add_product",
        {"product_id": 9, "name": "Oat milk", "quantity": 10, "unit": "liters", "location": "Riverside"},
    )
    inventory_agent.execute_tool("update_stock", {"product_id": 3, "delta": -4})
    inventory_agent.execute_tool("get_low_stock_alerts", {"threshold": 15, "location": "Riverside"})

    assert calls[0][:2] == ("GET", "/inventory?location=Downtown")
    assert calls[1][:2] == ("POST", "/inventory/9")
    assert calls[2] == ("PATCH", "/inventory/3", {"delta": -4})
    assert calls[3][:2] == ("GET", "/inventory/alerts?threshold=15&location=Riverside")


def test_llm_tool_call_hits_api_and_injects_result(monkeypatch: Any, tmp_path: Any) -> None:
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", tmp_path / "conversation_log.csv")
    api_calls: list[tuple[str, str, dict[str, Any] | None]] = []

    def fake_api(method: str, path: str, body: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        api_calls.append((method, path, body))
        return [{"product_id": 2, "name": "Oat milk", "quantity": 9, "unit": "liters"}]

    monkeypatch.setattr(inventory_agent, "_api_request", fake_api)

    tool_call = SimpleNamespace(
        id="call_alerts",
        function=SimpleNamespace(
            name="get_low_stock_alerts",
            arguments='{"threshold": 10}',
        ),
    )
    first = SimpleNamespace(content="", tool_calls=[tool_call])
    second = SimpleNamespace(content="Oat milk is below 10 liters.", tool_calls=None)

    class FakeCompletions:
        def __init__(self) -> None:
            self.payloads: list[list[dict[str, Any]]] = []
            self._queue = [first, second]

        def create(self, **kwargs: Any) -> SimpleNamespace:
            self.payloads.append(list(kwargs["messages"]))
            return SimpleNamespace(choices=[SimpleNamespace(message=self._queue.pop(0))])

    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    messages: list[dict[str, Any]] = [{"role": "system", "content": "test"}]

    reply = inventory_agent.run_agent_loop(client, messages, "What is running low?")

    assert api_calls == [("GET", "/inventory/alerts?threshold=10", None)]
    injected = completions.payloads[1][-1]
    assert injected["role"] == "tool"
    assert injected["tool_call_id"] == "call_alerts"
    assert json.loads(injected["content"])[0]["name"] == "Oat milk"
    assert reply == "Oat milk is below 10 liters."


def test_loop_stops_on_final_response_with_no_tool_calls(monkeypatch: Any, tmp_path: Any) -> None:
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", tmp_path / "conversation_log.csv")
    acted: list[str] = []
    monkeypatch.setattr(
        inventory_agent,
        "execute_tool",
        lambda name, arguments: acted.append(name) or {"ok": True},
    )

    final = SimpleNamespace(
        content="Downtown has enough Arabica beans for the week.",
        tool_calls=None,
        finish_reason="stop",
    )

    class FakeCompletions:
        def __init__(self) -> None:
            self.create_count = 0

        def create(self, **kwargs: Any) -> SimpleNamespace:
            self.create_count += 1
            return SimpleNamespace(choices=[SimpleNamespace(message=final)])

    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    messages: list[dict[str, Any]] = [{"role": "system", "content": "test"}]

    reply = inventory_agent.run_agent_loop(client, messages, "Do we have enough beans?")

    assert reply == "Downtown has enough Arabica beans for the week."
    assert completions.create_count == 1
    assert acted == []
    assert messages[-1]["role"] == "assistant"
    assert "tool" not in {item["role"] for item in messages}


def test_empty_tool_calls_list_is_treated_as_final(monkeypatch: Any, tmp_path: Any) -> None:
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", tmp_path / "conversation_log.csv")

    def create(**kwargs: Any) -> SimpleNamespace:
        message = SimpleNamespace(content="Done.", tool_calls=[], finish_reason="stop")
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    reply = inventory_agent.run_agent_loop(
        client,
        [{"role": "system", "content": "test"}],
        "Thanks",
    )
    assert reply == "Done."


def test_cli_reads_terminal_input_and_prints_agent_response(monkeypatch: Any, capsys: Any, tmp_path: Any) -> None:
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", tmp_path / "conversation_log.csv")
    monkeypatch.setattr(inventory_agent, "log_event", lambda *args, **kwargs: None)
    lines = iter(["Do we have oat milk?", "quit"])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(lines))

    session = inventory_agent.AgentSession(session_id="cli-test")
    monkeypatch.setattr(
        inventory_agent.AgentSession,
        "handle_turn",
        lambda self, client, user_input: f"Stock check for: {user_input}",
    )

    inventory_agent.run_cli(session, client=SimpleNamespace())
    output = capsys.readouterr().out
    assert "Stock check for: Do we have oat milk?" in output
    assert output.count("Agent:") >= 1
    assert "Goodbye." in output


def test_conversation_log_appends_every_event(monkeypatch: Any, tmp_path: Any) -> None:
    log_path = tmp_path / "conversation_log.csv"
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", log_path)
    monkeypatch.setattr(
        inventory_agent,
        "_api_request",
        lambda method, path, body=None: [{"name": "Oat milk", "quantity": 9}],
    )

    tool_call = SimpleNamespace(
        id="call_1",
        function=SimpleNamespace(name="list_inventory", arguments="{}"),
    )
    first = SimpleNamespace(content="", tool_calls=[tool_call])
    second = SimpleNamespace(content="Oat milk is low.", tool_calls=None)
    queue = [first, second, SimpleNamespace(content="You are welcome.", tool_calls=None)]

    def create(**kwargs: Any) -> SimpleNamespace:
        return SimpleNamespace(choices=[SimpleNamespace(message=queue.pop(0))])

    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    messages: list[dict[str, Any]] = [{"role": "system", "content": "test"}]

    inventory_agent.run_agent_loop(client, messages, "What is in stock?")
    inventory_agent.run_agent_loop(client, messages, "Thanks")

    with log_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    assert [row["actor"] for row in rows] == [
        "user",
        "agent",
        "tool",
        "agent",
        "user",
        "agent",
    ]
    assert rows[0]["message"] == "What is in stock?"
    assert json.loads(rows[1]["tool_call"]) == {"arguments": {}, "name": "list_inventory"}
    assert "Oat milk" in rows[2]["message"]
    assert rows[2]["tool_call"] == "list_inventory"
    assert rows[3]["message"] == "Oat milk is low."
    assert rows[4]["message"] == "Thanks"
    assert rows[5]["message"] == "You are welcome."
    assert all(row["timestamp"] for row in rows)
    header = log_path.read_text(encoding="utf-8").splitlines()[0]
    assert header == "actor,message,tool_call,timestamp"
    assert log_path.read_text(encoding="utf-8").count("actor,message") == 1


def test_conversation_log_has_four_fields_and_is_append_only(monkeypatch: Any, tmp_path: Any) -> None:
    log_path = tmp_path / "conversation_log.csv"
    monkeypatch.setattr(inventory_agent, "CONVERSATION_LOG", log_path)

    def fake_create(**kwargs: Any) -> SimpleNamespace:
        message = SimpleNamespace(content="Hello.", tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=fake_create)))

    first_session = inventory_agent.AgentSession(session_id="session-1")
    first_session.handle_turn(client, "Hi")
    rows_after_first = log_path.read_text(encoding="utf-8")

    second_session = inventory_agent.AgentSession(session_id="session-2")
    second_session.handle_turn(client, "Hi again")
    rows_after_second = log_path.read_text(encoding="utf-8")

    assert rows_after_first in rows_after_second
    assert rows_after_second.startswith("actor,message,tool_call,timestamp\n")
    with log_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == ["actor", "message", "tool_call", "timestamp"]
        rows = list(reader)
    assert len(rows) == 4
    assert [row["actor"] for row in rows] == ["user", "agent", "user", "agent"]
    assert {key for row in rows for key in row.keys()} == {
        "actor",
        "message",
        "tool_call",
        "timestamp",
    }


FORBIDDEN_AGENT_IMPORTS = (
    "langchain",
    "llama_index",
    "llamaindex",
    "autogen",
    "crewai",
    "semantic_kernel",
    "langgraph",
)


def test_agent_is_plain_python_without_frameworks() -> None:
    source = Path(__file__).resolve().parents[1] / "agent.py"
    text = source.read_text(encoding="utf-8")
    for package in FORBIDDEN_AGENT_IMPORTS:
        assert f"import {package}" not in text
        assert f"from {package}" not in text
    assert "def observe(" in text
    assert "def think(" in text
    assert "def act(" in text
    assert "def update(" in text
    assert "def run_agent_loop(" in text
