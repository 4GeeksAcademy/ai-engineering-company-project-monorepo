# Implementation Plan: Captura de Telemetría (Frontend & Stub Backend)

Este plan se basa estrictamente en la estrategia consolidada y define los pasos de implementación para el servicio de captura.

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 1: Endpoint stub en FastAPI (Backend)
- [ ] **1.1 Definición del Modelo:** Crear el modelo Pydantic `TelemetryEvent` en el backend con los campos del envelope: `eventId`, `timestamp`, `sessionId`, `userId`, `event_type`, `schemaVersion`, `requestId`, y `properties`.
- [ ] **1.2 Variable de Entorno:** Configurar la lectura de la variable `TELEMETRY_ENDPOINT` en la configuración del backend para establecer la convención.
- [ ] **1.3 Enrutador y Endpoint:** Crear el endpoint `POST /telemetry/events` en el router de `services/`.
- [ ] **1.4 Lógica del Endpoint:** Configurar el endpoint para aceptar un JSON del tipo `{ "events": [...] }`, loguear en consola la cantidad de eventos recibidos (junto a sus `event_type`), y devolver un `200 OK` con `{ "received": N }`.

### Fase 2: TelemetryService en el frontend
- [ ] **2.1 Entorno Frontend:** Agregar la variable `NEXT_PUBLIC_TELEMETRY_ENDPOINT` en `.env.local` apuntando al stub (`http://localhost:8000/telemetry/events`).
- [ ] **2.2 Estructura Base:** Crear el archivo `uis/backoffice/src/services/telemetry.ts` y exponer una única función pública `track(eventType, properties)`. No deben existir llamadas fetch directas fuera de este servicio.
- [ ] **2.3 Metadatos Automáticos:** Integrar la autogeneración de campos en cada evento (`eventId`, `sessionId`, `userId`, `timestamp` en ISO 8601, `schemaVersion`, `requestId`).
- [ ] **2.4 Cola en Memoria y Batching:** Implementar el almacenamiento temporal en un array y lógica de debounce: enviar a backend cada 10 segundos o al alcanzar 20 eventos.
- [ ] **2.5 Flush Confiable:** Escuchar el evento `visibilitychange` para forzar el envío asíncrono y confiable usando `navigator.sendBeacon` cuando el usuario abandona la pestaña.
- [ ] **2.6 Reintentos:** Implementar lógica de reintentos con backoff exponencial (máximo 3 intentos) si falla el HTTP request.

### Fase 3: Instrumentación amplia (Técnica y Negocio)
- [ ] **3.1 Piso Técnico:** Instrumentar captura global de errores de frontend (ej. `window.onerror`, `unhandledrejection`).
- [ ] **3.2 Rendimiento y Navegación:** Capturar una métrica de rendimiento y page views de las secciones principales del backoffice.
- [ ] **3.3 Eventos de Negocio:** Instrumentar las métricas obligatorias y eventos priorizados definidos en `CONTEXT-empresa.md`, respetando los esquemas estrictos de propiedades de `event-schemas.json`.
- [ ] **3.4 Verificación de Ausencia de PII:** Auditar visualmente el código de instrumentación para asegurar que no se envían datos sensibles (passwords, emails, nombres directos).
- [ ] **3.5 Validación final (DevTools):** Ejecutar la aplicación, interactuar y verificar en la pestaña *Network* que los lotes se envían correctamente y reciben `200 OK`.

### Actividad adicional: Rendimiento y Autenticación
- [ ] **4.1 Web Vitals:** Instrumentar métricas web vitals pasándolas por el `TelemetryService`.
- [ ] **4.2 Autenticación Segura:** Instrumentar eventos de auth (login fallido, sesión expirada) desde los hooks globales, asegurando que `properties` contenga las razones (`invalid_credentials`) pero **NUNCA** los valores de entrada.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

Esta implementación ha sido clasificada y procesada bajo el protocolo de **Nivel 2 (Complejidad Media)** de nuestra Code Refinement Suite. Aunque la captura de telemetría pudiera parecer un simple envío de datos, en realidad implica orquestación asíncrona, manejo de estados en memoria (colas), tolerancia a fallos de red (reintentos) y manipulación del ciclo de vida del navegador (`sendBeacon`). 

Para garantizar un código resiliente y altamente modular, aplicamos el **PACK_PLANNER** a través de las siguientes técnicas estructuradas y detalladas:

1. **Step-Back Prompting (Abstracción Arquitectónica):**
   - *Por qué se aplicó:* Tratar de implementar la captura en el frontend y el almacenamiento real en el backend al mismo tiempo suele generar acoplamiento. Si el frontend asume cómo se guardará la data, el payload se vuelve rígido y propenso a romperse ante cambios.
   - *Conclusión:* Dimos un "paso atrás" (Step-Back) para desacoplar el sistema en tres capas impermeables e independientes. 
     1. La **Capa de Recepción** (Fase 1) es intencionalmente temporal ("stub"): un endpoint en FastAPI que solo valida que el contrato (el JSON Envelope) se respete y responde 200, aislando la complejidad de la persistencia real (Fase 3).
     2. La **Capa de Transporte** (Fase 2, `TelemetryService`) asume y encapsula toda la carga técnica de red para que la interfaz de usuario no se entere.
     3. La **Capa de Generación** (Fase 3, instrumentación) queda limpia; los componentes solo invocan `track()`. Esto previene el *código espagueti* de peticiones HTTP dispersas.

2. **Self-Refinement Loop (Iteraciones de Planificación y Rendimiento):**
   - *Por qué se aplicó:* En una primera concepción ingenua, la tendencia natural es hacer un `fetch` inmediatamente al ocurrir un evento. Sin embargo, al refinar la idea bajo criterios de escalabilidad, detectamos que esto saturaría tanto el *event loop* del navegador como la infraestructura del backend en momentos de alta concurrencia.
   - *Conclusión:* En el primer ciclo de refinamiento, introdujimos el patrón **Cola local + Batching + Debounce** (agrupar eventos cada 10s o 20 interacciones). En el segundo ciclo, cuestionamos los casos extremos (Edge Cases): *¿qué ocurre si el usuario cierra la pestaña antes del debounce?* Esto nos obligó a incluir el uso estricto de `navigator.sendBeacon` ligado al evento `visibilitychange`, asegurando un *flush confiable* que los navegadores respetan incluso al destruirse el DOM. Finalmente, el tercer ciclo definió la dependencia cronológica lineal del roadmap (no puedes instrumentar sin un servicio, y no puedes probar el servicio sin el stub) garantizando un desarrollo sin bloqueos.

3. **Defensive Design & Pre-Auditoría (Prevención de Riesgos / Shift-Left Security):**
   - *Por qué se aplicó:* Los sistemas de telemetría son vectores comunes de fugas de datos (Data Leaks). Capturar eventos a nivel de componente sin filtros puede terminar inyectando contraseñas, emails o tokens en texto plano hacia los logs del backend.
   - *Conclusión:* En lugar de esperar a la fase de **PACK_AUDITOR** al finalizar el desarrollo, aplicamos la filosofía *Shift-Left* (mover la seguridad a la etapa de diseño). Obligamos a que la validación en FastAPI use Pydantic para tipado estricto (Fase 1) y agregamos un paso de control obligatorio (Paso 3.4 y 4.2) que exige auditoría visual de ausencia de **PII (Personally Identifiable Information)**. Así garantizamos que la privacidad de los usuarios se construya "por diseño" y no como un parche correctivo a posteriori.
