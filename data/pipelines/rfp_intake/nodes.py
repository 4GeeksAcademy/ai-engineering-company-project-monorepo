"""
data/pipelines/rfp_intake/nodes.py
Agentes separados del grafo `rfp_intake`:
1. ingest_node: PDF -> Markdown (MarkItDown) + métricas de legibilidad.
2. classifier_node: Triage RFP válida (formal/informal) vs descartado.
3. orchestrator_node: Metadatos + descomposición por departamentos activos.
4. workers_node: Workers aislados en paralelo (solo metadatos + extractos de su área).
5. synthesizer_node: Consolida resumen para Ventas + handoff_payload hacia Parte 2.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import logging
import os
import re
from typing import Any, Dict, List

from data.pipelines.rfp_intake.ingest import compute_readability_metrics, convert_pdf_to_markdown
from data.pipelines.rfp_intake.schemas import (
    NEXOVA_DEPARTMENTS,
    ClassifierOutput,
    DepartmentId,
    DepartmentTask,
    OrchestratorOutput,
    RFPMetadata,
    WorkerOutput,
)
from data.pipelines.rfp_intake.state import RFPIntakeState

logger = logging.getLogger("nexova.rfp_nodes")


def _extract_relevant_excerpts(markdown_text: str, keywords: tuple[str, ...]) -> List[str]:
    """Filtra párrafos/secciones relevantes del Markdown para aislar el contexto del worker."""
    blocks = [b.strip() for b in re.split(r"\n{2,}", markdown_text) if b.strip()]
    matched = [b for b in blocks if any(kw in b.lower() for kw in keywords)]
    return matched[:6] if matched else blocks[:2]


# ---------------------------------------------------------------------------
# 1. Ingesta (PDF -> Markdown + Legibilidad)
# ---------------------------------------------------------------------------

def ingest_node(state: RFPIntakeState) -> Dict[str, Any]:
    trace = list(state.get("execution_trace", [])) + ["ingest"]
    markdown_text = state.get("markdown_text") or convert_pdf_to_markdown(state["raw_pdf_path"])
    metrics = compute_readability_metrics(markdown_text)
    return {
        "markdown_text": markdown_text,
        "readability_metrics": metrics,
        "execution_trace": trace,
    }


# ---------------------------------------------------------------------------
# 2. Agente Clasificador (Triage)
# ---------------------------------------------------------------------------

def classify_rfp_document(markdown_text: str) -> ClassifierOutput:
    """Clasifica si el documento es una RFP legítima de cliente (formal o informal) o inválida."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
            structured = llm.with_structured_output(ClassifierOutput)
            prompt = (
                "Eres el clasificador de recepción de RFPs de Nexova Solutions "
                "(servicios: selección/headhunting, capacitación corporativa y outsourcing de soporte).\n"
                "Evalúa el siguiente documento en Markdown:\n"
                "- Acepta RFPs formales e informales (incluidos correos de clientes pidiendo propuesta/cotización/equipo).\n"
                "- Rechaza documentos que NO son RFPs de clientes (p. ej. pitches comerciales de proveedores ofreciéndonos software/ATS, facturas, currículums sueltos).\n\n"
                f"Documento:\n{markdown_text[:6000]}"
            )
            return structured.invoke(prompt)
        except Exception as exc:
            logger.debug(f"Fallback determinista en classifier_node: {exc}")

    lower = markdown_text.lower()

    # Detección de pitches entrantes de proveedores (ej. nexova-request-3.pdf)
    vendor_pitch_markers = (
        "ofrecemos nuestro ats", "nuestra plataforma ats", "demo gratuita de nuestro software",
        "somos proveedores de", "nos gustaría presentarles nuestra herramienta", "vendor pitch",
        "agendar una demo de nuestro producto", "suscripción a nuestro software",
    )
    if any(m in lower for m in vendor_pitch_markers):
        return ClassifierOutput(
            is_valid_rfp=False,
            rfp_format="invalid",
            reason="Documento identificado como pitch comercial de proveedor externo, no como RFP de cliente.",
        )

    # Señales de solicitud de propuesta (formal o correo informal) para servicios de Nexova
    rfp_intent_markers = (
        "rfp", "request for proposal", "solicitud de propuesta", "propuesta económica",
        "cotización", "presupuesto", "necesitamos contratar", "buscamos un proveedor",
        "equipo de soporte", "búsqueda ejecutiva", "mandos medios", "capacitación", "formación",
        "headhunting", "outsourcing", "agentes de soporte",
    )
    matches = sum(1 for m in rfp_intent_markers if m in lower)
    if matches >= 2:
        fmt = "formal" if ("rfp" in lower or "request for proposal" in lower or "alcance" in lower) else "informal"
        return ClassifierOutput(
            is_valid_rfp=True,
            rfp_format=fmt,
            reason=f"Solicitud de propuesta válida detectada (formato {fmt}).",
        )

    return ClassifierOutput(
        is_valid_rfp=False,
        rfp_format="invalid",
        reason="El documento no contiene una solicitud clara de propuesta para servicios de Nexova.",
    )


