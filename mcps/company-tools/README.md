# Servidor MCP: Herramientas de la Empresa (TrackFlow)

Este servidor implementa el protocolo estándar **Model Context Protocol (MCP)** para conectar modelos y agentes de IA de forma segura con las herramientas y datos del sistema empresarial **TrackFlow**.

## 🎯 Propósito

Exponer capacidades operativas de la compañía (inventario, catálogo de productos, proveedores y reposición de stock) mediante herramientas tipadas y securizadas, aplicando el principio de menor privilegio y guardarraíles de seguridad.

---

## 🛠️ Primitivas Expuestas

### 1. Herramientas de Lectura (Read-Only)
* **`get_inventory_status(warehouse, category)`**: Consulta el inventario general o filtrado por almacén (`Zaragoza`, `Los Angeles`) o categoría (`Electronics`, `Fashion`, `Cosmetics`, `Home`).
* **`get_product_by_sku(sku)`**: Búsqueda precisa de la ficha de un producto por su código SKU (`TF-ELEC-001`).
* **`list_company_suppliers(country)`**: Consulta de proveedores y tarifas de transporte (`USA`, `Spain`).

### 2. Herramientas de Mutación / Acción (Escritura Segura)
* **`create_restock_order(sku, quantity, warehouse, reason, confirm_action)`**: Genera órdenes de reposición de producto bajo guardarraíles estrictos.

### 3. Recursos (Resources)
* **`trackflow://warehouses/overview`**: Documento de solo lectura con las especificaciones, cobertura y capacidades operativas de los almacenes oficiales.

### 4. Prompts Reusables
* **`inventory-audit-report`**: Plantilla prediseñada para instruir al agente en la detección y reporte de productos en estado crítico (*Low stock* o *Out of stock*).

---

## 🔒 Guardarraíles de Seguridad (Security by Design)

1. **Menor Privilegio (Least Privilege):** Separación tajante entre herramientas de consulta (lectura segura) y herramientas de mutación (escritura).
2. **Validación de Entradas con Pydantic:**
   * Tipado estricto en todos los parámetros.
   * `warehouse`: Restringido exclusivamente a almacenes autorizados (`Zaragoza`, `Los Angeles`).
   * `reason`: Longitud mínima obligatoria de 5 caracteres para asegurar justificación operativa.
3. **Control de Impacto (Blast Radius):**
   * Límite estricto de cantidad: Máximo 200 unidades por orden para evitar compras masivas o bucles descontrolados del agente.
4. **Consentimiento Explícito (Dry-Run / Human-in-the-Loop):**
   * Por defecto `confirm_action=False`. No se realiza ninguna compra sin confirmación previa; devuelve un desglose económico y resumen para que el usuario o supervisor dé el visto bueno.
5. **Auditoría y Trazabilidad:**
   * Cada acción confirmada genera un identificador de orden correlativo (`ORD-RESTOCK-XXXX`) almacenado en un registro de auditoría inmutable.

---

## 🚀 Instalación y Pruebas

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la suite de pruebas unitarias
python3 test_server.py

# 3. Ejecutar la simulación E2E de un agente conectado vía MCP (stdio)
python3 agent_simulator.py

# 4. Arrancar el servidor MCP en modo stdio (para clientes como Antigravity, Claude Desktop o LangGraph)
python3 server.py
```
