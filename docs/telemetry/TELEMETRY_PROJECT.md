# TELEMETRY_PROJECT.md — Proyecto: Diseño del plan de telemetría

> **Proyecto:** Diseño del plan de telemetría de tu compañía  
> **Rama:** `feature/telemetry-plan`  
> **Empresa:** TrackFlow  
> **Estado:** ✅ Completado  
> **PR:** Pendiente de crear  

---

## 📋 Resumen del proyecto

Diseño del **Plan de Telemetría** de TrackFlow, la compañía de gestión de almacenes y última milla que opera entre Los Ángeles y Zaragoza.

El proyecto consistió en crear un documento técnico (`telemetry-plan.md`) y un archivo de esquemas JSON (`event-schemas.json`) que identifica de forma exhaustiva qué datos de telemetría vale la pena capturar, antes de escribir una sola línea de instrumentación.

---

## 📦 Entregables

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| Plan de Telemetría | `docs/telemetry/telemetry-plan.md` | Documento completo con catálogo de 23 eventos, Event Envelope, estrategia stream/batch, PII y riesgos |
| Esquemas JSON | `docs/telemetry/event-schemas.json` | 23 esquemas validables en JSON Schema draft-07 |

---

## 📊 Estadísticas del plan

| Métrica | Valor |
|---------|-------|
| **Total eventos** | **23** |
| Obligatorios (CONTEXT) | 5 |
| Oportunidades identificadas | 18 |
| Categorías cubiertas | 5 (inventario, autenticación, rendimiento, errores, navegación) |
| Eventos en stream | 13 |
| Eventos en batch | 10 |
| Eventos con PII | 5 (login_attempted, login_failed, password_reset_requested, session_started, api_validation_error) |
| Eventos descartados | 6 (con justificación) |

---

## 🏗️ Estructura del plan

### Fase 1 — Catálogo exhaustivo de oportunidades de datos
- 5 métricas obligatorias desde CONTEXT-empresa.md (TrackFlow)
- 7 puntos de instrumentación en el flujo de inventario
- 18 oportunidades adicionales en 5 categorías

### Fase 2 — Diseño del Event Envelope
- 8 campos estándar en el envelope: `eventId`, `timestamp`, `sessionId`, `userId`, `event_type`, `schemaVersion`, `requestId`, `properties`
- 23 eventos con esquema completo, allowlist y descripción
- Taxonomía `entidad_acción` consistente

### Fase 3 — Estrategia de entrega
- Decisión stream/batch justificada para cada evento
- Estrategia throttle/debounce para eventos de alta frecuencia
- 6 eventos descartados con justificación
- 5 riesgos identificados con mitigación

---

## ✅ Checklist de cumplimiento

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Métricas obligatorias del CONTEXT presentes | ✅ |
| 2 | Oportunidades técnicas y de negocio amplias | ✅ 18 adicionales en 5 categorías |
| 3 | Cada evento con hipótesis y decisión | ✅ |
| 4 | Event Envelope consistente (8 campos) | ✅ |
| 5 | Allowlist de propiedades por evento | ✅ |
| 6 | event-schemas.json válido y consistente | ✅ |
| 7 | Decisión stream/batch justificada | ✅ |
| 8 | PII identificados con estrategia de anonimización | ✅ |
| 9 | Riesgos y exclusiones con pensamiento crítico | ✅ |
| 10 | Precisión suficiente para instrumentar | ✅ |

---

## 🔄 Próximos proyectos en la serie de telemetría

Según el syllabus de 4Geeks, después de este proyecto vienen:

1. **Captura de telemetría** (`ai-eng-telemetry-capture`) — Instrumentar los eventos en el frontend (Next.js) y backend (FastAPI) con un stub endpoint.
2. **Almacenamiento de telemetría** (`ai-eng-telemetry-storage`) — Construir el pipeline de almacenamiento real para los eventos.
3. **Reporte técnico de telemetría** — Dashboard y reporte ejecutivo con los datos capturados.

---

## 🌿 Estrategia de rama

- **Rama actual:** `feature/telemetry-plan` (basada en `main`)
- **PR title:** `docs: telemetry design plan`
- **PR description incluirá:**
  - Total: 23 eventos (5 obligatorios + 18 identificados)
  - Categorías: negocio/inventario, autenticación, rendimiento, errores, navegación
  - Decisión de diseño más difícil: clasificar correctamente los eventos de autenticación entre `login_attempted` y `login_failed` sin duplicar información, y diseñar la sanitización de PII para evitar fugas de datos sensibles

---

## 🔧 Comandos útiles

```bash
# Validar JSON
python3 -c "import json; json.load(open('docs/telemetry/event-schemas.json')); print('✅ Válido')"

# Ver estado de la rama
git log --oneline feature/telemetry-plan ^main

# Crear PR (usando gh CLI)
gh pr create --base main --head feature/telemetry-plan \
  --title "docs: telemetry design plan" \
  --body "## Descripción\n\nPlan de Telemetría para TrackFlow.\n\n**Total:** 23 eventos (5 obligatorios + 18 identificados)\n**Categorías:** negocio/inventario, autenticación, rendimiento, errores, navegación\n**Decisión más difícil:** Clasificar eventos de autenticación y diseñar sanitización de PII."
```