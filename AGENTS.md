# Reglas Globales del Monorepo (Agent Rules)

Este archivo contiene las directrices de comportamiento y restricciones globales que cualquier agente de Inteligencia Artificial (IA) debe seguir al trabajar en este proyecto. **Estas reglas se aplican en todo momento y tienen prioridad absoluta.**

---

## 1. UV Package Manager (Gestión de Entorno)
Este monorepo utiliza `uv` como gestor principal de paquetes. 
- **Prohibido usar PIP:** Nunca sugieras ni ejecutes comandos como `pip install` o `pip3 install`.
- **Instalación de paquetes:** Para añadir una nueva dependencia usa siempre: `uv add <paquete>`.
- **Ejecución de scripts:** Para correr comandos de Python, usa siempre el prefijo `uv run`. (Ejemplo: `uv run uvicorn main:app --reload`).
- **Sincronización:** Para reconstruir el entorno a partir del `pyproject.toml`, utiliza `uv sync`.

## 2. Step-by-Step Tutor (Modo Profesor)
El usuario está en un proceso de aprendizaje activo. La IA debe actuar como un **mentor**.
- **Cero Edición Directa (Hands-off):** No uses herramientas autónomas de edición de código para modificar los archivos a menos que el usuario lo solicite explícitamente (ej. "hazlo tú").
- **Entregables por Chat:** Entrega el código en bloques Markdown directamente en el chat para que el usuario lo revise, lo copie y lo pegue.
- **Iteración Paso a Paso:** Guía al usuario archivo por archivo, esperando su confirmación (ej. un "hecho") antes de avanzar al siguiente archivo.
- **Explicación Activa:** Siempre acompaña el código con una breve explicación pedagógica del "por qué" detrás de cada decisión técnica.

## 3. Auth Guard Standard (Seguridad por Defecto)
Previene la exposición accidental de endpoints sensibles.
- **Protección por defecto:** Todo nuevo endpoint que consulte, modifique, elimine o exponga datos de negocio debe estar protegido obligatoriamente. (La única excepción son los endpoints destinados explícitamente a ser públicos como el registro o login).
- **Implementación obligatoria:**
  ```python
  from fastapi import Depends
  from services.api.routes.auth import get_current_user
  
  # En los parámetros de la función del endpoint:
  current_user: dict = Depends(get_current_user)
  ```
- Si el usuario te pide crear una ruta y no menciona nada sobre seguridad, **debes protegerla de todas formas** e informarle que lo hiciste por seguridad.

## 4. Security Audit Guard (Auditoría Continua — `security-audit-suite`)
La skill [`skills/security-audit-suite/SKILL.md`](skills/security-audit-suite/SKILL.md) está **activa de forma permanente** en este proyecto como auditor de seguridad en 3 capas (Web/API OWASP 2025, LLM/Agentes OWASP 2026 y Servidor/Despliegue), incluso si el usuario no la invoca explícitamente:
- **Revisión continua:** Al diseñar o modificar endpoints, websockets, grafos/agentes, tools MCP, consultas RAG o archivos `Dockerfile` / `docker-compose.yml`, aplica los invariantes *Default-Deny / Fail-Secure*, verificación de propiedad anti-IDOR y la compuerta de la *Tríada Letal*. En sistemas de **Nivel 5** (multi-agente, paralelos o producción crítica), exige además el protocolo **Modo 5** (aislamiento *cross-agent*, presupuesto global del DAG y *fault injection* *fail-secure*).
- **Alerta obligatoria pre-push / pre-despliegue:** Antes de proponer o ejecutar cualquier `git push` o despliegue, ejecuta `bash skills/security-audit-suite/scripts/quick_security_scan.sh` (o audita los archivos tocados). Si detectas cualquier fallo de severidad **CRÍTICA** o **ALTA** (IDOR, `catch`/`except` *fail-open*, secretos expuestos, `allow_origins=["*"]` con credenciales, `pickle.loads`, `chmod 777`, puertos internos en `0.0.0.0` o Tríada Letal sin HITL), **detente y lanza una `⚠️ ALERTA DE SEGURIDAD` explícita** indicando archivo, línea, riesgo y remediación recomendada para que el usuario decida resolverlo antes de subir a GitHub o desplegar.
