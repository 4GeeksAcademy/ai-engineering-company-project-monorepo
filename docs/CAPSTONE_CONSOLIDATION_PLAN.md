# CAPSTONE_CONSOLIDATION_PLAN.md — Plan de Consolidación, Merges y Navegación del Monorepo
**Módulo:** PROYECTO FINAL  
**Referencia Pedagógica:** Lección *"Has terminado el curso, ¿y ahora qué?"* & *Capstone — Pitch de IA en 5 minutos*  
**Empresa:** TrackFlow (Logística Los Ángeles & Zaragoza)  
**Fecha de Creación:** 18 de Octubre, 2026  
**Estado:** 📋 Planificación aprobada para ejecución paso a paso  

---

## 1. Objetivo y Fundamento del Plan

La lección final del programa de Ingeniería de IA establece un mandato claro antes de la graduación y de la grabación del vídeo capstone:
> *"Primero mergea y conecta tu monorepo de empresa para que el backoffice sea completamente navegable; después entrega el vídeo de pitch del capstone; luego sigue endureciendo la plataforma con proyectos complementarios."*

### ⚠️ Principio de No Regresión y Aprobaciones Pendientes
Dado que el profesor o revisor debe evaluar y dar el visto bueno a los proyectos y PRs presentados en cada rama independiente, **no realizaremos merges precipitados que rompan o sobreescriban el trabajo evaluable**.  
En su lugar, utilizaremos una **rama integradora de consolidación** (`integration/capstone-consolidated`) para validar que todos los hitos encajan, compilan y navegan juntos de forma segura antes de realizar el merge definitivo sobre `main`.

---

## 2. Inventario de Ramas de Hitos a Consolidar

A continuación se detalla cada rama desarrollada, el módulo que representa y sus aportes al sistema TrackFlow:

| # | Rama Git | Hito / Módulo | Componentes Aportados al Monorepo |
|---|---|---|---|
| 1 | `feature/telemetry-report` | **Application Telemetry & Pipelines** | • Backend: endpoints de ingesta `/telemetry/events` y reporte analítico con Pandas `/telemetry/report`.<br>• Frontend: Dashboard completo `uis/backoffice/app/telemetry/report/page.tsx` con métricas, embudo y latencias. |
| 2 | `feature/websocket-chat` | **Real-Time Communication** | • Backend: endpoints SSE `/api/notifications/events` y streaming WebSocket bidireccional `/ws/chat/{client_id}`.<br>• Frontend: Componentes de chat en tiempo real y recepción de alertas. |
| 3 | `feature/mcp-server` | **MCP Protocols** | • Servidor MCP estándar con herramientas de stock, catálogo y validación de seguridad de TrackFlow. |
| 4 | `feature/agent-memory` | **Agentic Memory Systems** | • Arquitectura de memoria SQLite en capas (sesión, contexto, episodic memory) para el Operations Agent. |
| 5 | `feature/agent-harness` | **Agent Harness & Guardrails (Hito 8)** | • Arnés de pruebas, simulación de respuestas agénticas y evaluación con métricas de completitud. |
| 6 | `feature/rfp-approval` | **Multi-Agent Systems (LangGraph)** | • Sistema multi-agente de 3 etapas: Routing, Generation (Evaluator-Optimizer) y Approval con checkpointing y supervisión humana. |
| 7 | `feature/owasp-security-audit` | **Web Security Hardening** | • Cabeceras HTTP de seguridad, anti-fuerza bruta (rate limiter), protección CSRF/XSS, IDOR, CSV formula injection y auditoría estructurada. |
| 8 | `feature/secure-ai-integration` | **Secure AI Applications (NIST & OWASP LLM)** | • Guardrails deterministas: `PromptInjectionGuard`, `SensitiveDataRedactor`, `HumanInTheLoopGate`, `ModelOutputValidator`, `TokenBudgetRateLimiter` y registro de gobernanza NIST CSF 2.0. |
| 9 | `feature/serialization-audit` | **Data Integrity & Serialization** | • Refactorización estricta de esquemas Pydantic V2 en todos los modelos de la API. |

