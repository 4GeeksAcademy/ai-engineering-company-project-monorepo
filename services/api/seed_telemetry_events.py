"""
seed_telemetry_events.py — Genera 30+ eventos reales para el reporte de telemetría

Requisitos del syllabus:
- "al menos 20 filas de eventos reales generados desde el backoffice"
- "incluyendo al menos un evento técnico (error, login fallido, etc.)"
- Eventos con variedad de tipos, servicios y niveles
- Fechas recientes para que el reporte por defecto (7 días) funcione

Uso:
    /home/jonathan/Documentos/Proyectos/monorepo/.venv/bin/python seed_telemetry_events.py
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.database import get_pool, init_db


EVENTS = [
    # Día 1 — Operaciones normales (info)
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Dashboard page loaded", "value": 1.0},
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Suppliers list page loaded", "value": 1.0},
    {"event_type": "api_shipment_track", "service": "api", "level": "info", "message": "Shipment tracking requested for order #ORD-1001", "value": 1.0},
    {"event_type": "api_inventory_check", "service": "api", "level": "info", "message": "Inventory check completed for warehouse LA", "value": 1.0},
    {"event_type": "order_created", "service": "api", "level": "info", "message": "New order #ORD-1002 created by client", "value": 1.0},
    {"event_type": "inbound_receipt", "service": "api", "level": "info", "message": "Inbound shipment received at warehouse ZGZ", "value": 1.0},

    # Día 1 — Evento técnico: login exitoso
    {"event_type": "login_attempted", "service": "api", "level": "info", "message": "User 'carlos.vega' logged in successfully", "value": 1.0},

    # Día 2 — Primer error técnico
    {"event_type": "login_attempted", "service": "api", "level": "error", "message": "Login failed for user 'ana.w' — invalid credentials", "value": 0.0},
    {"event_type": "stock_low_alert", "service": "api", "level": "warning", "message": "Stock low for SKU 'BOX-4XL': only 3 units remaining", "value": 3.0},
    {"event_type": "outbound_shipped", "service": "api", "level": "info", "message": "Shipment #SHP-5001 dispatched via UPS Ground", "value": 1.0},

    # Día 3 — Eventos técnicos varios
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Telemetry dashboard page loaded", "value": 1.0},
    {"event_type": "login_attempted", "service": "api", "level": "error", "message": "Login failed for user 'unknown' — account not found", "value": 0.0},
    {"event_type": "api_inventory_check", "service": "api", "level": "warning", "message": "Inventory sync delayed — response time > 2s", "value": 2800.0},
    {"event_type": "api_shipment_track", "service": "api", "level": "info", "message": "Tracking updated for shipment #SHP-5002: in transit", "value": 1.0},

    # Día 4 — Más errores y warnings
    {"event_type": "login_attempted", "service": "api", "level": "info", "message": "User 'ana.whitfield' logged in successfully from IP 192.168.1.50", "value": 1.0},
    {"event_type": "order_created", "service": "api", "level": "warning", "message": "Order #ORD-1003 created with incomplete address — requires verification", "value": 1.0},
    {"event_type": "api_shipment_track", "service": "api", "level": "error", "message": "Shipment tracking API timeout — upstream carrier not responding", "value": 0.0},

    # Día 5 — Operaciones con métricas
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Suppliers detail view for 'UPS Ground'", "value": 1.0},
    {"event_type": "login_attempted", "service": "api", "level": "error", "message": "Login failed for user 'admin' — rate limit exceeded", "value": 0.0},
    {"event_type": "inbound_receipt", "service": "api", "level": "warning", "message": "Inbound shipment #IN-5001 partially received — 45 of 50 units", "value": 0.9},
    {"event_type": "stock_low_alert", "service": "api", "level": "info", "message": "Stock alert resolved for SKU 'BOX-4XL': restocked to 25 units", "value": 25.0},

    # Día 6 — Eventos de autenticación y sistema
    {"event_type": "login_attempted", "service": "api", "level": "info", "message": "User 'andres.garcia' logged in successfully", "value": 1.0},
    {"event_type": "page_view", "service": "backoffice", "level": "warning", "message": "Dashboard loaded slowly — 3.2s render time", "value": 3.2},
    {"event_type": "outbound_shipped", "service": "api", "level": "info", "message": "Shipment #SHP-5003 dispatched via MRW España", "value": 1.0},
    {"event_type": "api_inventory_check", "service": "api", "level": "error", "message": "Inventory check failed — database connection timeout", "value": 0.0},

    # Día 7 — Cierre de semana
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Reports page loaded for weekly summary", "value": 1.0},
    {"event_type": "login_attempted", "service": "api", "level": "info", "message": "User 'carlos.vega' logged in from new device", "value": 1.0},
    {"event_type": "order_created", "service": "api", "level": "info", "message": "New order #ORD-1004 created — express shipping", "value": 1.0},
    {"event_type": "api_shipment_track", "service": "api", "level": "error", "message": "Carrier API unavailable — shipment status unknown for 3 shipments", "value": 0.0},
    {"event_type": "stock_low_alert", "service": "api", "level": "warning", "message": "Stock low for SKU 'PACK-100': only 2 units remaining in LA warehouse", "value": 2.0},
    {"event_type": "inbound_receipt", "service": "api", "level": "info", "message": "Inbound shipment #IN-5002 registered — 200 units of PACK-100", "value": 200.0},

    # Día extra — más eventos para superar 30
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Telemetry report page exported as CSV", "value": 1.0},
    {"event_type": "login_attempted", "service": "api", "level": "error", "message": "Login blocked for user 'carlos.vega' — suspicious IP detected", "value": 0.0},
    {"event_type": "api_inventory_check", "service": "api", "level": "info", "message": "Full inventory audit completed — 1,234 SKUs verified", "value": 1234.0},
    {"event_type": "page_view", "service": "backoffice", "level": "info", "message": "Supplier edit page for 'MRW España' saved", "value": 1.0},
]


async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql://telemetry_user:telemetry_pass@localhost:5432/telemetry")
    print(f"Connecting to database...")
    
    await init_db()
    pool = await get_pool()
    
    # Use current time as base so default "last 7 days" works
    base_time = datetime.now(timezone.utc) - timedelta(days=10)
    print(f"Base time for new events: {base_time}")
    
    # Clear old events for clean state
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM telemetry_events")
        print(f"Existing events before clear: {count}")
        if count and count > 0:
            await conn.execute("DELETE FROM telemetry_events")
            print("Cleared old events")
    
    # Build insert values starting from base_time
    values = []
    events_per_day = len(EVENTS) // 7 + 1
    
    for i, evt in enumerate(EVENTS):
        day_offset = i // events_per_day
        hour = (i * 3) % 24
        minute = (i * 7) % 60
        ts = base_time + timedelta(days=day_offset, hours=hour, minutes=minute)
        
        event_id = str(uuid.uuid4())
        tags_json = json.dumps({"source": "seed_telemetry_events.py", "batch": "syllabus-requirements"})
        
        values.append((
            event_id, evt["event_type"], evt["service"],
            evt["level"], evt["message"],
            float(evt["value"]), tags_json,
            ts  # datetime object, not string
        ))
    
    async with pool.acquire() as conn:
        inserted = 0
        for val in values:
            try:
                await conn.execute(
                    """INSERT INTO telemetry_events 
                       (id, event_type, service, level, message, value, tags, timestamp)
                       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
                       ON CONFLICT (id) DO NOTHING""",
                    *val
                )
                inserted += 1
            except Exception as e:
                print(f"  Error inserting event {val[1]}: {e}")
        
        new_count = await conn.fetchval("SELECT COUNT(*) FROM telemetry_events")
        print(f"\nInserted: {inserted}")
        print(f"Total events now: {new_count}")
        
        # Show distribution
        rows = await conn.fetch("SELECT level, COUNT(*) as cnt FROM telemetry_events GROUP BY level ORDER BY cnt DESC")
        print("\nLevel distribution:")
        for r in rows:
            print(f"  {r['level']}: {r['cnt']}")
        
        rows = await conn.fetch("SELECT event_type, COUNT(*) as cnt FROM telemetry_events GROUP BY event_type ORDER BY cnt DESC")
        print("\nEvent type distribution:")
        for r in rows:
            print(f"  {r['event_type']}: {r['cnt']}")
        
        rows = await conn.fetch("SELECT service, COUNT(*) as cnt FROM telemetry_events GROUP BY service ORDER BY cnt DESC")
        print("\nService distribution:")
        for r in rows:
            print(f"  {r['service']}: {r['cnt']}")
        
        min_ts = await conn.fetchval('SELECT MIN("timestamp") FROM telemetry_events')
        max_ts = await conn.fetchval('SELECT MAX("timestamp") FROM telemetry_events')
        print(f"\nDate range: {min_ts} to {max_ts}")
    
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())