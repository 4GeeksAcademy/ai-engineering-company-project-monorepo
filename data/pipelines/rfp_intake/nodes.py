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
from langgraph.graph import END
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

# ===========================================================================
# Hito 9 · Parte 2: Generación de Borradores y Ciclo de Evaluación
# ===========================================================================

from data.pipelines.rfp_intake.schemas import (
    ComplianceEvaluation,
    DepartmentDraft,
    EvaluationResult,
    ReadabilityEvaluation,
    RelevanceEvaluation,
)


def generate_department_draft(
    metadata: Dict[str, Any],
    task: Dict[str, Any],
    feedback: Optional[str] = None,
    iteration: int = 1,
) -> DepartmentDraft:
    """
    Agente Generador por departamento:
    Redacta la propuesta económica institucional consumiendo metadatos y key_aspects de la Parte 1.
    Si recibe feedback de una evaluación previa, lo incorpora para corregir los incumplimientos.
    """
    dept_id: DepartmentId = task["department_id"]
    dept_info = NEXOVA_DEPARTMENTS[dept_id]
    client_name = metadata.get("client_name", "Cliente")
    client_hq = metadata.get("client_hq", "España")
    currency = metadata.get("currency", "EUR" if client_hq == "España" else "USD")
    scope = metadata.get("scope", "")
    key_aspects = task.get("key_aspects", [])
    aspects_str = "\n".join(f"- {asp}" for asp in key_aspects) if key_aspects else "- Alcance estándar del servicio."

    feedback_prompt = f"\n\nATENCIÓN: Tu borrador anterior fue rechazado con el siguiente feedback:\n{feedback}\nCorrige obligatoriamente los fallos señalados." if feedback else ""

    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.2)
            system_prompt = (
                f"Eres {dept_info['owner_name']}, Director de {dept_info['department_name']} en Nexova Solutions.\n"
                f"Redacta la propuesta formal y económica para el cliente '{client_name}' (Sede: {client_hq}, Moneda obligatoria: {currency}).\n"
                f"Foco de tu área: {dept_info['focus']}.\n\n"
                "LINEAMIENTOS ESTRICTOS DE NEXOVA:\n"
                f"1. Moneda obligatoria: {currency}.\n"
                "2. Garantía obligatoria: Incluir compromiso expreso de garantía de satisfacción estándar a 90 días.\n"
                "3. Para Selección: El tiempo estimado de cierre (time-to-close) nunca puede ser menor a 15 días hábiles.\n"
                "4. Para Soporte: Es obligatorio incluir el SLA de respuesta de 24 horas y cobertura acordada.\n"
                "5. Anonimización: Nunca menciones nombres reales de otros clientes; usa referencias tipo 'cliente del sector retail' o 'empresa líder de SaaS'.\n"
                f"{feedback_prompt}"
            )
            user_msg = (
                f"Aspectos clave requeridos por el cliente:\n{aspects_str}\n\n"
                f"Alcance general: {scope}\n"
                "Genera el texto de la propuesta económica estructurado en Markdown (con resumen de servicio, cronograma, entregables y términos comerciales)."
            )
            response = llm.invoke([{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}])
            content = str(response.content)
            return DepartmentDraft(
                department_id=dept_id,
                department_name=dept_info["department_name"],
                owner_name=dept_info["owner_name"],
                draft_content=content,
                iteration=iteration,
                status="borrador_generado",
            )
        except Exception as exc:
            logger.debug(f"Fallback determinista en generador '{dept_id}': {exc}")

    # Fallback determinista institucional (100% compliant con las 5 reglas del briefing)
    ttc_note = "\n- Tiempo estimado de cierre de proceso: 18 días hábiles (respetando ventana mínima corporativa de 15 días)." if dept_id == "seleccion" else ""
    sla_note = "\n- Acuerdo de Nivel de Servicio (SLA): Respuesta garantizada en menos de 24 horas." if dept_id == "soporte" else ""
    warranty_note = "\n- Garantía Nexova: Incluye garantía de satisfacción estándar de 90 días en todos los servicios entregados."

    draft_text = (
        f"### Propuesta Técnica y Comercial — {dept_info['department_name']}\n\n"
        f"**Cliente:** {client_name} (Sede: {client_hq})\n"
        f"**Responsable del Área:** {dept_info['owner_name']}\n"
        f"**Moneda de cotización:** {currency}\n\n"
        f"#### 1. Alcance Operativo\n{aspects_str}\n\n"
        f"#### 2. Metodología y Entregables\n"
        f"Nexova Solutions aplicará su metodología certificada para {dept_info['department_name']}. "
        f"Hemos completado con éxito implementaciones análogas para un cliente del sector retail y una empresa líder en telecomunicaciones.{ttc_note}{sla_note}\n\n"
        f"#### 3. Términos Comerciales y Garantías\n"
        f"- Facturación y precios en {currency}.{warranty_note}\n"
    )

    return DepartmentDraft(
        department_id=dept_id,
        department_name=dept_info["department_name"],
        owner_name=dept_info["owner_name"],
        draft_content=draft_text,
        iteration=iteration,
        status="borrador_generado",
    )

