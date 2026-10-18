"""
test_server.py — Validación local de las herramientas del Servidor MCP
Incluye tests de seguridad, validación defensiva y guardarraíles (Fase 3).
"""

from data import PRODUCTS_DB, SUPPLIERS_DB
from server import (
    get_inventory_status,
    get_product_by_sku,
    list_company_suppliers,
    get_warehouses_overview,
    inventory_audit_report_prompt,
    create_restock_order,
    AUDIT_LOG,
)

def run_tests():
    print("🧪 [FASE 2] Verificando Herramientas de Lectura (Read-Only)...")

    # 1. Probar get_inventory_status
    all_products = get_inventory_status()
    print(f"✅ Total productos en inventario: {len(all_products)}")
    assert len(all_products) == 5, "Deberían ser 5 productos"

    zaragoza_products = get_inventory_status(warehouse="Zaragoza")
    print(f"✅ Productos en Zaragoza: {len(zaragoza_products)}")
    assert len(zaragoza_products) == 3, "Deberían ser 3 en Zaragoza"

    electronics = get_inventory_status(category="Electronics")
    print(f"✅ Productos Electronics: {len(electronics)}")
    assert len(electronics) == 2, "Deberían ser 2 de electrónica"

    # 2. Probar get_product_by_sku
    found_sku = get_product_by_sku("TF-ELEC-001")
    assert found_sku["found"] is True
    print(f"✅ Búsqueda SKU existente: {found_sku['product']['name']}")

    missing_sku = get_product_by_sku("TF-INVENTADO-999")
    assert missing_sku["found"] is False
    print(f"✅ Búsqueda SKU inexistente (manejo seguro): {missing_sku['message']}")

    # 3. Probar list_company_suppliers
    spain_suppliers = list_company_suppliers(country="Spain")
    assert len(spain_suppliers) == 2
    print(f"✅ Proveedores en España: {[s['name'] for s in spain_suppliers]}")

    # 4. Probar recurso estático
    overview = get_warehouses_overview()
    assert "Zaragoza" in overview and "Los Ángeles" in overview
    print("✅ Recurso de almacenes cargado correctamente.")

    # 5. Probar prompt
    prompt = inventory_audit_report_prompt()
    assert "get_inventory_status" in prompt
    print("✅ Prompt de auditoría cargado correctamente.")

    print("\n🛡️  [FASE 3] Verificando Guardarraíles de Seguridad (Security by Design)...")

    # G1: Rechazo de almacén no autorizado
    res_bad_wh = create_restock_order(
        sku="TF-ELEC-001",
        quantity=20,
        warehouse="Tokio",
        reason="Stock bajo",
        confirm_action=False,
    )
    assert res_bad_wh["success"] is False
    assert "Almacenes autorizados" in res_bad_wh["message"]
    print("✅ Guardarraíl 1 (Almacén no autorizado rechazado de forma segura):", res_bad_wh["message"])

    # G2: Rechazo por exceso de cantidad (Blast radius prevention)
    res_excess = create_restock_order(
        sku="TF-ELEC-001",
        quantity=9999,  # Supera límite de 200
        warehouse="Zaragoza",
        reason="Pedido masivo sin autorización",
        confirm_action=False,
    )
    assert res_excess["success"] is False
    print("✅ Guardarraíl 2 (Límite de cantidad excedido bloqueado):", res_excess["message"])

    # G3: Rechazo por SKU inexistente
    res_fake_sku = create_restock_order(
        sku="TF-NOEXISTE-000",
        quantity=10,
        warehouse="Zaragoza",
        reason="Comprobación de producto no existente",
        confirm_action=False,
    )
    assert res_fake_sku["success"] is False
    assert res_fake_sku["error_type"] == "NotFoundError"
    print("✅ Guardarraíl 3 (SKU inexistente detectado y protegido):", res_fake_sku["message"])

    # G4: Consentimiento explícito previo (Dry-Run / Previsualización)
    res_preview = create_restock_order(
        sku="TF-ELEC-001",
        quantity=30,
        warehouse="Zaragoza",
        reason="Reposición tras fin de semana",
        confirm_action=False,  # NO CONFIRMADO
    )
    assert res_preview["success"] is False
    assert res_preview["status"] == "pending_confirmation"
    assert "preview" in res_preview
    assert res_preview["preview"]["estimated_cost_usd"] == 1950.0  # 30 * 65.0
    print("✅ Guardarraíl 4 (Dry-Run / Confirmación previa requerida): Coste estimado", res_preview["preview"]["estimated_cost_usd"], "USD")

    # G5: Ejecución segura con confirmación explícita
    initial_log_count = len(AUDIT_LOG)
    res_confirmed = create_restock_order(
        sku="TF-ELEC-001",
        quantity=30,
        warehouse="Zaragoza",
        reason="Reposición tras fin de semana",
        confirm_action=True,  # CONFIRMADO
    )
    assert res_confirmed["success"] is True
    assert res_confirmed["status"] == "executed"
    assert len(AUDIT_LOG) == initial_log_count + 1
    print(f"✅ Guardarraíl 5 (Orden ejecutada y registrada en auditoría): {res_confirmed['order']['order_id']}")

    print("\n🎉 ¡TODOS LOS GUARDARRAÍLES Y PRUEBAS DE SEGURIDAD PASARON AL 100%!")

if __name__ == "__main__":
    run_tests()