---

## 3. Hoja de Ruta de Ejecución Segura (Paso a Paso)

### Fase 1: Creación de la Rama Integradora Segura
Para proteger la rama `main` y permitir que los revisores evalúen cualquier PR individual sin interferencias:
```bash
git checkout main
git pull origin main
git checkout -b integration/capstone-consolidated
```

### Fase 2: Secuencia Ordenada de Merges (De menor a mayor acoplamiento)
Realizaremos los merges uno a uno, verificando en cada paso la estabilidad del backend y de los frontends:

1. **Paso 2.1 — Telemetría y Analítica:**
   ```bash
   git merge origin/feature/telemetry-report -m "chore(capstone): merge telemetry storage and report dashboard"
   ```
2. **Paso 2.2 — Comunicación en Tiempo Real:**
   ```bash
   git merge origin/feature/websocket-chat -m "chore(capstone): merge SSE notifications and WebSocket chat"
   ```
3. **Paso 2.3 — MCP y Arneses de Agentes:**
   ```bash
   git merge origin/feature/mcp-server -m "chore(capstone): merge MCP server tools"
   git merge origin/feature/agent-memory -m "chore(capstone): merge agent layered memory"
   git merge origin/feature/agent-harness -m "chore(capstone): merge agent harness and evals"
   ```
4. **Paso 2.4 — Sistema Multi-Agente RFP:**
   ```bash
   git merge origin/feature/rfp-approval -m "chore(capstone): merge multi-agent RFP routing and approval"
   ```
5. **Paso 2.5 — Endurecimiento Web y Seguridad:**
   ```bash
   git merge origin/feature/owasp-security-audit -m "chore(capstone): merge OWASP web security protections"
   ```
6. **Paso 2.6 — Seguridad y Gobernanza de IA:**
   ```bash
   git merge origin/feature/secure-ai-integration -m "chore(capstone): merge secure AI guardrails and NIST governance"
   ```
7. **Paso 2.7 — Serialización y Tipado:**
   ```bash
   git merge origin/feature/serialization-audit -m "chore(capstone): merge serialization and Pydantic schemas"
   ```

