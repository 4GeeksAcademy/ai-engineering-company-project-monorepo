from __future__ import annotations

"""Inventory agent with a manual observe/think/act/update loop in plain Python.

No agent frameworks (LangChain, LlamaIndex, AutoGen, etc.) — only the Groq
OpenAI-compatible client for LLM requests and stdlib/urllib for API calls.
"""
import csv
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CONVERSATION_LOG = Path("conversation_log.csv")
LOG_HEADERS = ["actor", "message", "tool_call", "timestamp"]

SYSTEM_PROMPT = """You are the inventory assistant for Carla's coffee shop supply store.
The business has two physical locations: Downtown and Riverside.

Help Carla in natural language: check stock, register new products, log deliveries
(positive stock delta), log sales (negative stock delta), and flag items that cannot
cover a typical week.

Each product has quantity, unit, location, and weekly_demand (typical units used per week).
To answer "do we have enough for the week?", compare quantity to weekly_demand at that location.
The same product name can exist at both stores — always use the matching product_id.

Use tools to read and update inventory. Do not guess stock numbers. After tools return,
answer clearly and concisely."""

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_inventory",
            "description": (
                "GET /inventory — Return the full product list from inventory. "
                "Use this to see every product_id, name, quantity, and unit before updating stock. "
                "Optionally filter by store location."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "enum": ["Downtown", "Riverside"],
                        "description": "If set, return only products at this store. Omit to return all products.",
                    }
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_product",
            "description": (
                "POST /inventory/{product_id} — Add a new product to inventory. "
                "Requires a unique product_id plus name, quantity, and unit. "
                "Fails if that product_id already exists."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Unique id for the new product (path parameter).",
                    },
                    "name": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Product name, e.g. Arabica beans.",
                    },
                    "quantity": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Initial stock quantity (non-negative integer).",
                    },
                    "unit": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Unit of measure, e.g. kg, liters, sleeves, bottles.",
                    },
                    "location": {
                        "type": "string",
                        "enum": ["Downtown", "Riverside"],
                        "description": "Store that holds this stock. Defaults to Downtown if omitted.",
                    },
                    "weekly_demand": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Typical units used per week at this store. Optional; defaults to 0.",
                    },
                },
                "required": ["product_id", "name", "quantity", "unit"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_stock",
            "description": (
                "PATCH /inventory/{product_id} — Update stock of an existing product. "
                "Pass delta: a positive integer for incoming stock (delivery), "
                "or a negative integer for outgoing stock (sale or usage). "
                "Quantity cannot go below 0."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Id of the existing product to update.",
                    },
                    "delta": {
                        "type": "integer",
                        "description": (
                            "Stock change to apply. Positive adds incoming stock; "
                            "negative subtracts outgoing stock."
                        ),
                    },
                },
                "required": ["product_id", "delta"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_alerts",
            "description": (
                "GET /inventory/alerts — Return all products whose quantity is below "
                "a configurable threshold. Default threshold is 10 units."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "integer",
                        "minimum": 0,
                        "default": 10,
                        "description": "Alert when quantity is strictly below this value. Default: 10.",
                    },
                    "location": {
                        "type": "string",
                        "enum": ["Downtown", "Riverside"],
                        "description": "If set, only alert for products at this store.",
                    },
                },
                "additionalProperties": False,
            },
        },
    },
]


