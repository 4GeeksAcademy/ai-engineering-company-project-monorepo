# Hito 8: Aseguramiento de Agentes — Harness y Guardrails (Parte 2 de 2)

Este módulo implementa la arquitectura de producción de **Harness Engineering (`Agente = Modelo + Harness`)** para TrackFlow, envolviendo al agente con defensas en capas para mitigar fallos de seguridad, contenido y estructura.

---

## 🎯 Principio de Diseño

> **"Un modelo por sí solo no es seguro. La seguridad la impone el arnés (Harness), no el prompt."**

Los prompts del tipo *"No hagas nada inseguro"* o *"No filtres datos"* fracasan ante inyecciones. Este proyecto implementa capas programáticas de defensa activa:

1. **Input Guardrails:** Neutraliza ataques de inyección de prompt (*Prompt Injection*), jailbreaks y comandos no autorizados antes de que toquen al modelo.
2. **Privacy Guardrails (PII):** Sanitiza y ofusca información personal sensible (emails, teléfonos, tarjetas de crédito, tokens).
3. **Structural Guardrails:** Valida mediante esquemas Pydantic que las salidas del agente tengan la forma requerida.
4. **Harness Execution Engine:**
   - **Control de bucles:** Máximo 3 iteraciones de razonamiento/herramientas para evitar costes infinitos.
   - **Lista blanca (*Tool Whitelist*):** Solo permite ejecutar herramientas explícitamente autorizadas.
   - **Mecanismo de Fallback:** Respuestas degradadas y seguras si una herramienta falla.
   - **Human-in-the-Loop (HITL):** Requiere confirmación humana explícita antes de ejecutar acciones de alto impacto o irreversibles.
   - **Trazabilidad:** Registro estructurado de eventos e incidentes de seguridad interceptados.

---

## 🏗️ Estructura del Módulo

```text
agents/secured-agent/
├── guardrails.py        # Capas de defensa (Inyección, PII, Validación estructural)
├── harness.py           # Arnés de ejecución, whitelist, límites de bucle y HITL
├── test_harness.py      # Suite de pruebas de ataque y resiliencia (Red Teaming)
├── requirements.txt     # Dependencias del módulo
└── README.md            # Documentación técnica
```

---

## 🚀 Instalación y Pruebas

```bash
pip install -r requirements.txt
python3 test_harness.py
```