*Nota sobre resolución de conflictos:*  
El único punto de confluencia esperado es [`services/api/main.py`](file:///home/taisu/IA-ENGINEERING-LAB/08-proyectos/monorepo/services/api/main.py) (donde se registran los routers y middlewares). En ese archivo nos aseguraremos de incluir **todos** los routers de forma limpia y ordenada:
- `suppliers_router`, `users_router`, `profiles_router`, `auth_router`, `incidents_router`, `telemetry_router`, `ai_security_router`, `chat_ws_router`, etc.

---

## 4. Plan de Conexión de UI en el Backoffice (Navegabilidad 100% por Clics)

El requisito explícito del profesor dice:
> *"Cada módulo del backoffice tiene un punto de entrada visible desde la navegación de la app. Puedes empezar en el home del backoffice y llegar a cada feature haciendo clic, en una sesión continua, sin escribir a mano ninguna URL."*

### 4.1 Barra de Navegación Unificada (`uis/backoffice/components/navbar-auth.tsx`)
Asegurar enlaces claros y responsivos a todas las áreas clave:
- 🏢 **Inicio / Dashboard** (`/`)
- 📦 **Proveedores** (`/suppliers`)
- 🚨 **Incidencias** (`/incidents`)
- 📊 **Telemetría** (`/telemetry/report`)
- 🤖 **Agentes & IA** (`/agents` o `/chat`)
- 🛡️ **Seguridad & HITL** (`/security` o acceso directo al panel)
- 👤 **Menú de Usuario / Cuenta** (`/account/profile`, `/account/change-password`, `Logout`)

### 4.2 Dashboard Principal del Backoffice (`uis/backoffice/app/page.tsx`)
Diseñar una cuadrícula de **Tarjetas de Acceso Rápido (Feature Hub)** con diseño premium:
1. **Tarjeta de Directorio de Proveedores:** Conteo rápido y botón "Explorar Proveedores" → `/suppliers`.
2. **Tarjeta de Centro de Incidencias:** Total incidencias activas y botón "Ver Incidencias" → `/incidents`.
3. **Tarjeta de Reporte de Telemetría:** Gráficas de rendimiento y botón "Dashboard Analítico" → `/telemetry/report`.
4. **Tarjeta de Asistente de Almacén en Tiempo Real:** Botón "Abrir Chat WebSocket" → interfaz interactiva.
5. **Tarjeta de Operaciones Multi-Agente (RFP):** Estado del pipeline agéntico.
6. **Tarjeta de Gobernanza y Guardrails de IA:** Estado del sistema, cuotas de tokens y tickets HITL pendientes de aprobación humana.

---

## 5. Batería de Pruebas de Calidad y No-Regresión

Antes de dar el monorepo por completado:
1. **Integridad de Tipos TypeScript:**
   ```bash
   npx tsc -p uis/backoffice/tsconfig.json --noEmit
   npx tsc -p uis/website/tsconfig.json --noEmit
   ```
2. **Compilación de Producción:**
   ```bash
   npm --prefix uis/backoffice run build
   npm --prefix uis/website run build
   ```
3. **Suite Completa de Pruebas de Backend:**
   ```bash
   pytest services/api
   ```
4. **Smoke Test de Servidores Locales:**
   - Backend FastAPI respondiendo en `http://localhost:8000/docs`.
   - Backoffice Next.js respondiendo en `http://localhost:3000`.

---

## 6. Guion Estructurado para el Vídeo Capstone (5 Minutos)

Una vez que el monorepo esté consolidado y navegable:

| Tiempo | Sección | Contenido a Presentar a Cámara y Pantalla |
|---|---|---|
| **0:00 - 0:30** | **Gancho y Presentación** | *"En logística de última milla entre Los Ángeles y Zaragoza, cada minuto de retraso o fallo en inventario cuesta miles de euros. Mi nombre es Jonathan Esteban y construí TrackFlow, una plataforma empresarial con agentes autónomos, gobernanza estricta y analítica en tiempo real."* |
| **0:30 - 1:15** | **Problema del Negocio** | Describir el problema real de TrackFlow: desconexión entre almacén, proveedores y operaciones, necesidad de automatizar triaje de incidencias y licitaciones sin perder control humano. |
| **1:15 - 3:15** | **Demo en Vivo (Navegación 100% por Clics)** | **Recorrido fluido por la UI:**<br>1. Login con JWT en Backoffice.<br>2. Navegación a Proveedores e Incidencias.<br>3. Dashboard de Telemetría con Pandas.<br>4. Asistente agéntico por WebSocket.<br>5. Demostración del Human-in-the-Loop y Guardrail de IA deteniendo una acción destructiva en vivo. |
| **3:15 - 4:15** | **Decisiones de Ingeniería y Trade-Offs** | Hablar como ingeniero: *"Elegí una arquitectura de Defensa en Profundidad desacoplada del LLM porque los system prompts no detienen inyecciones indirectas. Usé WebSocket streaming para la experiencia de almacén y circuit breakers para proteger los presupuestos de inferencia."* |
| **4:15 - 5:00** | **Q&A Oficial de 4Geeks (3 Preguntas)** | Responder a cámara con frases completas y 2 segundos de pausa limpia antes y después:<br>1. *¿Cuál fue el mayor reto técnico que enfrentaste y cómo lo superaste?*<br>2. *Si tuvieras un mes más, ¿qué feature agregarías a la plataforma?*<br>3. *¿Cómo influyeron los principios de observabilidad y seguridad en tu arquitectura?* |

---

## 7. Próxima Tarea a Ejecutar

En la próxima sesión de trabajo:
1. Confirmar con el usuario si el profesor ya dio feedback de los PRs pendientes o si procedemos con la rama integradora `integration/capstone-consolidated`.
2. Ejecutar la secuencia de merges controlada de la Sección 3.
3. Conectar la UI del Backoffice según la Sección 4.
4. Validar el build completo y preparar la grabación del vídeo.
