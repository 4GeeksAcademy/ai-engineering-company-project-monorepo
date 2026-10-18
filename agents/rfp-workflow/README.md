# Hito — Flujo Agéntico de RFPs: Recepción y Enrutamiento (Parte 1 de 3)

## 🎯 Objetivo del Proyecto
Implementar la primera etapa de una arquitectura multiagente para **TrackFlow**, orientada al procesamiento inteligente de **RFPs** (*Request for Proposal* / Solicitudes de Propuesta y Cotización).

Siguiendo el **Patrón de Enrutamiento (*Router Pattern*)**, el sistema clasifica las solicitudes entrantes mediante esquemas tipados y ejecuta un **Handoff Estructurado (*Structured Handoff*)** con **Contexto Acotado (*Scoped Context*)** hacia los agentes especialistas correspondientes, evitando la sobrecarga de contexto o la dependencia de un agente monolítico "todólogo".

---

## 🏗️ Arquitectura de la Solución

```
       [ Solicitud RFP del Cliente ]
                    │
                    ▼
       ┌──────────────────────────┐
       │   RFP Ingestion Node     │ ──> Valida esquema inicial (RFPRequest)
       └──────────────────────────┘
                    │
                    ▼
       ┌──────────────────────────┐
       │     RFP Router Node      │ ──> Clasificación tipada (Literal[...])
       └──────────────────────────┘
                    │ (Conditional Edges)
       ┌────────────┼────────────┬─────────────┐
       ▼            ▼            ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Warehouse   │ │   Freight    │ │   Tech API   │ │ Out of Scope │
│  Specialist  │ │  Specialist  │ │  Specialist  │ │  Rejection   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Componentes Clave:
1. **Esquema de Entrada (`RFPRequest`):** Normaliza cliente, presupuesto, descripción, plazos y requerimientos técnicos.
2. **Clasificador Tipado (`RFPClassification`):** Determina la categoría (`warehouse_logistics`, `freight_transport`, `api_integration`, `out_of_scope`), nivel de confianza y razonamiento.
3. **Contrato de Handoff Estructurado (`RFPTaskHandoff`):**
   - `task_id`: Identificador unívoco del traspaso.
   - `target_agent`: Agente receptor asignado.
   - `scoped_inputs`: Subconjunto estricto de datos necesarios para el especialista.
   - `expected_output_schema`: Esquema tipado que el especialista debe producir.
4. **Grafo de Estado Acotado (`RFPWorkflowState`):** Mantiene la trazabilidad y garantiza que los agentes receptores no reciban información ajena a su función.

---

## 🚀 Instalación y Pruebas

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar suite de pruebas de enrutamiento
python3 test_router.py
```
