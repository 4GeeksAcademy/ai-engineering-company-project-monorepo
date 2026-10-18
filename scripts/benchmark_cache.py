#!/usr/bin/env python3
"""
Benchmark de caché para el backend de TrackFlow.

Mide tiempos de respuesta de los endpoints con y sin caché,
usando TestClient de FastAPI (sin necesidad de servidor HTTP).

Uso:
    cd /home/jonathan/Documentos/Proyectos/monorepo/jesteban1983-ai-engineering-company-project-monorepo
    python scripts/benchmark_cache.py
"""

import sys
import os
import time
import json

# Asegurar que el entorno virtual está activo
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api"))

from fastapi.testclient import TestClient

# Importar la app y el módulo de caché
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api"))
from main import app
from core.cache import cache_invalidate_prefix

client = TestClient(app)

# ─────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────
BOLD = "\033[1m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
RESET = "\033[0m"

def measure(label: str, method: str, url: str, **kwargs) -> float:
    """Ejecuta una request y devuelve el tiempo en ms."""
    start = time.perf_counter()
    if method.upper() == "GET":
        resp = client.get(url, **kwargs)
    elif method.upper() == "POST":
        resp = client.post(url, **kwargs)
    elif method.upper() == "PATCH":
        resp = client.patch(url, **kwargs)
    elif method.upper() == "DELETE":
        resp = client.delete(url, **kwargs)
    else:
        raise ValueError(f"Method {method} not supported")
    elapsed_ms = (time.perf_counter() - start) * 1000
    status = resp.status_code
    color = GREEN if status < 400 else RED
    print(f"  {color}{status}{RESET}  {elapsed_ms:>8.2f} ms  {label}")
    return elapsed_ms


def section(title: str):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")


# ─────────────────────────────────────────────────────────
# Benchmark
# ─────────────────────────────────────────────────────────
results = {}

section("1. GET /suppliers/ — lista completa (500 registros)")
# Limpiar caché primero
cache_invalidate_prefix("suppliers:")
results["suppliers_cold"] = measure("FRÍO  (1ª llamada)", "GET", "/suppliers/")
results["suppliers_hot"] = measure("CALIENTE (2ª llamada)", "GET", "/suppliers/")
results["suppliers_hot2"] = measure("CALIENTE (3ª llamada)", "GET", "/suppliers/")

section("2. GET /suppliers/{id} — detalle de un proveedor")
cache_invalidate_prefix("suppliers:")
results["supplier_detail_cold"] = measure("FRÍO  (1ª llamada)", "GET", "/suppliers/1")
results["supplier_detail_hot"] = measure("CALIENTE (2ª llamada)", "GET", "/suppliers/1")

section("3. GET /api/incidents/ — lista de incidencias (500 registros)")
cache_invalidate_prefix("incidents:")
results["incidents_cold"] = measure("FRÍO  (1ª llamada)", "GET", "/api/incidents/")
results["incidents_hot"] = measure("CALIENTE (2ª llamada)", "GET", "/api/incidents/")

section("4. GET /api/incidents/summary — resumen estadístico")
cache_invalidate_prefix("incidents:")
results["incidents_summary_cold"] = measure("FRÍO  (1ª llamada)", "GET", "/api/incidents/summary")
results["incidents_summary_hot"] = measure("CALIENTE (2ª llamada)", "GET", "/api/incidents/summary")

section("5. POST /api/incidents/ — creación (invalida caché)")
# Crear una incidencia de prueba
payload = {
    "title": "Incidencia de prueba para benchmark",
    "description": "Probando la invalidación de caché",
    "category": "tecnico",
    "branch": "centro"
}
cache_invalidate_prefix("incidents:")
results["incidents_post_cold"] = measure("CREAR incidencia", "POST", "/api/incidents/", json=payload)

# Verificar que la caché se invalidó — la siguiente lectura debería ser fría de nuevo
section("6. Invalidación — GET /api/incidents/ tras POST")
results["incidents_after_post"] = measure("GET tras POST (caché invalidada)", "GET", "/api/incidents/")

section("7. GET /api/incidents/{id} — detalle (SIN caché adrede)")
results["incident_detail_cold"] = measure("FRÍO  (1ª llamada, sin caché)", "GET", "/api/incidents/1")
results["incident_detail_hot"] = measure("CALIENTE (2ª llamada, sigue sin caché)", "GET", "/api/incidents/1")

# ─────────────────────────────────────────────────────────
# Resumen final
# ─────────────────────────────────────────────────────────
section("RESUMEN DE RESULTADOS")
print(f"  {'Endpoint':<40} {'Frío (ms)':<12} {'Caliente (ms)':<14} {'Mejora':<10}")
print(f"  {'-'*40} {'-'*12} {'-'*14} {'-'*10}")

pairs = [
    ("GET /suppliers/", "suppliers_cold", "suppliers_hot"),
    ("GET /suppliers/1", "supplier_detail_cold", "supplier_detail_hot"),
    ("GET /api/incidents/", "incidents_cold", "incidents_hot"),
    ("GET /api/incidents/summary", "incidents_summary_cold", "incidents_summary_hot"),
    ("GET /api/incidents/1", "incident_detail_cold", "incident_detail_hot"),
]

for label, cold_key, hot_key in pairs:
    cold = results.get(cold_key, 0)
    hot = results.get(hot_key, 0)
    if cold and hot:
        mejora = f"{(1 - hot/cold)*100:+.1f}%"
    else:
        mejora = "N/A"
    color = GREEN if cold > hot else YELLOW
    print(f"  {label:<40} {cold:<12.2f} {hot:<14.2f} {color}{mejora}{RESET}")

# Endpoint sin caché (intencional)
cold = results.get("incident_detail_cold", 0)
hot = results.get("incident_detail_hot", 0)
print(f"\n  {YELLOW}Nota: GET /api/incidents/{{id}} NO tiene caché (decisión de seguridad).{RESET}")
print(f"  {YELLOW}      Los tiempos son similares porque la BD es TinyDB en memoria.{RESET}")