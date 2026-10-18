# Flujo Agéntico de RFPs en TrackFlow (Sistema Multiagente Completo)

Este directorio implementa la solución agéntica multiagente integral para la gestión inteligente, optimización y formalización de **RFPs** (*Request for Proposal* / Solicitudes de Propuesta y Cotización) en TrackFlow.

---

## 🏗️ Arquitectura Global del Sistema (3 Partes)

```
[ Cliente: Solicitud RFP ]
            │
            ▼
┌────────────────────────────────┐
│   PARTE 1: Router Pattern      │ ──> Clasificación tipada y Structured Handoff con Scoped Context
└────────────────────────────────┘
            │ (Handoff acotado a Warehouse, Freight o Tech API)
            ▼
┌────────────────────────────────┐
│  PARTE 2: Evaluator-Optimizer  │ ──> Bucle de automejora (generate -> critique -> revise)
└────────────────────────────────┘
            │ (Propuesta optimizada aprobada por evaluador)
            ▼
┌────────────────────────────────┐
│  PARTE 3: Control & Resuming   │ ──> Checkpointing, Interrupción HITL, Aprobación Humana y Cierre
└────────────────────────────────┘
            │
            ├─► APPROVE ───────► [ Contrato Formalizado & Despachado (CLOSED_WON) ]
            ├─► REQUEST_CHANGES ► [ Reanudar bucle de optimización con notas humanas ]
            └─► REJECT ────────► [ Cancelación ordenada y archivo (CLOSED_REJECTED) ]
```

---

## 📌 Hito 1: Recepción y Enrutamiento (Parte 1 de 3)
- **Patrón:** *Router Pattern* & *Structured Handoff* con *Scoped Context*.
- **Módulos:** [`schemas.py`](./schemas.py), [`router.py`](./router.py), [`test_router.py`](./test_router.py).
- **Función:** Clasifica la RFP en categorías operativas tipadas (`Literal`), aísla el contexto y despacha el handoff hacia el especialista correspondiente.

---

## 📌 Hito 2: Generación de Respuestas (Parte 2 de 3)
- **Patrón:** *Evaluator-Optimizer Pattern* (`generate -> critique/evaluate -> revise`).
- **Módulos:** [`evaluator_schemas.py`](./evaluator_schemas.py), [`evaluator_optimizer.py`](./evaluator_optimizer.py), [`test_evaluator_optimizer.py`](./test_evaluator_optimizer.py).
- **Función:** Genera y optimiza iterativamente la propuesta técnica contra una rúbrica objetiva de 4 criterios (cobertura obligatoria, presupuesto, SLAs y estructura comercial) hasta obtener `PASS` o límite de seguridad (`max_iterations = 3`).

---

## 📌 Hito 3: Aprobación y Cierre (Parte 3 de 3)
- **Patrón:** *Checkpointing*, *Workflow Interruptions*, *Human-in-the-Loop Approval* y *State Resuming*.
- **Módulos:** [`approval_schemas.py`](./approval_schemas.py), [`approval_controller.py`](./approval_controller.py), [`test_approval_workflow.py`](./test_approval_workflow.py).
- **Función:**
  1. **Interrupción Automática (*Interrupt*):** Pausa el grafo antes de la acción irreversible (envío al cliente).
  2. **Persistencia de Checkpoints (*Checkpointing*):** Guarda el estado completo en disco para permitir reanudación asíncrona (horas o días después).
  3. **Supervisión Humana (*HITL Gate*):** Captura la decisión formal del revisor humano (`APPROVE`, `REJECT`, `REQUEST_CHANGES`).
  4. **Reanudación del Flujo (*Resume*):** Recupera el checkpoint e inyecta la decisión humana para emitir el contrato formal o reiniciar la optimización.

---

## 🚀 Instalación y Pruebas

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Pruebas Parte 1: Enrutamiento y Handoffs
python3 test_router.py

# 3. Pruebas Parte 2: Evaluator-Optimizer
python3 test_evaluator_optimizer.py

# 4. Pruebas Parte 3: Checkpointing, Control y Cierre
python3 test_approval_workflow.py
```
