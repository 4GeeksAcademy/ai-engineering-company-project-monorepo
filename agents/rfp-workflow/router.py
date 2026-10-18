"""
router.py — Motor de Enrutamiento Agéntico y Structured Handoffs para RFPs
Hito: Flujo Agéntico de RFPs: Recepción y Enrutamiento (Parte 1 de 3)

Implementa:
1. RFPClassifier: Clasificación tipada de la solicitud con nivel de certeza.
2. RFPRouterEngine: Orquestador con aristas condicionales y scoped state.
3. Structured Handoff Generator: Generación del contrato formal hacia especialistas.
4. Nodos Especialistas: Simulación/procesamiento de dominio acotado.
"""

import re
import uuid
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone

from schemas import (
    RFPRequest,
    RFPClassification,
    RFPCategory,
    RFPTaskHandoff,
    RFPWorkflowState,
    WarehouseProposalOutput,
    FreightProposalOutput,
    TechAPIProposalOutput,
    RejectionProposalOutput
)


class RFPClassifier:
    """
    Clasificador de RFPs.
    Determina la categoría de negocio basándose en requerimientos, texto y restricciones operativas.
    En producción, este nodo se conecta a un LLM con Structured Output tipado.
    """

    KEYWORD_MAPPINGS = {
        "warehouse_fulfillment": [
            "almacen", "almacenamiento", "warehouse", "stock", "palets", "m2", "metros cuadrados",
            "cross-docking", "inventario", "picking", "packing", "zaragoza", "los angeles",
            "temperatura", "refrigerado", "almacenaje"
        ],
        "freight_transport": [
            "transporte", "flete", "freight", "ruta", "camion", "envio", "flota", "trailer",
            "entrega urgente", "same-day", "express", "km", "kilometros", "distancia",
            "aduana", "carretera", "transito", "portes"
        ],
        "api_integration": [
            "api", "webhook", "edi", "rest", "erp", "sap", "integracion", "software",
            "endpoint", "credenciales", "telemetria", "json", "xml", "conector", "stream"
        ],
        "procurement_suppliers": [
            "cajas de carton", "embalaje", "precinto", "material de empaque", "film estirable",
            "insumos de embalaje", "palets de madera", "suministros de empaque", "packaging",
            "cinta de embalar", "etiquetas termicas", "sobres de envio"
        ]
    }


    CONFIDENCE_THRESHOLD = 0.60

    def classify(self, request: RFPRequest) -> RFPClassification:
        text_to_analyze = f"{request.title} {request.raw_text}".lower()
        for req in request.requirements:
            text_to_analyze += f" {req.description.lower()}"

        scores: Dict[RFPCategory, int] = {
            "warehouse_fulfillment": 0,
            "freight_transport": 0,
            "api_integration": 0,
            "procurement_suppliers": 0
        }

        for category, keywords in self.KEYWORD_MAPPINGS.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_to_analyze):
                    scores[category] += 1

        best_category, max_matches = max(scores.items(), key=lambda item: item[1])
        total_matches = sum(scores.values())

        if max_matches == 0 or total_matches == 0:
            return RFPClassification(
                category="out_of_scope",
                confidence_score=0.95,
                reasoning="La solicitud no contiene términos ni requerimientos alineados a los servicios logísticos de TrackFlow.",
                assigned_agent="rejection_handler",
                priority="low",
                requires_human_review=False
            )

        confidence = min(0.99, max(0.65, (max_matches / total_matches) * 0.95 + 0.10))

        agent_mapping = {
            "warehouse_fulfillment": "warehouse_specialist",
            "freight_transport": "freight_specialist",
            "api_integration": "tech_api_specialist",
            "procurement_suppliers": "procurement_specialist"
        }
        assigned_agent = agent_mapping[best_category]

        priority = "medium"
        requires_human = False

        if request.budget_usd and request.budget_usd >= 100000:
            priority = "critical"
            requires_human = True
        elif request.budget_usd and request.budget_usd >= 40000:
            priority = "high"

        if confidence < self.CONFIDENCE_THRESHOLD:
            requires_human = True

        reasoning = (
            f"Clasificado en '{best_category}' con {max_matches} coincidencias de dominio "
            f"frente a un total de {total_matches} menciones técnicas detectadas."
        )

        return RFPClassification(
            category=best_category,
            confidence_score=round(confidence, 2),
            reasoning=reasoning,
            assigned_agent=assigned_agent,
            priority=priority,
            requires_human_review=requires_human
        )


