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

from services.safe_errors import ExternalServiceError, call_external, public_error_text

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CONVERSATION_LOG = Path("conversation_log.csv")
LOG_HEADERS = ["actor", "message", "tool_call", "timestamp"]
EXPECTED_LOG_HEADER = ",".join(LOG_HEADERS)

SYSTEM_PROMPT = """You are an inventory management assistant for a restaurant company.
You help staff check stock, add products, update quantities, and review low-stock alerts.
Use the available tools to read and update inventory through the company API.
Answer clearly and concisely after you have the data you need."""

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_inventory",
            "description": "Return the full list of products currently in inventory.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_product",
            "description": "Add a new product to inventory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Product name"},
                    "quantity": {"type": "integer", "description": "Initial stock quantity", "minimum": 0},
                    "unit": {"type": "string", "description": "Unit of measure, e.g. kg, boxes, liters"},
                },
                "required": ["name", "quantity", "unit"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_stock",
            "description": "Update stock for a product by applying a delta. Positive delta adds stock; negative delta removes stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "integer", "description": "ID of the product to update"},
                    "delta": {"type": "integer", "description": "Amount to add (positive) or remove (negative)"},
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
            "description": "Return products whose quantity is below the configured threshold.",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "integer",
                        "description": "Alert when quantity is below this value",
                        "default": 10,
                        "minimum": 0,
                    }
                },
                "additionalProperties": False,
            },
        },
    },
]


def _ensure_log_schema() -> None:
    if not CONVERSATION_LOG.exists() or CONVERSATION_LOG.stat().st_size == 0:
        return
    first_line = CONVERSATION_LOG.read_text(encoding="utf-8").splitlines()[0]
    if first_line == EXPECTED_LOG_HEADER:
        return
    backup = CONVERSATION_LOG.with_suffix(".csv.bak")
    if backup.exists():
        backup.unlink()
    CONVERSATION_LOG.rename(backup)
    print("Backed up an old conversation log.", file=sys.stderr)


def log_event(actor: str, message: str = "", tool_call: str = "") -> None:
    file_exists = CONVERSATION_LOG.exists() and CONVERSATION_LOG.stat().st_size > 0
    with CONVERSATION_LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=LOG_HEADERS)
        if not file_exists:
            writer.writeheader()
        writer.writerow(
            {
                "actor": actor,
                "message": message,
                "tool_call": tool_call,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )


def _api_request(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{API_BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if body is not None else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        try:
            parsed = json.loads(detail)
        except json.JSONDecodeError:
            parsed = {"detail": public_error_text(detail or error.reason, "API request failed")}
        else:
            raw_detail = parsed.get("detail") if isinstance(parsed, dict) else parsed
            parsed = public_error_text(str(raw_detail), "API request failed")
        return {"error": True, "status_code": error.code, "detail": parsed}
    except (urllib.error.URLError, TimeoutError, OSError):
        return {
            "error": True,
            "status_code": 0,
            "detail": "Could not reach the inventory API.",
        }


def execute_tool(name: str, arguments: dict[str, Any]) -> Any:
    if name == "list_inventory":
        return _api_request("GET", "/inventory")
    if name == "add_product":
        return _api_request("POST", "/inventory", arguments)
    if name == "update_stock":
        product_id = arguments["product_id"]
        return _api_request("PATCH", f"/inventory/{product_id}", {"delta": arguments["delta"]})
    if name == "get_low_stock_alerts":
        threshold = arguments.get("threshold", 10)
        query = urllib.parse.urlencode({"threshold": threshold})
        return _api_request("GET", f"/inventory/alerts?{query}")
    return {"error": True, "detail": f"Unknown tool: {name}"}


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


def run_agent_turn(client: OpenAI, messages: list[dict[str, Any]]) -> str:
    while True:
        response = call_external(
            "language model",
            lambda: client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            ),
        )
        try:
            message = response.choices[0].message
        except (AttributeError, IndexError) as error:
            raise ExternalServiceError("language model") from error
        messages.append(_assistant_message_payload(message))

        if not message.tool_calls:
            final_response = message.content or ""
            log_event("agent", message=final_response)
            return final_response

        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            try:
                tool_args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_args = {}
            if tool_args is None:
                tool_args = {}

            log_event(
                "agent",
                message=message.content or "",
                tool_call=json.dumps({"name": tool_name, "arguments": tool_args}),
            )
            tool_result = execute_tool(tool_name, tool_args)
            tool_content = json.dumps(tool_result)
            log_event("tool", message=tool_content, tool_call=tool_name)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_content,
                }
            )


def check_api_available() -> bool:
    try:
        urllib.request.urlopen(f"{API_BASE_URL}/inventory", timeout=3)
        return True
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


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

    _ensure_log_schema()
    session_id = str(uuid.uuid4())
    try:
        client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            timeout=30.0,
        )
    except Exception:
        print("language model is unavailable", file=sys.stderr)
        log_event("system", message="language model is unavailable")
        return 1
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    print(f"Inventory Agent (session {session_id})")
    print("Type your message and press Enter. Type 'exit' or 'quit' to end.\n")
    log_event("system", message=f"Session started at {API_BASE_URL}")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            log_event("system", message="Session ended")
            break

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye.")
            log_event("system", message="Session ended by user")
            break

        messages.append({"role": "user", "content": user_input})
        log_event("user", message=user_input)

        try:
            response = run_agent_turn(client, messages)
        except ExternalServiceError as error:
            print(f"Agent error: {error}", file=sys.stderr)
            log_event("system", message=str(error))
            continue
        except Exception as error:
            safe = public_error_text(str(error), "language model is unavailable")
            print(f"Agent error: {safe}", file=sys.stderr)
            log_event("system", message=safe)
            continue

        print(f"Agent: {response}\n")

    print("Conversation log updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
