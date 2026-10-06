#!/usr/bin/env bash
# Post one mixed telemetry batch to the running Brasaland API.
# Valid events are stored. The last item fails the envelope contract and is rejected.
# Usage: services/api/scripts/send_mixed_batch.sh [endpoint]
set -euo pipefail

ENDPOINT="${1:-${TELEMETRY_ENDPOINT:-http://127.0.0.1:8000/telemetry/events}}"

curl -sS -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON'
{
  "events": [
    {
      "eventID": "11111111-1111-4111-8111-111111111111",
      "timestamp": "2026-09-22T15:04:05Z",
      "sessionID": "02020202-0202-4202-8202-020202020202",
      "UserID": "7",
      "Event_type": "sale_completed",
      "SchemaVersion": 1,
      "requestID": "01010101-0101-4101-8101-010101010101",
      "source": "uis.backoffice",
      "tags": {
        "source": "uis.backoffice",
        "location_scope": "location",
        "location_id": "co-med-centro",
        "country": "Colombia",
        "currency": "COP"
      },
      "properties": {
        "location_scope": "location",
        "location_id": "co-med-centro",
        "country": "Colombia",
        "currency": "COP",
        "amount": 48000,
        "timezone": "America/Bogota"
      }
    },
    {
      "eventID": "22222222-2222-4222-8222-222222222222",
      "timestamp": "2026-09-22T15:04:06Z",
      "sessionID": "02020202-0202-4202-8202-020202020202",
      "UserID": "7",
      "Event_type": "api_latency_recorded",
      "SchemaVersion": 1,
      "requestID": "01010101-0101-4101-8101-010101010101",
      "source": "uis.backoffice",
      "tags": {"source": "uis.backoffice", "location_scope": "none"},
      "properties": {
        "location_scope": "none",
        "method": "GET",
        "route_template": "/inventory",
        "http_status": 200,
        "duration_ms": 180,
        "outcome": "ok"
      }
    },
    {
      "eventID": "33333333-3333-4333-8333-333333333333",
      "timestamp": "2026-09-22T15:04:07Z",
      "sessionID": "02020202-0202-4202-8202-020202020202",
      "UserID": "7",
      "Event_type": "client_exception_caught",
      "SchemaVersion": 1,
      "requestID": "01010101-0101-4101-8101-010101010101",
      "source": "uis.backoffice",
      "tags": {"source": "uis.backoffice", "location_scope": "none"},
      "properties": {
        "location_scope": "none",
        "app": "backoffice",
        "catch_site": "error_boundary",
        "error_name": "TypeError",
        "path": "/accessible"
      }
    },
    {
      "event_type": "section_viewed"
    }
  ]
}
JSON
echo
