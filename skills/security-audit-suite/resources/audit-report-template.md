# Informe de Auditoría de Seguridad — `<Proyecto / Funcionalidad>`

- **Fecha:** `AAAA-MM-DD`
- **Rama / Commit:** `<rama>` (`<sha>`)
- **Alcance Auditado:** `<directorios / endpoints / agentes / infraestructura>`
- **Modos Ejecutados:** `[ ] Modelado de Amenazas  [ ] Web/API (OWASP 2025)  [ ] LLM/RAG (OWASP 2026)  [ ] Servidor  [ ] Nivel 5 (Multi-Agente / Chaos / FinOps)`
- **Estado Global de Riesgo:** `APROBADO | APROBADO CON OBSERVACIONES | BLOQUEADO (HALLAZGOS CRÍTICOS/ALTOS)`

---

## 1. Evaluación de la Tríada Letal (Funciones LLM / Agénticas)

| Funcionalidad / Agente | (A) Entrada No Confiable | (B) Datos Privados | (C) Acción Externa / Cambio de Estado | Control Mitigador (Pata Eliminada o HITL Determinista) |
| :--- | :---: | :---: | :---: | :--- |
| `<agente_o_flujo>` | Sí / No | Sí / No | Sí / No | `<ej. Solo herramientas de lectura / Confirmación HITL antes de escribir>` |

---

## 2. Matriz de Hallazgos

| ID | Capa / Categoría | Severidad | Ubicación (`archivo:línea`) | Resumen | Estado |
| :--- | :--- | :---: | :--- | :--- | :---: |
| SEC-01 | `OWASP Web A01 (IDOR)` | **CRÍTICA** | `ruta/al/archivo.py:42` | Falta validación de propiedad del recurso | Abierto |
| SEC-02 | `OWASP LLM03 / LLM08` | **ALTA** | `ruta/al/agente.py:88` | `<resumen>` | Abierto |

---

## 3. Detalle de Hallazgos y Remediaciones

### `[SEC-01]` `<Título Corto>` — `<SEVERIDAD>`
- **Categoría:** `<ej. OWASP Web 2025 A01 · Control de Acceso Roto>`
- **Ubicación:** `[archivo.py](file:///ruta/absoluta#L10-L25)`
- **Escenario de Explotación:** `<Pasos concretos que ejecutaría un atacante o usuario distinto>`
- **Remediación Recomendada:** `<Cambio mínimo determinista en código o configuración>`
- **Test de Verificación:** `<Caso de prueba exacto (401/403, excepción fail-secure, payload de inyección, ss -tulpn) que demuestra el cierre>`

---

## 4. Compuerta de Verificación y Aprobación Pre-Despliegue

- [ ] Escaneo estático (`scripts/quick_security_scan.sh`) revisado y triado
- [ ] Todos los hallazgos `CRÍTICOS` y `ALTOS` remediados
- [ ] Pruebas de usuario no autenticado (`401` / WS `1008`) y otro usuario (`403`) en verde
- [ ] Manejo de errores *fail-secure* verificado (sin `catch`/`except` *fail-open* ni trazas filtradas)
- [ ] Archivos de bloqueo (`uv.lock` / `package-lock.json`) actualizados y limpios
- [ ] Auditoría post-despliegue de servidor (`ss -tulpn`, `ufw status`, permisos) verificada o programada

---

## 5. Verificación Nivel 5 (Solo Sistemas Críticos / Multi-Agente)

- [ ] Aislamiento *Zero-Trust* entre agentes/workers y contratos estrictos en *handoffs*
- [ ] Presupuesto global del DAG (tokens, coste, profundidad y timeouts) aplicado
- [ ] Inyección de fallos (*Chaos* ligero: caída de Redis/Qdrant/DB en concurrencia) verificada en modo *fail-secure* con *rollback* limpio
- [ ] *Release Readiness Gate* y evidencia reproducible en CI/CD adjunta