class RFPTaskHandoffFactory:
    """
    Factoría para generar el contrato formal de Structured Handoff.
    Aplica el principio de Scoped Context: proyecta solo las variables que el especialista necesita.
    """

    @staticmethod
    def create_handoff(request: RFPRequest, classification: RFPClassification) -> RFPTaskHandoff:
        handoff_id = f"HO-{uuid.uuid4().hex[:8].upper()}"

        if classification.category == "warehouse_fulfillment":
            scoped_inputs = {
                "rfp_id": request.rfp_id,
                "client_name": request.client_name,
                "target_locations": request.target_locations or ["Zaragoza"],
                "budget_usd": request.budget_usd,
                "requirements": [r.model_dump() for r in request.requirements],
                "submission_deadline": request.submission_deadline
            }
            task_instruction = (
                "Evaluar viabilidad técnica de almacenamiento y cross-docking en almacenes asignados "
                "(Zaragoza / Los Angeles), cubicaje y tarifas mensuales."
            )
            expected_schema = "WarehouseProposalOutput"

        elif classification.category == "freight_transport":
            scoped_inputs = {
                "rfp_id": request.rfp_id,
                "client_name": request.client_name,
                "target_locations": request.target_locations,
                "budget_usd": request.budget_usd,
                "submission_deadline": request.submission_deadline
            }
            task_instruction = (
                "Calcular ruta óptima de transporte, tiempos de tránsito, transportista recomendado "
                "y costo estimado por kilómetro/trayecto."
            )
            expected_schema = "FreightProposalOutput"

        elif classification.category == "api_integration":
            scoped_inputs = {
                "rfp_id": request.rfp_id,
                "client_name": request.client_name,
                "requirements": [r.model_dump() for r in request.requirements],
                "submission_deadline": request.submission_deadline
            }
            task_instruction = (
                "Analizar requerimientos de conectividad (REST / Webhook / EDI), compatibilidad con "
                "el core de TrackFlow y estimar semanas de integración."
            )
            expected_schema = "TechAPIProposalOutput"

        else:
            scoped_inputs = {
                "rfp_id": request.rfp_id,
                "client_name": request.client_name,
                "reasoning": classification.reasoning
            }
            task_instruction = "Generar respuesta de no-viabilidad técnica con recomendaciones alternativas."
            expected_schema = "RejectionProposalOutput"

        return RFPTaskHandoff(
            handoff_id=handoff_id,
            rfp_id=request.rfp_id,
            source_node="rfp_router",
            target_agent=classification.assigned_agent,
            task_instruction=task_instruction,
            scoped_inputs=scoped_inputs,
            expected_output_schema=expected_schema
        )


class WarehouseSpecialist:
    """Nodo especialista en Fulfillment y Gestión de Almacenes."""

    def process(self, handoff: RFPTaskHandoff) -> WarehouseProposalOutput:
        inputs = handoff.scoped_inputs
        locations = inputs.get("target_locations", ["Zaragoza"])
        assigned_location = "Zaragoza" if "Zaragoza" in locations else "Los Angeles"

        return WarehouseProposalOutput(
            warehouse_assigned=assigned_location,
            allocated_space_sqm=1500.0,
            monthly_storage_cost_usd=12500.0,
            handling_fee_per_unit_usd=1.85,
            setup_lead_time_days=10,
            feasibility="accepted",
            notes=f"Capacidad confirmada en almacén central {assigned_location} con monitoreo de stock en tiempo real."
        )


