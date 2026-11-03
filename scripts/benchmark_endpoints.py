import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from services.api.main import app, ensure_admin_user

def run_benchmark():
    print("🚀 Iniciando Benchmark de Telemetría (Pre-Cache)...")
    ensure_admin_user()

    with TestClient(app) as client:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@nexova.com")
        admin_pass = os.getenv("ADMIN_PASSWORD", "nosimanda12345")

        login_res = client.post("/auth/login", data={"username": admin_email, "password": admin_pass})
        if login_res.status_code != 200:
            print(f"❌ Error al autenticar: {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("🔑 Autenticación exitosa. Ejecutando ráfagas de prueba...\n")

        endpoints_to_test = [
            ("GET /inventory/products", "/inventory/products"),
            ("GET /suppliers", "/suppliers"),
            ("GET /inventory/orders", "/inventory/orders"),
        ]

        results = {}

        for name, path in endpoints_to_test:
            latencies = []
            print(f"--- Probando: {name} ---")
            for i in range(1, 6):
                start = time.perf_counter()
                res = client.get(path, headers=headers)
                elapsed_ms = (time.perf_counter() - start) * 1000
                latencies.append(elapsed_ms)
                print(f"  Petición #{i}: Status {res.status_code} | {elapsed_ms:.2f}ms")
            
            avg_ms = sum(latencies) / len(latencies)
            results[name] = {
                "min": min(latencies),
                "max": max(latencies),
                "avg": avg_ms
            }
            print(f"  📊 Promedio: {avg_ms:.2f}ms\n")
        
        print("================ RESUMEN PRE-CACHE ================")
        for name, data in results.items():
            print(f"• {name}: Promedio = {data['avg']:.2f}ms (Mín: {data['min']:.2f}ms, Máx: {data['max']:.2f}ms)")
        print("===================================================")

if __name__ == "__main__":
    run_benchmark()
