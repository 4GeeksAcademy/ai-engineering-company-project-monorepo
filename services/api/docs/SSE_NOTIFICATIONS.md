# Sistemas en Tiempo Real: Notificaciones SSE (Parte 1 de 2)

## 📌 Contexto y Objetivo
Implementación de un sistema de notificaciones unidireccionales en tiempo real utilizando **Server-Sent Events (SSE)** en el backend FastAPI de TrackFlow.

A diferencia del sondeo periódico (*polling*), que satura la red y los servidores con peticiones HTTP repetitivas, o de los WebSockets, que introducen complejidad bidireccional y problemas con proxies/firewalls, **SSE** ofrece el transporte óptimo para notificaciones servidor ➔ cliente sobre HTTP estándar.

---

## 🏗️ Arquitectura de la Solución

```
   [ Clientes: Backoffice / Drivers / Web ]
                      │
                      │ 1. GET /api/notifications/stream?channel=all
                      ▼
        ┌───────────────────────────┐
        │   FastAPI SSE Endpoint    │ ──> HTTP 200 text/event-stream
        └───────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │   SSE Notification Bus    │ <── Triggers (Incidencias, Envíos, Alertas)
        │   (asyncio.Queue / PubSub)│
        └───────────────────────────┘
                      │
       ┌──────────────┴──────────────┐
       ▼                             ▼
Eventos de Negocio              Heartbeats
("event: incident_alert\n...")  (": ping\n\n")
```

---

## 📜 Contrato del Protocolo SSE

### 1. Cabeceras HTTP de Transporte
- `Content-Type: text/event-stream`: Identifica el flujo como eventos continuos.
- `Cache-Control: no-cache`: Evita que intermediarios almacenen en caché los eventos.
- `Connection: keep-alive`: Mantiene abierto el socket TCP.
- `X-Accel-Buffering: no`: Desactiva el almacenamiento en búfer en proxies reversos (ej. Nginx).

### 2. Formato del Envelope de Eventos
```text
event: incident_alert
id: evt_1729267200000
retry: 5000
data: {"id": "INC-001", "severity": "CRITICAL", "message": "Retraso en ruta A-2"}

```

### 3. Heartbeats (Keep-Alive)
Cada 15 segundos de inactividad, el servidor emite una línea de comentario SSE:
```text
: ping

```
Esto previene que cortafuegos o proxies de balanceo de carga corten la conexión por inactividad (*idle timeout*).

### 4. Soporte de Reconexión Automática
El navegador envía automáticamente la cabecera `Last-Event-ID` al reconectarse tras una caída de red, permitiendo reanudar el flujo desde el último evento recibido.

---

## 🚀 Endpoints de la API

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/notifications/stream` | Stream continuo de eventos SSE (`text/event-stream`). Parámetro opcional `?channel=incidents` |
| `POST` | `/api/notifications/publish` | Publica un nuevo evento en el bus para ser distribuido a todos los clientes conectados |
| `GET` | `/api/notifications/stats` | Métricas operativas (clientes conectados activos, total de eventos emitidos) |