def log_event(actor: str, message: str = "", tool_call: str = "") -> None:
    """Append one row with actor, message, tool_call, timestamp. Never overwrite the file."""
    write_header = not CONVERSATION_LOG.exists() or CONVERSATION_LOG.stat().st_size == 0
    with CONVERSATION_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=LOG_HEADERS, extrasaction="ignore")
        if write_header:
            writer.writeheader()
        writer.writerow(
            {
                "actor": actor,
                "message": message,
                "tool_call": tool_call,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        handle.flush()


def log_user_message(text: str) -> None:
    log_event("user", message=text)


def log_agent_response(text: str) -> None:
    log_event("agent", message=text)


def log_tool_call(name: str, arguments: dict[str, Any]) -> None:
    log_event("agent", tool_call=json.dumps({"name": name, "arguments": arguments}, sort_keys=True))


def log_tool_result(name: str, result: Any) -> None:
    log_event("tool", message=json.dumps(result), tool_call=name)


def _api_request(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{API_BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if body is not None else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(request) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        try:
            parsed = json.loads(detail)
        except json.JSONDecodeError:
            parsed = {"detail": detail or error.reason}
        return {"error": True, "status_code": error.code, "detail": parsed}
    except urllib.error.URLError as error:
        return {
            "error": True,
            "status_code": 0,
            "detail": f"Could not reach API at {API_BASE_URL}: {error}",
        }


def tool_to_api_request(name: str, arguments: dict[str, Any]) -> tuple[str, str, dict[str, Any] | None]:
    """Map an LLM tool call to the matching inventory HTTP request."""
    if name == "list_inventory":
        location = arguments.get("location")
        if location:
            query = urllib.parse.urlencode({"location": location})
            return "GET", f"/inventory?{query}", None
        return "GET", "/inventory", None
    if name == "add_product":
        product_id = arguments["product_id"]
        body = {key: arguments[key] for key in ("name", "quantity", "unit") if key in arguments}
        if arguments.get("location"):
            body["location"] = arguments["location"]
        if "weekly_demand" in arguments:
            body["weekly_demand"] = arguments["weekly_demand"]
        return "POST", f"/inventory/{product_id}", body
    if name == "update_stock":
        return "PATCH", f"/inventory/{arguments['product_id']}", {"delta": arguments["delta"]}
    if name == "get_low_stock_alerts":
        query_params: dict[str, Any] = {"threshold": arguments.get("threshold", 10)}
        if arguments.get("location"):
            query_params["location"] = arguments["location"]
        query = urllib.parse.urlencode(query_params)
        return "GET", f"/inventory/alerts?{query}", None
    raise ValueError(f"Unknown tool: {name}")


def execute_tool(name: str, arguments: dict[str, Any]) -> Any:
    """Call the API endpoint that corresponds to the tool the LLM selected."""
    try:
        method, path, body = tool_to_api_request(name, arguments)
    except (KeyError, TypeError, ValueError) as error:
        return {"error": True, "detail": str(error)}
    return _api_request(method, path, body)


def inject_tool_result(
    messages: list[dict[str, Any]],
    tool_call_id: str,
    tool_result: Any,
) -> dict[str, Any]:
    """Put the API response into the LLM context as a tool message."""
    tool_message = {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": json.dumps(tool_result),
    }
    messages.append(tool_message)
    return tool_message


def _assistant_message_payload(message: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "role": "assistant",
        "content": message.content or "",
    }
    if message.tool_calls:
        payload["tool_calls"] = [
            {
                "id": tool_call.id,
                "type": "function",
                "function": {
                    "name": tool_call.function.name,
                    "arguments": tool_call.function.arguments,
                },
            }
            for tool_call in message.tool_calls
        ]
    return payload


MAX_TOOL_ROUNDS = 8


def observe(user_input: str, messages: list[dict[str, Any]]) -> str:
    """Observe: read the user message and add it to the conversation context."""
    messages.append({"role": "user", "content": user_input})
    log_user_message(user_input)
    return user_input


def think(client: OpenAI, messages: list[dict[str, Any]]) -> Any:
    """Think: send the full in-memory conversation and tool definitions to the LLM."""
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )
    message = response.choices[0].message
    finish_reason = getattr(response.choices[0], "finish_reason", None)
    if finish_reason is not None and getattr(message, "finish_reason", None) is None:
        try:
            message.finish_reason = finish_reason
        except (AttributeError, TypeError):
            pass
    messages.append(_assistant_message_payload(message))
    return message


def act(tool_call: Any) -> tuple[str, dict[str, Any], Any]:
    """Act: call the API endpoint for the tool the LLM selected."""
    tool_name = tool_call.function.name
    try:
        tool_args = json.loads(tool_call.function.arguments or "{}")
    except json.JSONDecodeError:
        tool_args = {}
    if tool_args is None:
        tool_args = {}
    log_tool_call(tool_name, tool_args)
    tool_result = execute_tool(tool_name, tool_args)
    return tool_name, tool_args, tool_result


def update(
    messages: list[dict[str, Any]],
    tool_call: Any,
    tool_name: str,
    tool_args: dict[str, Any],
    tool_result: Any,
    reasoning: str = "",
) -> None:
    """Update: inject the API result back into the LLM context, then the loop Thinks again."""
    tool_message = inject_tool_result(messages, tool_call.id, tool_result)
    log_tool_result(tool_name, tool_result)


def pending_tool_calls(message: Any) -> list[Any]:
    """Return tool calls that still need an API request. Empty means the turn is done."""
    calls = getattr(message, "tool_calls", None) or []
    return [call for call in calls if getattr(getattr(call, "function", None), "name", None)]


def is_final_llm_response(message: Any) -> bool:
    """True when the LLM produced a user-facing answer and has no pending tool calls."""
    finish_reason = getattr(message, "finish_reason", None)
    if finish_reason in {"stop", "end_turn"}:
        return not pending_tool_calls(message)
    return not pending_tool_calls(message)


def run_agent_loop(client: OpenAI, messages: list[dict[str, Any]], user_input: str) -> str:
    """Observe → Think → Act → Update → Repeat until a final response (no pending tools)."""
    observe(user_input, messages)

    for _ in range(MAX_TOOL_ROUNDS):
        message = think(client, messages)

        if is_final_llm_response(message):
            final_response = (message.content or "").strip()
            log_agent_response(final_response)
            return final_response

        for tool_call in pending_tool_calls(message):
            tool_name, tool_args, tool_result = act(tool_call)
            print(f"  [Act] {tool_name} -> API {json.dumps(tool_args)}")
            update(
                messages,
                tool_call,
                tool_name,
                tool_args,
                tool_result,
                reasoning=message.content or "",
            )
            print("  [Update] tool result injected into context")

    fallback = "I reached the tool-call limit before finishing. Please try a simpler request."
    log_agent_response(fallback)
    return fallback


class AgentSession:
    """Conversation history kept in memory for one CLI session.

    `conversation_log.csv` is append-only audit storage. It is never read back
    to rebuild context. Only this list is sent to the LLM on each Think step.
    """

    def __init__(self, session_id: str | None = None) -> None:
        self.session_id = session_id or str(uuid.uuid4())
        self.messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    def handle_turn(self, client: OpenAI, user_input: str) -> str:
        checkpoint = len(self.messages)
        try:
            return run_agent_loop(client, self.messages, user_input)
        except Exception:
            del self.messages[checkpoint:]
            raise


def check_api_available() -> bool:
    try:
        urllib.request.urlopen(f"{API_BASE_URL}/inventory", timeout=3)
        return True
    except urllib.error.URLError:
        return False


def read_user_input() -> str | None:
    """Read one line from the terminal. None means the session should end."""
    try:
        return input("You: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return None


def print_agent_response(response: str) -> None:
    """Write the agent's final reply to the terminal."""
    text = response.strip() if response else "(no response)"
    print(f"Agent: {text}", flush=True)
    print(flush=True)


def run_cli(session: AgentSession, client: OpenAI) -> None:
    """Simple CLI: read a user line, run the agent loop, print the reply, repeat."""
    print(f"Inventory Agent (session {session.session_id})")
    print(f"API: {API_BASE_URL} | Model: {GROQ_MODEL}")
    print("Type a question and press Enter. Type 'exit' or 'quit' to end.\n", flush=True)
    log_event("system", message=f"Session started at {API_BASE_URL}")

    while True:
        user_input = read_user_input()
        if user_input is None:
            print("Goodbye.")
            log_event("system", message="Session ended")
            break
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye.")
            log_event("system", message="Session ended by user")
            break

        try:
            response = session.handle_turn(client, user_input)
        except Exception as error:
            print(f"Agent error: {error}", file=sys.stderr)
            log_event("system", message=f"Agent error: {error}")
            continue

        print_agent_response(response)

    print(f"Conversation appended to {CONVERSATION_LOG}", flush=True)


def main() -> int:
    if not GROQ_API_KEY or GROQ_API_KEY == "your_key_here":
        print("Set GROQ_API_KEY in .env before running the agent.", file=sys.stderr)
        return 1

    if not check_api_available():
        print(
            "Could not reach the API. Start it first with: uvicorn api.app:app --reload",
            file=sys.stderr,
        )
        return 1

    session = AgentSession()
    client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    run_cli(session, client)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
