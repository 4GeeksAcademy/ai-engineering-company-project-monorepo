import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_request(method, endpoint, data=None, token=None, is_form=False):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    encoded_data = None
    if data:
        if is_form:
            encoded_data = urllib.parse.urlencode(data).encode('utf-8')
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            encoded_data = json.dumps(data).encode('utf-8')
            headers["Content-Type"] = "application/json"
            
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("--- INICIANDO PRUEBAS DE INVENTARIO ---")

print("\n1. Login como admin@nexova.com...")
status, resp = make_request("POST", "/auth/login", {"username": "admin@nexova.com", "password": "admin123"}, is_form=True)
if status != 200:
    print("Fallo el login. Quizas necesitemos correr seed.py primero.")
    print(resp)
    sys.exit(1)
token = resp["access_token"]
print("✅ Login exitoso. Token obtenido.")

print("\n2. Creando un Activo (Monitor Dell)...")
asset_data = {"name": "Monitor Dell 27", "sku": "MON-DELL-27", "department": "IT"}
status, resp = make_request("POST", "/inventory/products", asset_data, token)
if status == 201:
    print("✅ Activo creado exitosamente.")
    asset_id = resp["id"]
elif status == 400:
    print("⚠️ El activo ya existia.")
    status, all_assets = make_request("GET", "/inventory/products")
    asset_id = next(a["id"] for a in all_assets if a["sku"] == "MON-DELL-27")
else:
    print(f"Error: {resp}")
    sys.exit(1)

print("\n3. Entrando 50 monitores al almacén (Inbound)...")
inbound_data = {"asset_id": asset_id, "quantity": 50}
status, resp = make_request("POST", "/inventory/orders/inbound", inbound_data, token)
print(f"✅ Respuesta ({status}):", resp)

print("\n4. Intentando asignar 100 monitores (Debería fallar, Error 400)...")
outbound_data = {"asset_id": asset_id, "quantity": 100}
status, resp = make_request("POST", "/inventory/orders/outbound", outbound_data, token)
print(f"✅ Respuesta ({status}):", resp)

print("\n5. Asignando 5 monitores correctamente (Outbound)...")
outbound_data = {"asset_id": asset_id, "quantity": 5}
status, resp = make_request("POST", "/inventory/orders/outbound", outbound_data, token)
print(f"✅ Respuesta ({status}):", resp)

print("\n6. Verificando el Stock Final calculado...")
status, resp = make_request("GET", "/inventory/products")
asset = next(a for a in resp if a["id"] == asset_id)
print(f"✅ Stock Final del {asset['name']}: {asset['current_stock']} (Debería ser 45)")
print("\n--- PRUEBAS COMPLETADAS ---")