class FreightSpecialist:
    """Nodo especialista en Transporte y Rutas."""

    def process(self, handoff: RFPTaskHandoff) -> FreightProposalOutput:
        inputs = handoff.scoped_inputs
        locations = inputs.get("target_locations", [])
        dest = locations[0] if locations else "Madrid"

        return FreightProposalOutput(
            origin_city="Zaragoza",
            destination_city=dest,
            carrier_assigned="TrackFlow Express Fleet",
            transit_time_hours=4.5,
            estimated_cost_usd=1850.0,
            vehicle_type="Trailer frigorífico 24T",
            service_level="Express",
            feasibility="accepted",
            notes="Ruta planificada con transportista homologado y telemetría de temperatura en ruta activa."
        )


class TechAPISpecialist:
    """Nodo especialista en Integración de Software y APIs."""

    def process(self, handoff: RFPTaskHandoff) -> TechAPIProposalOutput:
        return TechAPIProposalOutput(
            integration_type="REST_API",
            estimated_implementation_weeks=3,
            one_time_setup_cost_usd=4500.0,
            supported_protocols=["REST", "HTTPS", "JSON Webhooks"],
            compliance_standards=["SOC2 Type II", "GDPR", "ISO 27001"],
            feasibility="accepted",
            notes="Integración mediante webhooks de eventos de inventario (@trackflow/logic)."
        )


class RejectionHandler:
    """Nodo para gestionar solicitudes fuera de alcance o no viables."""

    def process(self, handoff: RFPTaskHandoff) -> RejectionProposalOutput:
        return RejectionProposalOutput(
            rejection_code="OUT_OF_SCOPE_LOGISTICS",
            reason=handoff.scoped_inputs.get("reasoning", "Servicio fuera del ámbito operativo de TrackFlow."),
            recommended_partner="LogisticsPartnerNetwork SL",
            notified_sales_rep=True
        )


class RFPRouterEngine:
    """
    Orquestador del flujo agéntico de RFPs.
    Coordina la ingesta, clasificación, aristas condicionales y ejecución del especialista.
    """

    def __init__(self):
        self.classifier = RFPClassifier()
        self.handoff_factory = RFPTaskHandoffFactory()
        
        self.specialists = {
            "warehouse_specialist": WarehouseSpecialist(),
            "freight_specialist": FreightSpecialist(),
            "tech_api_specialist": TechAPISpecialist(),
            "rejection_handler": RejectionHandler()
        }

    def process_rfp(self, request: RFPRequest) -> RFPWorkflowState:
        state = RFPWorkflowState(rfp_id=request.rfp_id, request=request)
        state.record_step("ingestion_node", "rfp_received", {
            "client": request.client_name,
            "title": request.title,
            "budget": request.budget_usd
        })

        try:
            # 1. Clasificación mediante Router
            classification = self.classifier.classify(request)
            state.classification = classification
            state.record_step("router_node", "rfp_classified", {
                "category": classification.category,
                "confidence": classification.confidence_score,
                "assigned_agent": classification.assigned_agent,
                "priority": classification.priority,
                "requires_human": classification.requires_human_review
            })

            # 2. Generación del Structured Handoff
            handoff = self.handoff_factory.create_handoff(request, classification)
            state.handoff = handoff
            state.record_step("handoff_factory", "handoff_generated", {
                "handoff_id": handoff.handoff_id,
                "target_agent": handoff.target_agent,
                "expected_schema": handoff.expected_output_schema
            })

            # 3. Aristas Condicionales
            specialist = self.specialists.get(handoff.target_agent)
            if not specialist:
                specialist = self.specialists["rejection_handler"]

            # 4. Ejecución del Especialista
            result = specialist.process(handoff)
            state.specialist_result = result.model_dump()
            state.status = "rejected" if classification.category == "out_of_scope" else "completed"
            
            state.record_step(handoff.target_agent, "proposal_generated", {
                "schema": handoff.expected_output_schema,
                "feasibility": getattr(result, "feasibility", "n/a")
            })

        except Exception as e:
            state.status = "failed"
            state.errors.append(str(e))
            state.record_step("orchestrator", "execution_failed", {"error": str(e)})

        return state
