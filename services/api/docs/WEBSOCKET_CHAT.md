# WEBSOCKET_CHAT.md — Especificación Técnica: Streaming de Chat por WebSocket
**Módulo:** Real-Time Communication (Parte 2 de 2)  
**Proyecto:** TrackFlow Monorepo — Asistente de Operaciones y Chat en Tiempo Real  
**Fecha:** 18 de Octubre, 2026

---

## 1. Contexto y Objetivos

En sistemas logísticos y de gestión de incidencias como TrackFlow, las consultas conversacionales con agentes inteligentes requieren una experiencia fluida y de baja latencia. Mientras que Server-Sent Events (SSE) es ideal para notificaciones unidireccionales del servidor al cliente, **WebSocket** proporciona un canal **bidireccional full-duplex** persistente sobre una única conexión TCP.

### Objetivos Principales:
1. **Canal Bidireccional Persistente**: Establecer conexión WebSocket en `/ws/chat/{session_id}` con handshake RFC 6455.
2. **Streaming Incremental de Respuestas**: Emitir fragmentos (chunks) de respuesta token por token a medida que se generan, eliminando tiempos de espera muertos.
3. **Gestión de Sesiones Concurrentes**: Soporte multi-cliente y multi-pestaña por `session_id` con aislamiento estricto de conversaciones.
4. **Resiliencia y Monitoreo**: Mecanismo de heartbeat bidireccional (`ping`/`pong`), reconexión fluida y liberación determinista de recursos de memoria al desconectar.

---

## 2. Arquitectura de Componentes

```mermaid
graph TD
    Client[Cliente Web / Backoffice] <-->|WebSocket: ws://host/ws/chat/{session_id}| Router[FastAPI Router: routes/chat_ws.py]
    Router <--> Manager[ConnectionManager: services/websocket_manager.py]
    Router <--> Engine[ChatStreamService: services/chat_stream_service.py]
    Engine <--> History[(Memoria de Sesión en Memoria / TinyDB)]
    Manager --> Metrics[Métricas de Conexiones Activas]
```

### Componentes:
- **`models/chat_models.py`**: Modelos Pydantic v2 que tipan estrictamente los mensajes intercambiados (cliente/servidor), estados de conexión y estructuras de historial.
- **`services/websocket_manager.py` (`ConnectionManager`)**: Administrador en memoria de sockets vivos. Soporta envío individual, broadcast por sesión y recolección de métricas.
- **`services/chat_stream_service.py` (`ChatStreamService`)**: Orquestador del flujo conversacional para TrackFlow. Procesa el mensaje del usuario, consulta contexto relevante (incidencias, flota, proveedores) y emite fragmentos de streaming de forma asíncrona.
- **`routes/chat_ws.py`**: Router de FastAPI que expone:
  - `WEBSOCKET /ws/chat/{session_id}`
  - `GET /api/chat/sessions/{session_id}/history` (recuperación REST del historial de la sesión)
  - `GET /api/chat/stats` (métricas de sockets y sesiones vivas)
  - `DELETE /api/chat/sessions/{session_id}` (limpieza de sesión)

---

## 3. Protocolo de Mensajería JSON

Todos los mensajes se serializan como objetos JSON con un campo discriminador obligatorio `type`.

### 3.1 Mensajes Cliente -> Servidor

| Tipo | Payload | Propósito |
|---|---|---|
| `user_message` | `{"type": "user_message", "content": "Estado del camión 102"}` | Envía una pregunta o instrucción al asistente. |
| `ping` | `{"type": "ping", "timestamp": "2026-10-18T12:00:00Z"}` | Comprobación de latencia y mantenimiento de conexión activa. |
| `clear_history` | `{"type": "clear_history"}` | Reinicia el historial conversacional de la sesión actual. |

### 3.2 Mensajes Servidor -> Cliente

| Tipo | Payload | Propósito |
|---|---|---|
| `connection_ack` | `{"type": "connection_ack", "session_id": "...", "client_id": "...", "history_count": 0}` | Confirma la aceptación del socket y estado de la sesión. |
| `chat_start` | `{"type": "chat_start", "message_id": "msg_001", "session_id": "..."}` | Notifica que el asistente ha comenzado a responder. |
| `chat_chunk` | `{"type": "chat_chunk", "message_id": "msg_001", "chunk": "Analizando...", "index": 0}` | Fragmento individual de texto emitido en tiempo real. |
| `chat_complete`| `{"type": "chat_complete", "message_id": "msg_001", "full_content": "...", "duration_ms": 320}` | Señal de fin de generación con el texto consolidado. |
| `pong` | `{"type": "pong", "timestamp": "...", "client_timestamp": "..."}` | Respuesta inmediata al `ping` del cliente. |
| `error` | `{"type": "error", "code": "INVALID_FORMAT", "detail": "Mensaje no reconocido"}` | Notificación de error operativo o sintáctico. |

---

## 4. Garantías de Resiliencia y Ciclo de Vida

1. **Aceptación de Conexión**:
   - `await websocket.accept()` en el endpoint.
   - Registro en `ConnectionManager.connect(session_id, websocket)`.
   - Envío de `connection_ack` con identificador único de conexión.
2. **Aislamiento de Sesiones**:
   - Mensajes emitidos para la sesión `session_A` jamás se filtran a `session_B`.
   - Múltiples clientes conectados a la misma sesión reciben las actualizaciones en broadcast coordinado.
3. **Liberación de Memoria Garantizada**:
   - Bloque `try ... finally` en el bucle principal de lectura.
   - `ConnectionManager.disconnect(session_id, websocket)` elimina sockets cerrados para evitar fugas de memoria.
