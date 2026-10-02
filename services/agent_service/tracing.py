"""Trace recorder for LangGraph agent — lightweight structured logging.

Each run produces a consultable trace dict, not just a final answer.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("agent.trace")


class TraceRecorder:
    """Records node execution order, inputs, and outputs per run."""

    def __init__(self) -> None:
        self._traces: dict[str, list[dict[str, Any]]] = {}

    def start_run(self, run_id: str, question: str) -> None:
        self._traces[run_id] = [
            {
                "run_id": run_id,
                "question": question,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "nodes": [],
            }
        ]

    def record_step(
        self,
        run_id: str,
        node: str,
        input_data: Any,
        output_data: Any,
    ) -> None:
        if run_id not in self._traces:
            return

        # Extract tool_type from the output if available (Part 2 extension)
        tool_type = None
        if isinstance(output_data, dict):
            tool_type = output_data.get("tool_type")

        self._traces[run_id][0]["nodes"].append(
            {
                "node": node,
                "tool_type": tool_type,  # "rag" | "ticket_tool" | "inventory_tool" | None
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "input": _summarize(input_data),
                "output": _summarize(output_data),
            }
        )
        logger.info("Trace [%s] node=%s tool=%s → %s", run_id, node, tool_type, _summarize(output_data))

    def get_trace(self, run_id: str) -> dict[str, Any] | None:
        raw = self._traces.get(run_id)
        if not raw:
            return None
        return raw[0]

    def export_trace(self, run_id: str) -> str | None:
        trace = self.get_trace(run_id)
        if trace is None:
            return None
        return json.dumps(trace, indent=2, ensure_ascii=False, default=str)


def _summarize(value: Any, max_len: int = 200) -> Any:
    """Truncate long strings for trace readability."""
    if isinstance(value, str):
        return value[:max_len] + "…" if len(value) > max_len else value
    if isinstance(value, dict):
        return {k: _summarize(v, max_len) for k, v in value.items()}
    if isinstance(value, list):
        return [_summarize(v, max_len) for v in value[:5]]
    return value


# Module-level singleton — shared across graph invocations.
_recorder = TraceRecorder()


def get_recorder() -> TraceRecorder:
    return _recorder


__all__ = ["TraceRecorder", "get_recorder"]