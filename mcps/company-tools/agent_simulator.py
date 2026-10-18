"""
agent_simulator.py — Simulador de Agente de IA conectado al Servidor MCP

Demuestra cómo un cliente/agente (como Claude Desktop, Antigravity,
un agente LangGraph u OpenClaw) se conecta por protocolo estándar stdio
al servidor MCP de TrackFlow, descubre sus capacidades y ejecuta acciones seguras.
"""

import asyncio
import json
import os
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_SCRIPT = os.path.join(CURRENT_DIR, "server.py")

async def run_agent_workflow():
    print("🤖 ==========================================================")
    print("🤖 INICIANDO SIMULADOR DE AGENTE IA (CLIENTE MCP OFICIAL)")
    print("🤖 ==========================================================\n")

    # 1. Configurar los parámetros de transporte stdio
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[SERVER_SCRIPT],
        env=dict(os.environ),
    )

    print("🔌 Conectando con el Servidor MCP TrackFlow vía stdio...")
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            # 2. Handshake inicial del protocolo MCP
            await session.initialize()
            print("✅ Handshake MCP completado con éxito.\n")

            # ─────────────────────────────────────────────────────────
            # PASO 1: Descubrimiento de Capacidades (Discovery)
            # ─────────────────────────────────────────────────────────
            print("🔍 [PASO 1] El Agente descubre las herramientas del servidor...")
            tools_response = await session.list_tools()
            tool_names = [t.name for t in tools_response.tools]
            print(f"   Tools descubiertas ({len(tool_names)}): {tool_names}")

            resources_response = await session.list_resources()
            resource_uris = [str(r.uri) for r in resources_response.resources]
            print(f"   Recursos descubiertos ({len(resource_uris)}): {resource_uris}")

            prompts_response = await session.list_prompts()
            prompt_names = [p.name for p in prompts_response.prompts]
            print(f"   Prompts descubiertos ({len(prompt_names)}): {prompt_names}\n")

            # ─────────────────────────────────────────────────────────
            # PASO 2: Lectura de Contexto Empresarial (Resource)
            # ─────────────────────────────────────────────────────────
            print("📖 [PASO 2] El Agente lee el documento de contexto operativo...")
            resource_content = await session.read_resource("trackflow://warehouses/overview")
            preview_text = resource_content.contents[0].text[:180].replace("\n", " ")
            print(f"   Contenido obtenido: \"{preview_text}...\"\n")

            # ─────────────────────────────────────────────────────────
            # PASO 3: El Agente consulta el inventario (Tool Call de lectura)
            # ─────────────────────────────────────────────────────────
            print("📦 [PASO 3] El Agente ejecuta 'get_inventory_status' para el almacén 'Zaragoza'...")
            inventory_call = await session.call_tool(
                "get_inventory_status",
                arguments={"warehouse": "Zaragoza"},
            )
            # En MCP, FastMCP serializa los elementos de la lista en content
            products = []
            for c in inventory_call.content:
                if hasattr(c, "text") and c.text.strip():
                    item = json.loads(c.text)
                    if isinstance(item, list):
                        products.extend(item)
                    else:
                        products.append(item)

            print(f"   Productos encontrados en Zaragoza: {len(products)}")
            critical_items = [p for p in products if p.get("status") in ("Low stock", "Out of stock")]
            for item in critical_items:
                print(f"   ⚠️  Alerta: {item['sku']} - {item['name']} | Stock: {item['stock_quantity']} (Mínimo: {item['min_stock_threshold']})")
            print()

            # ─────────────────────────────────────────────────────────
            # PASO 4: Intento de reabastecimiento SIN confirmación (Dry-Run)
            # ─────────────────────────────────────────────────────────
            target_sku = critical_items[0]["sku"]
            print(f"🛑 [PASO 4] El Agente solicita orden de reposición para {target_sku} sin confirmación...")
            dry_run_call = await session.call_tool(
                "create_restock_order",
                arguments={
                    "sku": target_sku,
                    "quantity": 20,
                    "warehouse": "Zaragoza",
                    "reason": "Reposición automática por nivel crítico de stock",
                    "confirm_action": False,
                },
            )
            dry_run_result = json.loads(dry_run_call.content[0].text)
            print(f"   Respuesta del Guardarraíl: {dry_run_result.get('warning')}")
            print(f"   Coste estimado calculado: ${dry_run_result.get('preview', {}).get('estimated_cost_usd')} USD\n")

            # ─────────────────────────────────────────────────────────
            # PASO 5: Confirmación explícita (Human-in-the-loop)
            # ─────────────────────────────────────────────────────────
            print(f"✅ [PASO 5] El Agente re-invoca con consentimiento explícito (confirm_action=True)...")
            confirmed_call = await session.call_tool(
                "create_restock_order",
                arguments={
                    "sku": target_sku,
                    "quantity": 20,
                    "warehouse": "Zaragoza",
                    "reason": "Reposición aprobada por supervisor de almacén",
                    "confirm_action": True,
                },
            )
            confirmed_result = json.loads(confirmed_call.content[0].text)
            order_data = confirmed_result.get("order", {})
            print(f"   Resultado: {confirmed_result.get('message')}")
            print(f"   ID de Orden: {order_data.get('order_id')} | Estado: {order_data.get('status')}")
            print(f"   Producto: {order_data.get('product_name')} | Unidades: {order_data.get('quantity')}\n")

    print("🎉 ==========================================================")
    print("🎉 FLUJO E2E DEL AGENTE COMPLETADO CON ÉXITO")
    print("🎉 ==========================================================")

if __name__ == "__main__":
    asyncio.run(run_agent_workflow())
