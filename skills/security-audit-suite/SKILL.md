---
name: security-audit-suite
description: >-
  Suite integral de auditoría de seguridad, modelado de amenazas y endurecimiento
  en 3 capas: OWASP Top 10:2025 (Web/API), OWASP Top 10 para Aplicaciones LLM 2026
  (Inyección de Prompt, Tríada Letal, Agentes, RAG/Vectores) y Endurecimiento de
  Servidores Linux. Úsala siempre al diseñar nuevos endpoints, agentes o tools MCP,
  al auditar pull requests o repositorios en busca de vulnerabilidades, o al
  preparar un servidor/contenedor para producción.
---

# Security Audit Suite (Web · LLM/Agéntica · Servidor)

Marco reutilizable y agnóstico al stack que convierte los principios de seguridad defensiva en un protocolo de auditoría ejecutable en **tres capas**:
1. **Capa de Aplicación y API** ([OWASP Top 10:2025](./references/owasp-web-2025.md))
2. **Capa Cognitiva, LLM, RAG y Agéntica** ([OWASP LLM Top 10:2026](./references/owasp-llm-2026.md))
3. **Capa de Infraestructura y Servidor** ([Endurecimiento de Servidor](./references/server-hardening.md))

---

## Invariantes de Seguridad No Negociables

Aplica estos tres principios en cada revisión de diseño y auditoría de código:

1. **Denegar por Defecto y *Fail-Secure* en Todas las Capas:** Toda guarda de autenticación, verificación de autorización, regla de firewall, permiso de herramienta y bloque `try/except` o `try/catch` DEBE denegar acceso y abortar de forma segura ante un error. Un fallback en `catch` que concede permiso o continúa una operación no verificada es un **bug CRÍTICO (*fail-open*)**.
2. **Autenticación ≠ Autorización:** Validar un JWT o cookie de sesión solo prueba *quién* llama. Verifica siempre **propiedad y rol** del lado del servidor sobre cada identificador de recurso (`id`, `session_id`, `ticket_id`) para prevenir **IDOR**.
3. **Contención sobre Perfección en LLMs:** Los LLMs procesan instrucciones y datos en un único flujo de tokens y **no pueden hacerse infalibles**. Nunca confíes en el *System Prompt* como frontera de seguridad. Implementa autorización, manejo de secretos, validación de esquemas, límites de gasto y aprobación humana (**HITL**) en código determinista **fuera del modelo**.

---

## Selección de Modo (Carga Progresiva)

Elige únicamente el modo o modos relevantes para la tarea actual y carga **solo** los archivos de referencia necesarios para conservar la ventana de contexto:

