# Brasaland — real-time communication (Part 2)

This CONTEXT is the contract for WebSocket chat with the commercial knowledge assistant. Part 1 SSE / operational tickets live in [`../notification/`](../notification/README.md) — do **not** reuse `ticket_id`, `emergency_order`, `waste_escalation`, or `*_created` SSE event names here.

## Agent

| Field | Value |
|-------|--------|
| `agent_id` | `brasaland_knowledge_assistant` |
| Role | Commercial knowledge assistant (salesperson perspective) |
| Knowledge | RAG collection `brasaland_kb` only |
| HTTP (unchanged) | `POST /knowledge/query` → `{ "answer": "..." }` |
| WebSocket | `WS /knowledge/ws?token=...&session_id=...` (or `thread_id`) in `services/api/` |
| UI | existing `uis/knowledge/` (`index.html`, `chat.js`) |
| Tests | `tests/api/test_websocket_chat.py` |

The assistant must not invent company facts, must not convert USD/COP, and must not claim zero allergen risk. Unknown answers: *"There is not enough information available."*

## Streaming source (not LangGraph)

`brasaland_knowledge_assistant` is a RAG function (`data.pipelines.rag.query` / `query_stream`), not a LangGraph graph. There is no `astream(..., stream_mode=...)`. Generation is OpenAI Chat Completions with `stream=True`; each item is `choices[0].delta.content`.

If this were LangGraph, those modes would mean:

| Mode | What it emits | Use for token UI? |
|------|----------------|-------------------|
| `messages` | `(AIMessageChunk, metadata)` as the LLM writes | Yes — token-level |
| `values` | Full graph state after each super-step | No — too coarse |
| `updates` | `{node_name: update}` after each node | No — too coarse |
| `custom` | Whatever nodes pass to `StreamWriter` | Only if you wrote token strings |

We stream **token by token** over the bound socket using LangGraph **`messages`** mode (the only mode that yields LLM tokens). Implementation: `query_stream()` → producer publishes one `knowledge_token` per `delta.content` → the socket **consumes** that topic. `values` and `updates` are node-granularity and are not used. `custom` is unused because the OpenAI stream already is the token source.

## Pub/sub (in-process)

Agent event production is decoupled from WebSocket connections. `KnowledgeProducer` publishes named events onto `ChatEventHub` keyed by `session_id` / `thread_id`. Each authenticated socket **subscribes** to that topic and forwards frames to the client. Redis is not required; the in-memory hub is the backplane for this deliverable. Do not call `websocket.send_json` from the generation loop.

`knowledge_interrupt` **aborts generation**: close the model HTTP stream and cancel the turn task so no further `knowledge_token` events are produced for that reply. This is not LangGraph `interrupt()` HITL — there is no graph to pause. Use graph `interrupt()` only if you later add a separate HITL pause; it is not a substitute for stopping the model stream.

## Chat session fields

Every JWT-authenticated `WS /knowledge/ws` connection must already name a conversation thread in the handshake URL. Create the thread with `POST /knowledge/sessions`, then connect:

`WS /knowledge/ws?token=...&session_id=BRS-CHAT-000001`

`thread_id` is accepted as a LangGraph-style alias of the same `BRS-CHAT-` value — this agent is not a LangGraph graph. Missing or unknown ids are rejected **before** `knowledge_session` (close code `4404`). Disconnecting detaches the socket but **keeps** the thread checkpoint (`messages`). Reconnect with the same `session_id` / `thread_id` restores that history on `knowledge_session` — not an empty chat.

Auth is the **same backoffice JWT** as `POST /auth/login`, ticket REST, and Part 1 SSE (`aud: brasaland-backoffice`). Browsers cannot set `Authorization` on the WebSocket handshake, so the client must pass the token:

- on connect: `WS /knowledge/ws?token=...&session_id=...` (also accepts `?access_token=` and `?thread_id=`)
- and/or as the first client frame: `{ "event": "knowledge_auth", "token": "..." }` (the thread id still belongs on the URL)

Reject unauthenticated sockets **before** `knowledge_session` or any other chat event (close code `4401`). Do not create a thread on connect.

These are **not** ticket fields.

| Field | Domain value |
|-------|----------------|
| `session_id` | Server-assigned `BRS-CHAT-000001`, … — required on the handshake URL |
| `thread_id` | Same value as `session_id` (LangGraph-style alias) |
| `company` | always `brasaland` |
| `agent_id` | always `brasaland_knowledge_assistant` |
| `status` | `idle`, `streaming`, or `interrupted` — server-assigned |
| `messages` | `{ "role": "user" \| "assistant", "content": "...", "created_at": "..." }` |
| `created_at` | ISO-8601 UTC, server-assigned |

## Named events

Every frame is JSON with an `event` field. Do not send a generic `message` event. Do not use SSE names (`emergency_order_created`, `waste_escalation_created`, `rfp_ticket_created`).

Client → server:

| `event` | Payload | Meaning |
|---------|---------|---------|
| `knowledge_auth` | `token` | First frame only, when the JWT was not passed as `?token=` / `?access_token=` |
| `knowledge_user_message` | `content` | New commercial question; starts a streamed answer |
| `knowledge_interrupt` | `content` (optional) | Abort the in-flight generation (close the model stream and cancel the turn task). Optional `content` steers a new turn. Not LangGraph HITL `interrupt()`. |

Server → client:

| `event` | Payload | Meaning |
|---------|---------|---------|
| `knowledge_session` | `session_id`, `thread_id`, `company`, `agent_id`, `status`, `messages` | Handshake, status changes, and thread checkpoint |
| `knowledge_token` | `session_id`, `thread_id`, `delta` | One `messages`-mode text chunk, flushed as generated |
| `knowledge_assistant_message` | `session_id`, `thread_id`, `content`, `status` (`complete` or `interrupted`) | End of the turn (full or partial) |
| `knowledge_error` | `detail` | Recoverable failure; connection may stay open |

## Manual check — reconnect checkpoint

1. Sign in at `/knowledge/` as `mariana` / `brasaland`.
2. Ask *What is Brasa Points?* and wait until the answer finishes streaming.
3. Note the `BRS-CHAT-` `session_id` on the session line.
4. Reload the page (or close the WebSocket in DevTools and wait for reconnect).
5. The same `session_id` must come back with the prior user question and assistant answer already in the log — not an empty chat.
6. A new thread (`POST /knowledge/sessions`, different `session_id`) must start empty.
