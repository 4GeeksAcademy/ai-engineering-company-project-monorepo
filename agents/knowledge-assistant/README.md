# Brasaland knowledge assistant

Commercial/operations chat agent that answers from the Brasaland knowledge base (`brasaland_kb`) in a salesperson voice.

| Field | Value |
|-------|--------|
| `agent_id` | `brasaland_knowledge_assistant` |
| Session prefix | `BRS-CHAT-` |
| Non-streaming | `POST /knowledge/query` |
| Streaming | `WS /knowledge/ws?token=&session_id=` (or `thread_id`) bound to an existing `BRS-CHAT-` thread |
| UI | `/knowledge/` (`uis/knowledge/`) |

Streaming source: OpenAI Chat Completions `stream=True` → `delta.content`, streamed over the socket as `knowledge_token` (LangGraph `messages` mode). This agent is not a LangGraph graph; do not transmit `values` or `updates`. `knowledge_interrupt` aborts the model stream and cancels the turn task; it is not LangGraph HITL `interrupt()`.

Layout: producer in `services/api/chat.py` (`KnowledgeProducer` + in-process `ChatEventHub`), WebSocket consumer in `services/api/routers/chat.py`, HTTP in `routers/knowledge.py`, chat UI in `uis/knowledge/` (`index.html`, `chat.js`), tests in `tests/api/test_websocket_chat.py`. Redis is not required.