| Modo | Cuándo Activarlo | Referencia a Cargar |
| :--- | :--- | :--- |
| **Modo 1: Modelado de Amenazas Pre-Código** | Antes de escribir un nuevo endpoint, flujo de pagos/negocio, tool MCP o flujo agéntico. | [owasp-web-2025.md](./references/owasp-web-2025.md) + [owasp-llm-2026.md](./references/owasp-llm-2026.md) |
| **Modo 2: Auditoría Web y API** | Al auditar rutas, auth, consultas SQL, subida de archivos, CORS, manejo de errores o dependencias. | [owasp-web-2025.md](./references/owasp-web-2025.md) |
| **Modo 3: Auditoría LLM, Agentes y RAG** | Al auditar prompts, grafos LangGraph/agentes, tools MCP, bases vectoriales (Qdrant/pgvector) o salidas LLM. | [owasp-llm-2026.md](./references/owasp-llm-2026.md) |
| **Modo 4: Endurecimiento de Servidor y Despliegue** | Al endurecer VPS Linux, SSH, usuarios/`sudo`, permisos Unix, firewall UFW o puertos Docker. | [server-hardening.md](./references/server-hardening.md) |
| **Modo 5: Sistemas Críticos / Multi-Agente (Nivel 5)** | En arquitecturas **Nivel 5** (*Swarms*, workflows paralelos, sistemas distribuidos con SLAs estrictos o producción autónoma). | [owasp-llm-2026.md](./references/owasp-llm-2026.md#anexo-verificación-nivel-5--ecosistemas-multi-agente-y-producción-crítica) + [server-hardening.md](./references/server-hardening.md) |

---

## Protocolo de Auditoría Paso a Paso

### Paso 1: Identificar Alcance y Superficie de Ataque
Mapea los puntos de entrada y las fronteras de confianza del módulo o repositorio objetivo:
- **Entradas No Confiables:** Parámetros/cuerpos HTTP, archivos subidos (PDF/imágenes/audio), frames WebSocket/SSE, documentos RAG externos, respuestas de servidores MCP.
- **Activos Sensibles:** Credenciales, JWTs, PII, datos por inquilino (*tenant*), embeddings vectoriales, DBs internas / Redis / Qdrant.
- **Sumideros y Acciones:** Consultas SQL, llamadas a shell, renderizadores HTML/Markdown, rutas de archivos, correos/webhooks salientes y herramientas que mutan estado.

### Paso 2: Ejecutar Reconocimiento Estático Automatizado
Ejecuta el script auxiliar de solo lectura contra la carpeta o raíz del repositorio para detectar señales de alerta inmediatas antes de la revisión manual:

```bash
bash skills/security-audit-suite/scripts/quick_security_scan.sh .
```

Inspecciona cada coincidencia reportada y separa los hallazgos reales de posibles falsos positivos (por ejemplo, fixtures de test).

### Paso 3: Aplicar la Compuerta de la Tríada Letal (Obligatoria en Features LLM/Agénticas)
Para toda funcionalidad con LLM o agente, evalúa si concurren las tres patas simultáneamente:
- **(A) Entrada No Confiable** llega al contexto del modelo (texto del usuario, PDFs, webs, chunks RAG, tickets, salidas MCP).
- **(B) Acceso a Datos Privados/Sensibles** desde el modelo o sus herramientas.
- **(C) Comunicación Externa o Cambio de Estado Irreversible** disparable desde la salida del modelo.

> **Regla de Decisión (Regla de Dos de Meta):** Si coinciden **(A) + (B) + (C)** a la vez, existe un vector **CRÍTICO** de exfiltración o abuso por inyección de prompt. Debes eliminar al menos una pata arquitectónicamente O exigir confirmación **Human-in-the-Loop (HITL)** determinista fuera del modelo mostrando la acción exacta antes de ejecutarla.

### Paso 4: Verificación Profunda por Capa
Lee los archivos correspondientes en `./references/` y contrasta cada control contra el código real:
- **Web/API:** Control de Acceso Roto (IDOR), Configuración Incorrecta (CORS/Debug/Errores Verbosos), Cadena de Suministro (lockfiles, versiones fijadas, SRI), Criptografía (`bcrypt`/`Argon2`, TLS, cero secretos en URLs/logs), Inyección (consultas parametrizadas, arrays en `exec`, escape automático), Diseño Inseguro, Autenticación (*rate limiting*, mensajes genéricos, regeneración de sesión, MFA), Registro/Alertas y Condiciones Excepcionales (*fail-secure*, timeouts, transacciones atómicas).
- **LLM/RAG/MCP:** LLM01–LLM10 — filtrado Unicode invisible/multimodal, cero secretos ni reglas de permisos en prompts (LLM08), codificación en sumideros y bloqueo de exfiltración por imágenes Markdown (LLM10), patrón **Reclamar → Verificar → Actuar** + validación estricta de esquemas (LLM07), herramientas mínimas de solo lectura (LLM03), cuotas de tokens y disyuntores de pasos en agentes (LLM06), hashes inmutables y cero `pickle` (LLM04/LLM05), y filtrado *tenant* **dentro** de la consulta vectorial + backups confidenciales (LLM09).
- **Servidor/Infra:** SSH (`PasswordAuthentication no`, `PermitRootLogin no`, `AllowUsers`), usuario sin privilegios con `sudo` + cuentas de servicio `nologin`, permisos Unix (`755`/`644`/`600`, **cero `777`** en carpetas de uploads), `ufw default deny incoming`, enlace `127.0.0.1` en servicios internos y auditoría de puertos con `ss -tulpn`.
- **Nivel 5 (Multi-Agente / Producción Crítica):** Aislamiento *Zero-Trust* entre subagentes/workers (validación de contratos entre agentes, sin herencia ciega de privilegios del coordinador), presupuesto global de tokens/coste/pasos en todo el DAG (FinOps/SRE), y comportamiento *fail-secure* ante caídas simultáneas o concurrencia.

### Paso 5: Verificación Activa y Adversaria
Nunca te conformes con leer el código. Prueba activamente o añade tests automatizados para:
1. **Acceso sin Autenticación / Otro Usuario:** Llama a cada endpoint protegido (HTTP, SSE, WebSocket) sin token (`401` / WS `1008`), con token inválido y con el token de **otro usuario** (`403` anti-IDOR).
2. **Simulación *Fail-Open*:** Fuerza una excepción o timeout en un validador, guardrail o verificación de pago/autorización y confirma que la solicitud se **niega** devolviendo un error genérico sin trazas de pila.
3. **Entradas Adversarias:** Prueba inyección indirecta de prompt, caracteres Unicode invisibles, nombres de archivo con *path traversal* (`../../etc/passwd`) y bucles/entradas sobredimensionadas.
4. **Inyección de Fallos (*Chaos* Ligero — Nivel 5):** En sistemas distribuidos/multi-agente, simula la caída o timeout de Redis, Qdrant, DB o de un worker en mitad de un flujo paralelo y verifica que no se filtre contexto, no se corrompa el estado compartido y se respete la política *fail-secure* y de *rollback*.

### Paso 6: Emitir el Reporte Estructurado de Auditoría
Documenta los hallazgos usando [./resources/audit-report-template.md](./resources/audit-report-template.md). Cada hallazgo DEBE incluir:
- Ruta exacta y rango de líneas (`archivo:línea`)
- Categoría OWASP / Servidor y Severidad (`CRÍTICA`, `ALTA`, `MEDIA`, `BAJA`)
- Escenario concreto de explotación
- Remediación mínima verificada y test de regresión requerido

---

## Integración con Otros Flujos
- **Con `code-refinement-suite` (Mapeo por Complejidad Niveles 1–5):**
  - *Nivel 1–2:* Aplicar invariantes base + verificación de Auth Guard y sumideros en el diff.
  - *Nivel 3–4:* Ejecutar **Modo 1** en `PACK 1 (ARCHITECT)` (Threat Modeling & FMEA) y **Modos 2–4 + script del Paso 2** en `PACK 4 (AUDITOR)`.
  - *Nivel 5 (Complejidad Crítica):* Exigir **Modos 1–5 completos** (aislamiento *cross-agent*, presupuesto global FinOps/SRE del DAG, *Contract Testing* + *Chaos* ligero *fail-secure*, y *Release Readiness Audit* reproducible en CI/CD).
- **Seguridad en Git:** Nunca hagas `git push` automático de correcciones; presenta primero el reporte y los tests verificados y solicita confirmación explícita al usuario.
