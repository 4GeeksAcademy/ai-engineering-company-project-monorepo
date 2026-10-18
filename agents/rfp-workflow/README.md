# Flujo Agéntico de RFPs en TrackFlow (Sistema Multiagente)

Este directorio implementa el flujo agéntico multiagente para la gestión inteligente de **RFPs** (*Request for Proposal* / Solicitudes de Propuesta y Cotización) en TrackFlow.

---

## 📌 Hito — Flujo Agéntico de RFPs: Recepción y Enrutamiento (Parte 1 de 3)
- **Patrón:** *Router Pattern* & *Structured Handoff* con *Scoped Context*.
- **Módulos:** [`schemas.py`](./schemas.py), [`router.py`](./router.py), [`test_router.py`](./test_router.py).
- **Función:** Clasificación tipada de la RFP (`warehouse_fulfillment`, `freight_transport`, `api_integration`, `out_of_scope`) y transferencia con contexto acotado al especialista.

---

## 📌 Hito — Flujo Agéntico de RFPs: Generación de Respuestas (Parte 2 de 3)
- **Patrón:** *Evaluator-Optimizer Pattern* (`generate -> critique/evaluate -> revise`).
- **Módulos:** [`evaluator_schemas.py`](./evaluator_schemas.py), [`evaluator_optimizer.py`](./evaluator_optimizer.py), [`test_evaluator_optimizer.py`](./test_evaluator_optimizer.py).
- **Función:** Generación de la propuesta técnica formal completa mediante un bucle de automejora iterativo:
  1. **Proposal Generator:** Genera el borrador inicial de la propuesta a partir del handoff.
  2. **Proposal Evaluator:** Evalúa el borrador con una rúbrica objetiva (cobertura de requisitos, límites de presupuesto, viabilidad de SLAs y estructura comercial).
  3. **Feedback Estructurado:** Si la evaluación resulta en `FAIL`, devuelve crítica cuantitativa y cualitativa accionable.
  4. **Proposal Optimizer:** Reescribe y perfecciona el borrador incorporando las correcciones.
  5. **Condición de Parada:** Cierre al obtener `PASS` o al alcanzar el límite seguro de iteraciones (`max_iterations = 3`).

```
  [ RFPTaskHandoff ] ──> ┌────────────────────────┐
                         │   Proposal Generator   │
                         └────────────────────────┘
                                     │ (Borrador de Propuesta)
                                     ▼
                         ┌────────────────────────┐
                         │   Proposal Evaluator   │ <── [ Rúbrica de Calidad ]
                         └────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
          (FAIL / Score < 80)               (PASS / Score >= 80)
                    ▼                                 ▼
       ┌────────────────────────┐       ┌────────────────────────┐
       │   Feedback Accionable  │       │   Propuesta Aprobada   │
       └────────────────────────┘       └────────────────────────┘
                    │                                 │
                    ▼                                 ▼
       ┌────────────────────────┐             [ Cierre Exitoso ]
       │   Proposal Optimizer   │
       └────────────────────────┘
                    │ (Borrador Revisado)
                    └───> [ Re-evaluar ]
```

---

## 🚀 Instalación y Pruebas

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar suite de pruebas de la Parte 1 (Enrutamiento)
python3 test_router.py

# 3. Ejecutar suite de pruebas de la Parte 2 (Evaluator-Optimizer)
python3 test_evaluator_optimizer.py
```
