# Plan de Desarrollo — LangGraph Agent Base

> **Propósito**: Migrar el pipeline RAG existente (TrackFlow) a un grafo de LangGraph con estado explícito, nodos con responsabilidad única, checkpointing, tracing y endpoint dedicado.
> **Stack**: Python, LangGraph, FastAPI, Qdrant, OpenAI/GPT-4o-mini, pytest
> **Repo**: `4GeeksAcademy/jesteban1983-ai-engineering-company-project-monorepo`
> **Asignado**: Jonathan (@jesteban1983) — desarrollo individual
> **Inicio**: 2026-09-25

---

## Fases del proyecto

### Fase 1: Setup y planificación (Día 1)
- [x] 1.1 Instalar dependencia `langgraph` con `uv add langgraph`
- [x] 1.2 Revisar `data/pipelines/rag.py` para entender el retrieve y generate_answer
- [x] 1.3 Revisar `context-aiAgent` para alinear requisitos
- [x] 1.4 Crear rama `feature/langgraph-agent-base`
- [ ] **Criterio de éxito**: Repo listo, dependencias instaladas, rama creada

### Fase 2: Grafo del agente (Días 1-2)
- [x] 2.1 Definir **estado mínimo** del grafo (TypedDict)
- [x] 2.2 Modelar nodo `receive_question` — validar entrada, detectar vacío
- [x] 2.3 Modelar nodo `retrieve` — reutilizar `data.pipelines.rag.retrieve`
- [x] 2.4 Modelar nodo `generate_answer` — reutilizar paso de generación separado
- [x] 2.5 Modelar nodo `no_info` — respuesta honesta quando no hay contexto
- [x] 2.6 Definir **aristas condicionales** (pregunta vacía → END, sin contexto → no_info)
- [x] 2.7 Compilar el grafo con validación estructural
- [x] 2.8 Implementar **checkpointing** (MemorySaver)
- [ ] **Criterio de éxito**: Grafo compilado, ejecutable con una pregunta de prueba

### Fase 3: Tracing y evaluación (Día 2)
- [x] 3.1 Instrumentar tracing (log estructurado o LangSmith)
- [x] 3.2 Crear `tests/pipelines/test_agent_evals.py`
- [x] 3.3 Eval 1: ruta feliz — retrieve + generate_answer con contexto válido
- [x] 3.4 Eval 2: pregunta vacía → ruta directa a END sin recuperar
- [x] 3.5 Eval 3: sin contexto suficiente → nodo no_info responde con honestidad
- [x] 3.6 Verificar que tests RAG existentes siguen pasando
- [ ] **Criterio de éxito**: 3 evals pasan + tests RAG existentes pasan

### Fase 4: Endpoint (Día 3)
- [x] 4.1 Crear `services/api/routes/agent.py` con POST /agent/query
- [x] 4.2 El endpoint invoca el grafo compilado (sin lógica de negocio propia)
- [x] 4.3 Manejo de errores: nunca exponer stack trace crudo
- [x] 4.4 Registrar el router en `main.py`
- [x] 4.5 Probar endpoint localmente
- [ ] **Criterio de éxito**: POST /agent/query responde con formato JSON correcto

### Fase 5: Documentación y entrega (Día 3)
- [x] 5.1 Captura o export del trace de una corrida completa
- [x] 5.2 Resultado de correr los evals
- [x] 5.3 Pull Request con etiqueta `langgraph-agent-base`
- [x] 5.4 Actualizar memory/ con resumen del progreso
- [ ] **Criterio de éxito**: PR abierto con trace + evals

---

## Estructura de ramas

```
main ─── dev ─── feature/langgraph-agent-base
                         ├── feat/agent-graph
                         ├── feat/agent-evals
                         └── feat/agent-endpoint
```

## Milestones
- **[2026-09-26]**: Grafo compilado y funcional
- **[2026-09-27]**: 3 evals + endpoint + PR listo

## Backlog inicial (Issues sugeridos)
1. Instalar dependencia langgraph en el proyecto
2. Definir estado del grafo (TypedDict mínimo)
3. Implementar nodo retrieve (reutilizando rag.py)
4. Implementar nodo generate_answer (separado de query())
5. Implementar aristas condicionales (vacío, sin contexto)
6. Compilar grafo con validación
7. Agregar checkpointing con MemorySaver
8. Instrumentar tracing (logs estructurados)
9. Crear test_agent_evals.py con 3 casos
10. Crear endpoint POST /agent/query
11. Registrar router en main.py
12. Verificar tests RAG existentes
13. Abrir PR con etiqueta langgraph-agent-base

---

*Plan generado por Project Initializer (A00) — 2026-09-25*