# ---------------------------------------------------------------------------
# Evaluadores de Sección (Legibilidad, Pertinencia, Compliance)
# ---------------------------------------------------------------------------

def evaluate_readability(text: str) -> ReadabilityEvaluation:
    """Evalúa objetivamente la legibilidad del borrador con py-readability-metrics."""
    metrics = compute_readability_metrics(text)
    ease = float(metrics.get("flesch_reading_ease") or 45.0)
    grade = float(metrics.get("flesch_kincaid_grade") or 11.0)

    # Criterio estándar para propuestas corporativas B2B
    passed = ease >= 30.0 or grade <= 16.0
    feedback = None if passed else f"La legibilidad es baja (Flesch: {ease:.1f}, Grado: {grade:.1f}). Usa oraciones más directas y concisas."
    return ReadabilityEvaluation(
        passed=passed,
        flesch_reading_ease=ease,
        flesch_kincaid_grade=grade,
        feedback=feedback,
    )


def evaluate_relevance(text: str, key_aspects: List[str]) -> RelevanceEvaluation:
    """Evalúa que el borrador responda a los aspectos clave solicitados en la RFP."""
    if not key_aspects:
        return RelevanceEvaluation(passed=True, covered_aspects=[], missing_aspects=[])

    lower_text = text.lower()
    covered: List[str] = []
    missing: List[str] = []

    for aspect in key_aspects:
        # Extrae palabras significativas del aspecto clave
        words = [w.lower() for w in re.findall(r"\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,}\b", aspect)]
        matches = [w for w in words if w in lower_text]
        if len(matches) >= max(1, len(words) // 3):
            covered.append(aspect)
        else:
            missing.append(aspect)

    passed = len(missing) == 0 or (len(covered) / len(key_aspects) >= 0.6)
    feedback = None if passed else f"El borrador no cubre aspectos clave requeridos: {'; '.join(missing)}."
    return RelevanceEvaluation(
        passed=passed,
        covered_aspects=covered,
        missing_aspects=missing,
        feedback=feedback,
    )


def evaluate_compliance(
    text: str, metadata: Dict[str, Any], dept_id: DepartmentId
) -> ComplianceEvaluation:
    """
    Evalúa cumplimiento estricto contra las 5 restricciones de negocio de Nexova (§5):
    1. Garantía a 90 días (RULE-WARRANTY).
    2. Moneda según sede España->EUR, Miami->USD (RULE-CURRENCY).
    3. Selección: TTC no menor a 15 días hábiles (RULE-TTC-MIN).
    4. Soporte: SLA obligatorio de 24 horas (RULE-SUPPORT-SLA).
    5. Anonimización de referencias de clientes (RULE-ANONYMIZATION).
    """
    violations: List[str] = []
    checked_rules = ["RULE-WARRANTY", "RULE-CURRENCY", "RULE-ANONYMIZATION"]
    lower = text.lower()

    # 1. Regla de Garantía 90 días
    if "90 d" not in lower and "90-d" not in lower and "noventa d" not in lower:
        violations.append("RULE-WARRANTY: Toda propuesta debe incluir la garantía de satisfacción estándar de Nexova a 90 días.")

    # 2. Regla de Moneda según client_hq
    client_hq = metadata.get("client_hq", "España")
    expected_curr = "EUR" if client_hq == "España" else "USD"
    forbidden_curr = "USD" if expected_curr == "EUR" else "EUR"
    if forbidden_curr in text and expected_curr not in text:
        violations.append(f"RULE-CURRENCY: La sede es {client_hq}; la cotización debe ser en {expected_curr}, no en {forbidden_curr}.")

    # 3. Regla TTC para Selección
    if dept_id == "seleccion":
        checked_rules.append("RULE-TTC-MIN")
        match = re.search(r"(\d+)\s*d[ií]as\s*h[aá]biles", lower)
        if match:
            days = int(match.group(1))
            if days < 15:
                violations.append(f"RULE-TTC-MIN: Ninguna búsqueda ejecutiva puede comprometer un cierre menor a 15 días hábiles (prometió {days} días).")

    # 4. Regla SLA para Soporte
    if dept_id == "soporte":
        checked_rules.append("RULE-SUPPORT-SLA")
        if "24" not in lower and "veinticuatro" not in lower:
            violations.append("RULE-SUPPORT-SLA: Toda propuesta de soporte outsourced debe mencionar explícitamente el SLA de respuesta de 24 horas.")

    # 5. Regla de Anonimización de Referencias
    prohibited_names = ("santander", "inditex", "mercadona", "telefonica", "amazon", "microsoft")
    for name in prohibited_names:
        if name in lower:
            violations.append(f"RULE-ANONYMIZATION: No se pueden citar nombres de clientes reales ('{name}'). Usar referencias anónimas del sector.")

    passed = len(violations) == 0
    feedback = None if passed else " | ".join(violations)
    return ComplianceEvaluation(
        passed=passed,
        rule_ids_checked=checked_rules,
        violations=violations,
        feedback=feedback,
    )


def evaluate_section_parallel(
    draft: DepartmentDraft, metadata: Dict[str, Any], key_aspects: List[str]
) -> EvaluationResult:
    """
    Ejecuta en paralelo los 3 evaluadores especializados y consolida el EvaluationResult.
    """
    content = draft.draft_content
    dept_id = draft.department_id

    with ThreadPoolExecutor(max_workers=3) as pool:
        future_readability = pool.submit(evaluate_readability, content)
        future_relevance = pool.submit(evaluate_relevance, content, key_aspects)
        future_compliance = pool.submit(evaluate_compliance, content, metadata, dept_id)

        read_res = future_readability.result()
        rel_res = future_relevance.result()
        comp_res = future_compliance.result()

    overall_pass = read_res.passed and rel_res.passed and comp_res.passed

    feedback_parts = [
        f for f in (comp_res.feedback, rel_res.feedback, read_res.feedback) if f
    ]
    consolidated_feedback = " ; ".join(feedback_parts) if feedback_parts else "Sección cumple todos los criterios."

    return EvaluationResult(
        department_id=dept_id,
        readability=read_res,
        relevance=rel_res,
        compliance=comp_res,
        overall_pass=overall_pass,
        feedback_for_generator=consolidated_feedback,
        iteration=draft.iteration,
    )

# ---------------------------------------------------------------------------
# Nodos de Integración para el Grafo LangGraph (Ciclo Generador-Evaluador)
# ---------------------------------------------------------------------------

MAX_EVALUATION_ITERATIONS = 3


def draft_generation_node(state: RFPIntakeState) -> Dict[str, Any]:
    """
    Nodo de generación de borradores por departamento:
    Ejecuta en paralelo la redacción para todos los departamentos activos.
    Si una sección ya aprobó o agotó iteraciones (needs_human_review), no se regenera.
    """
    trace = list(state.get("execution_trace", [])) + ["draft_generation"]
    metadata = state.get("metadata", {})
    department_tasks = state.get("department_tasks", [])
    current_drafts = dict(state.get("department_drafts", {}))
    current_evals = state.get("evaluation_results", {})
    iteration_counts = dict(state.get("iteration_counts", {}))
    dept_statuses = dict(state.get("department_statuses", {}))

    tasks_to_generate: List[Dict[str, Any]] = []
    for task in department_tasks:
        dept_id = task["department_id"]
        status = dept_statuses.get(dept_id, "pendiente")
        # Solo generamos si es la primera vez o si debe reintentar tras un fallo
        if status not in ("aprobado_evaluacion", "needs_human_review"):
            tasks_to_generate.append(task)

    if not tasks_to_generate:
        return {"execution_trace": trace, "status": "generando_borrador"}

    def _run_gen(t: Dict[str, Any]) -> DepartmentDraft:
        dept_id = t["department_id"]
        prev_eval = current_evals.get(dept_id, {})
        feedback = prev_eval.get("feedback_for_generator") if prev_eval else None
        current_iter = iteration_counts.get(dept_id, 0) + 1
        iteration_counts[dept_id] = current_iter
        draft = generate_department_draft(metadata, t, feedback=feedback, iteration=current_iter)
        return draft

    with ThreadPoolExecutor(max_workers=len(tasks_to_generate)) as pool:
        generated_list = list(pool.map(_run_gen, tasks_to_generate))

    for draft in generated_list:
        dept_id = draft.department_id
        current_drafts[dept_id] = draft.model_dump()
        dept_statuses[dept_id] = "borrador_generado"

    return {
        "department_drafts": current_drafts,
        "iteration_counts": iteration_counts,
        "department_statuses": dept_statuses,
        "status": "generando_borrador",
        "execution_trace": trace,
    }


def evaluation_node(state: RFPIntakeState) -> Dict[str, Any]:
    """
    Nodo de evaluación en paralelo:
    Evalúa cada borrador generado. Aplica el límite de 3 iteraciones.
    Si se agota sin pasar, marca la sección como needs_human_review sin descartar el ticket.
    """
    trace = list(state.get("execution_trace", [])) + ["evaluation"]
    metadata = state.get("metadata", {})
    department_tasks = {t["department_id"]: t.get("key_aspects", []) for t in state.get("department_tasks", [])}
    current_drafts = state.get("department_drafts", {})
    evaluation_results = dict(state.get("evaluation_results", {}))
    iteration_counts = state.get("iteration_counts", {})
    dept_statuses = dict(state.get("department_statuses", {}))

    eval_tasks: List[DepartmentDraft] = []
    for dept_id, draft_dict in current_drafts.items():
        if dept_statuses.get(dept_id) == "borrador_generado":
            eval_tasks.append(DepartmentDraft(**draft_dict))

    def _run_eval(draft: DepartmentDraft) -> EvaluationResult:
        aspects = department_tasks.get(draft.department_id, [])
        return evaluate_section_parallel(draft, metadata, aspects)

    with ThreadPoolExecutor(max_workers=max(1, len(eval_tasks))) as pool:
        results = list(pool.map(_run_eval, eval_tasks))

    for res in results:
        dept_id = res.department_id
        evaluation_results[dept_id] = res.model_dump()
        iter_num = iteration_counts.get(dept_id, 1)

        if res.overall_pass:
            dept_statuses[dept_id] = "aprobado_evaluacion"
        elif iter_num >= MAX_EVALUATION_ITERATIONS:
            # Límite agotado sin pasar -> needs_human_review (preserva último borrador)
            dept_statuses[dept_id] = "needs_human_review"
        else:
            dept_statuses[dept_id] = "reintentando"

    # Determinar estado global del ticket
    all_statuses = list(dept_statuses.values())
    if any(s == "reintentando" for s in all_statuses):
        global_status = "en_evaluacion"
    elif any(s == "needs_human_review" for s in all_statuses):
        global_status = "needs_human_review"
    else:
        global_status = "listo_para_aprobacion"

    return {
        "evaluation_results": evaluation_results,
        "department_statuses": dept_statuses,
        "status": global_status,
        "execution_trace": trace,
    }


def should_continue_generation_eval(state: RFPIntakeState) -> str:
    """
    Decisión condicional de LangGraph:
    Si algún departamento sigue en estado `reintentando`, vuelve a `draft_generation`.
    De lo contrario, termina el ciclo generador-evaluador hacia END.
    """
    dept_statuses = state.get("department_statuses", {})
    if any(status == "reintentando" for status in dept_statuses.values()):
        return "draft_generation"
    return END