def classifier_node(state: RFPIntakeState) -> Dict[str, Any]:
    trace = list(state.get("execution_trace", [])) + ["classifier"]
    res = classify_rfp_document(state.get("markdown_text", ""))
    return {
        "is_valid_rfp": res.is_valid_rfp,
        "rfp_format": res.rfp_format,
        "classification_reason": res.reason,
        "status": "analizando" if res.is_valid_rfp else "descartado",
        "execution_trace": trace,
    }


# ---------------------------------------------------------------------------
# 3. Agente Orquestador (Metadatos + Descomposición por Departamento)
# ---------------------------------------------------------------------------

def orchestrate_rfp_decomposition(markdown_text: str) -> OrchestratorOutput:
    """Extrae metadatos y descompone únicamente en los departamentos que aplican."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
            structured = llm.with_structured_output(OrchestratorOutput)
            prompt = (
                "Eres el Orquestador de RFPs de Nexova Solutions.\n"
                "Departamentos válidos (NO actives los 3 por defecto; activa solo los solicitados):\n"
                "- 'seleccion': headhunting, búsqueda ejecutiva, contratación de roles/mandos.\n"
                "- 'capacitacion': formación corporativa, liderazgo, talleres, upskilling.\n"
                "- 'soporte': outsourcing de soporte al cliente, helpdesk, agentes 24/7, SLAs.\n\n"
                "Reglas:\n"
                "- client_hq: 'España' (-> currency='EUR') o 'Miami' (-> currency='USD').\n"
                "- Para cada departamento activo, incluye en `relevant_excerpts` solo los fragmentos de la RFP relevantes.\n"
                "- Si la RFP menciona un área que no existe en Nexova (ej. Legal), ponla en `unmapped_departments`.\n\n"
                f"Documento:\n{markdown_text[:8000]}"
            )
            result = structured.invoke(prompt)
            if result.departments_needed:
                return result
        except Exception as exc:
            logger.debug(f"Fallback determinista en orchestrator_node: {exc}")

    lower = markdown_text.lower()
    is_miami = any(k in lower for k in ("miami", "ee. uu.", "ee.uu.", "usa", "estados unidos", "usd", "$"))
    hq = "Miami" if is_miami else ("España" if any(k in lower for k in ("madrid", "españa", "barcelona", "valencia", "eur", "€")) else "No especificado")
    currency = "USD" if hq == "Miami" else "EUR"

    client_name = "Cliente RFP"
    client_match = re.search(r"(?:cliente|empresa|de|from)\s*[:\-]\s*([^\n]+)", markdown_text, re.IGNORECASE)
    if client_match:
        client_name = client_match.group(1).strip()[:80]
    elif "vantex" in lower:
        client_name = "Vantex Retail Group"
    elif "nubesoft" in lower:
        client_name = "NubeSoft"

    depts: List[DepartmentId] = []
    tasks: List[DepartmentTask] = []
    services: List[str] = []

    dept_keywords = {
        "seleccion": ("selección", "seleccion", "headhunting", "búsqueda ejecutiva", "mandos", "roles", "vacantes", "contratación"),
        "capacitacion": ("capacitación", "capacitacion", "formación", "formacion", "training", "liderazgo", "programa", "taller"),
        "soporte": ("soporte", "support", "helpdesk", "agentes", "24/7", "turnos", "sla", "outsourcing de atención"),
    }

    for dept_id, kws in dept_keywords.items():
        if any(kw in lower for kw in kws):
            depts.append(dept_id)  # type: ignore[arg-type]
            services.append(NEXOVA_DEPARTMENTS[dept_id]["department_name"])
            tasks.append(
                DepartmentTask(
                    department_id=dept_id,  # type: ignore[arg-type]
                    relevant_excerpts=_extract_relevant_excerpts(markdown_text, kws),
                )
            )

    deadline_match = re.search(r"(?:fecha l[ií]mite|deadline|entrega)\s*[:\-]\s*([^\n]+)", markdown_text, re.IGNORECASE)
    budget_match = re.search(r"(?:presupuesto|budget)\s*[:\-]\s*([^\n]+)", markdown_text, re.IGNORECASE)

    metadata = RFPMetadata(
        client_name=client_name,
        client_hq=hq,  # type: ignore[arg-type]
        currency=currency,  # type: ignore[arg-type]
        services_requested=services,
        scope=f"Análisis de RFP para {', '.join(services) or 'servicios generales'}.",
        deadline=deadline_match.group(1).strip() if deadline_match else None,
        budget_range=budget_match.group(1).strip() if budget_match else None,
    )
    return OrchestratorOutput(metadata=metadata, departments_needed=depts, tasks=tasks)


def orchestrator_node(state: RFPIntakeState) -> Dict[str, Any]:
    trace = list(state.get("execution_trace", [])) + ["orchestrator"]
    plan = orchestrate_rfp_decomposition(state.get("markdown_text", ""))
    return {
        "metadata": plan.metadata.model_dump(),
        "departments_needed": plan.departments_needed,
        "department_tasks": [t.model_dump() for t in plan.tasks],
        "unmapped_departments": plan.unmapped_departments,
        "execution_trace": trace,
    }


# ---------------------------------------------------------------------------
# 4. Workers Aislados por Departamento
# ---------------------------------------------------------------------------

def run_department_worker(metadata: Dict[str, Any], task: Dict[str, Any]) -> WorkerOutput:
    """
    Worker aislado: recibe ÚNICAMENTE metadatos + extractos de su departamento.
    Nunca inventa volúmenes o cifras que no estén en la RFP.
    """
    dept_id: DepartmentId = task["department_id"]
    dept_info = NEXOVA_DEPARTMENTS[dept_id]
    excerpts_text = "\n\n".join(task.get("relevant_excerpts", []))

    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
            structured = llm.with_structured_output(WorkerOutput)
            prompt = (
                f"Eres el agente especialista del departamento '{dept_info['department_name']}' "
                f"(Responsable: {dept_info['owner_name']}).\n"
                f"Tu foco: {dept_info['focus']}.\n"
                "REGLA CRÍTICA: Extrae `key_aspects` usando SOLO datos presentes en los extractos. "
                "Si falta una cifra requerida (volumen, roles, horas, turnos, fechas), NO la inventes; "
                "añádela en `open_questions`.\n\n"
                f"Metadatos: {metadata}\n\nExtractos relevantes:\n{excerpts_text}"
            )
            res = structured.invoke(prompt)
            res.department_id = dept_id
            res.department_name = dept_info["department_name"]
            res.owner_name = dept_info["owner_name"]
            return res
        except Exception as exc:
            logger.debug(f"Fallback determinista en worker '{dept_id}': {exc}")

    key_aspects: List[str] = []
    open_questions: List[str] = []
    numbers = re.findall(r"\b\d+\s+(?:mandos|roles|puestos|agentes|personas|horas|semanas|días|meses|participantes)\b", excerpts_text, re.IGNORECASE)
    if numbers:
        key_aspects.append(f"Volúmenes/plazos detectados en RFP: {', '.join(dict.fromkeys(numbers))}.")
    else:
        open_questions.append(f"Confirmar con el cliente el volumen exacto y plazos para {dept_info['department_name']}.")

    if dept_id == "seleccion":
        key_aspects.append("Revisar perfiles requeridos y validar ventana mínima de cierre (>= 15 días hábiles).")
    elif dept_id == "capacitacion":
        key_aspects.append("Definir programa formativo, modalidad (presencial/remota) y calendario de cohortes.")
        if "modalidad" not in excerpts_text.lower() and "presencial" not in excerpts_text.lower() and "remoto" not in excerpts_text.lower():
            open_questions.append("Confirmar modalidad de impartición (presencial, online o híbrida).")
    elif dept_id == "soporte":
        key_aspects.append("Dimensionar turnos de atención y validar cumplimiento del SLA obligatorio de 24h.")
        if "24/7" in excerpts_text.lower():
            key_aspects.append("Cobertura solicitada: 24/7.")

    return WorkerOutput(
        department_id=dept_id,
        department_name=dept_info["department_name"],
        owner_name=dept_info["owner_name"],
        key_aspects=key_aspects,
        open_questions=open_questions,
    )


def workers_node(state: RFPIntakeState) -> Dict[str, Any]:
    trace = list(state.get("execution_trace", [])) + ["workers"]
    metadata = state.get("metadata", {})
    tasks = state.get("department_tasks", [])

    if not tasks:
        return {"worker_results": [], "execution_trace": trace}

    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        results = list(pool.map(lambda t: run_department_worker(metadata, t).model_dump(), tasks))

    return {
        "worker_results": results,
        "execution_trace": trace,
    }


# ---------------------------------------------------------------------------
# 5. Agente Synthesizer + Handoff hacia Parte 2
# ---------------------------------------------------------------------------

def synthesizer_node(state: RFPIntakeState) -> Dict[str, Any]:
    trace = list(state.get("execution_trace", [])) + ["synthesizer"]
    metadata = state.get("metadata", {})
    worker_results = state.get("worker_results", [])
    unmapped = state.get("unmapped_departments", [])

    lines = [
        f"Resumen Ejecutivo para Ventas (Marcos Ibáñez) — {metadata.get('client_name', 'Cliente')} "
        f"({metadata.get('client_hq', 'N/A')} | Moneda: {metadata.get('currency', 'EUR')}):",
    ]
    key_aspects_by_dept: Dict[str, List[str]] = {}
    open_questions_by_dept: Dict[str, List[str]] = {}

    for wr in worker_results:
        dept_id = wr["department_id"]
        key_aspects_by_dept[dept_id] = wr.get("key_aspects", [])
        open_questions_by_dept[dept_id] = wr.get("open_questions", [])
        lines.append(
            f"- **{wr['department_name']} (`{dept_id}`)** — Pedir a **{wr['owner_name']}**: "
            + "; ".join(wr.get("key_aspects", []))
        )
        if wr.get("open_questions"):
            lines.append("  - Preguntas abiertas: " + "; ".join(wr["open_questions"]))

    if unmapped:
        lines.append(f"- ⚠️ Áreas mencionadas fuera del catálogo estándar: {', '.join(unmapped)}")

    handoff_payload = {
        "ticket_id": state.get("ticket_id"),
        "rfp_id": state.get("rfp_id"),
        "client_name": metadata.get("client_name"),
        "client_hq": metadata.get("client_hq"),
        "currency": metadata.get("currency"),
        "departments_needed": state.get("departments_needed", []),
        "key_aspects": key_aspects_by_dept,
        "open_questions": open_questions_by_dept,
        "workstreams": worker_results,
    }

    return {
        "synthesizer_summary": "\n".join(lines),
        "handoff_payload": handoff_payload,
        "status": "analisis_completo",
        "execution_trace": trace,
    }