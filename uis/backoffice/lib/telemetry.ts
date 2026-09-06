// lib/telemetry.ts — TelemetryService para TrackFlow Backoffice
//
// Propósito: Servicio centralizado de telemetría que captura eventos
// en el frontend, los acumula en una cola local, y los envía en batches
// al endpoint de telemetría.
//
// Responsabilidades:
// - Cola local: acumula eventos en memoria como un array interno
// - Batch + debounce: envía cada 10s o cuando la cola llega a 20 eventos
// - Flush confiable: usa navigator.sendBeacon en visibilitychange
// - Reintento con backoff: hasta 3 intentos con espera exponencial
// - Generación automática de eventId, sessionId, userId, timestamp, schemaVersion, requestId
//
// Uso:
//   import { track } from "@/lib/telemetry";
//   track("page_navigated", { page: "/suppliers" });
//
// ⚠️ Este es el ÚNICO punto de entrada para telemetría.
//    No usar fetch/axios directo para eventos de telemetría fuera de este servicio.

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const SCHEMA_VERSION = "1.0";

/** Intervalo de envío en milisegundos (10 segundos) */
const FLUSH_INTERVAL_MS = 10_000;

/** Tamaño máximo del batch antes de forzar envío */
const MAX_BATCH_SIZE = 20;

/** Número máximo de reintentos ante fallo de red */
const MAX_RETRIES = 3;

/** Tiempo base para backoff exponencial (ms) */
const BASE_BACKOFF_MS = 1_000;

/** Endpoint de telemetría desde variable de entorno */
const TELEMETRY_ENDPOINT =
  process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || "";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  sessionId: string;
  userId: string;
  event_type: string;
  schemaVersion: string;
  requestId: string;
  properties: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Estado interno del servicio
// ─────────────────────────────────────────────────────────────

/**
 * Cola de eventos pendientes de envío.
 * Se acumulan aquí hasta que se cumple la condición de batch.
 */
let eventQueue: TelemetryEvent[] = [];

/** ID del intervalo de flush automático */
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

/** Indica si el servicio ha sido inicializado */
let initialized = false;

// ─────────────────────────────────────────────────────────────
// Funciones auxiliares
// ─────────────────────────────────────────────────────────────

/**
 * Genera un UUID v4.
 * En el navegador usa crypto.randomUUID() si está disponible,
 * como fallback genera un valor aleatorio.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: UUID v4 manual
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Obtiene el sessionId desde sessionStorage.
 * Si no existe, genera uno nuevo y lo persiste.
 */
function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    return generateUUID();
  }
  let sessionId = sessionStorage.getItem("telemetry_session_id");
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem("telemetry_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Obtiene el userId desde localStorage (token JWT).
 * Si el token existe, extrae el sub (user_id) del payload.
 * Si no hay token, devuelve string vacío.
 */
function getUserId(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return "";

    // El JWT tiene formato header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return "";

    // Decodificar payload (base64url → objeto)
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || "";
  } catch {
    return "";
  }
}

/**
 * Genera un requestId para correlación frontend-backend.
 * Se genera por cada batch de envío.
 */
function generateRequestId(): string {
  return generateUUID();
}

/**
 * Construye un evento completo con los campos del envelope.
 * Los campos eventId, sessionId, userId, timestamp, schemaVersion y requestId
 * se generan automáticamente — el componente que llama a track() NO los pasa.
 */
function buildEvent(
  eventType: string,
  properties: Record<string, unknown>,
): TelemetryEvent {
  return {
    eventId: generateUUID(),
    timestamp: new Date().toISOString(),
    sessionId: getOrCreateSessionId(),
    userId: getUserId(),
    event_type: eventType,
    schemaVersion: SCHEMA_VERSION,
    requestId: generateRequestId(),
    properties,
  };
}

// ─────────────────────────────────────────────────────────────
// Envío de batches
// ─────────────────────────────────────────────────────────────

/**
 * Envía un batch de eventos al endpoint de telemetría con reintentos.
 *
 * Implementa retry con backoff exponencial:
 * - Intento 1: espera BASE_BACKOFF_MS (1s)
 * - Intento 2: espera BASE_BACKOFF_MS * 2 (2s)
 * - Intento 3: espera BASE_BACKOFF_MS * 4 (4s)
 * - Si falla tras 3 intentos, descarta el batch
 *
 * La telemetría NO es crítica y NO debe bloquear la aplicación.
 */
async function sendBatchWithRetry(
  events: TelemetryEvent[],
  retriesLeft: number = MAX_RETRIES,
): Promise<boolean> {
  const requestId = events[0]?.requestId || generateRequestId();

  for (let attempt = 0; attempt <= MAX_RETRIES - retriesLeft; attempt++) {
    try {
      const response = await fetch(TELEMETRY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        return true;
      }

      // Si el servidor responde con error (4xx/5xx), no reintentar
      // El stub solo devuelve errores de validación, así que el batch es inválido
      console.warn(
        `[Telemetry] Server returned ${response.status} for batch ${requestId}. Discarding.`,
      );
      return false;
    } catch (err) {
      const retriesRemaining = MAX_RETRIES - attempt - 1;
      if (retriesRemaining <= 0) {
        console.warn(
          `[Telemetry] Failed to send batch ${requestId} after ${MAX_RETRIES} attempts. Discarding.`,
        );
        return false;
      }

      // Backoff exponencial: 1s, 2s, 4s
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
      console.info(
        `[Telemetry] Batch ${requestId} failed (attempt ${attempt + 1}/${MAX_RETRIES}). ` +
          `Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

/**
 * Envía el batch usando navigator.sendBeacon para flush confiable.
 * Se usa cuando la página se está cerrando o el usuario navega.
 * sendBeacon garantiza que la petición se complete incluso si la página se destruye.
 */
function sendBeaconBatch(events: TelemetryEvent[]): boolean {
  try {
    const blob = new Blob([JSON.stringify({ events })], {
      type: "application/json",
    });
    return navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
  } catch (err) {
    console.warn("[Telemetry] sendBeacon failed:", err);
    return false;
  }
}

/**
 * Vacía la cola actual enviando todos los eventos pendientes.
 *
 * Si el endpoint no está configurado, descarta la cola silenciosamente.
 * Esto permite que el frontend funcione sin telemetría en desarrollo.
 */
async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  // Si no hay endpoint configurado, descartar eventos
  if (!TELEMETRY_ENDPOINT) {
    console.warn(
      "[Telemetry] NEXT_PUBLIC_TELEMETRY_ENDPOINT not configured. Discarding events.",
    );
    eventQueue = [];
    return;
  }

  // Tomar todos los eventos actuales y vaciar la cola
  const batch = eventQueue.splice(0, eventQueue.length);

  // Enviar con reintentos
  await sendBatchWithRetry(batch);
}

// ─────────────────────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────────────────────

/**
 * Inicializa el servicio de telemetría.
 *
 * 1. Configura el intervalo de flush automático cada 10s
 * 2. Registra el handler de visibilitychange para sendBeacon
 *
 * Solo se ejecuta una vez, aunque se llame múltiples veces.
 * Se llama automáticamente al importar el módulo.
 */
function init(): void {
  if (initialized) return;
  if (typeof window === "undefined") return; // SSR guard

  initialized = true;

  // Flush periódico: cada 10 segundos
  flushIntervalId = setInterval(() => {
    flush();
  }, FLUSH_INTERVAL_MS);

  // Flush con sendBeacon cuando la página se oculta o cierra
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && eventQueue.length > 0) {
      const batch = eventQueue.splice(0, eventQueue.length);
      sendBeaconBatch(batch);
    }
  });

  // Flush al cerrar la página (beforeunload como respaldo)
  window.addEventListener("beforeunload", () => {
    if (eventQueue.length > 0) {
      const batch = eventQueue.splice(0, eventQueue.length);
      sendBeaconBatch(batch);
    }
  });
}

// Inicializar al importar el módulo (solo en cliente)
if (typeof window !== "undefined") {
  init();
}

// ─────────────────────────────────────────────────────────────
// API pública — ÚNICA función exportada
// ─────────────────────────────────────────────────────────────

/**
 * Registra un evento de telemetría.
 *
 * Esta es la ÚNICA función que deben usar los componentes.
 * No usar fetch/axios directo para telemetría.
 *
 * El evento se acumula en la cola local y se envía en batch
 * cuando se cumple alguna de estas condiciones:
 * - Han pasado 10 segundos desde el último envío
 * - La cola alcanza 20 eventos
 * - El usuario cierra la pestaña o navega a otra página
 *
 * Campos generados automáticamente (NO pasarlos manualmente):
 * - eventId (UUID v4)
 * - sessionId (UUID v4, persistido en sessionStorage)
 * - userId (del token JWT en localStorage)
 * - timestamp (ISO 8601, momento de captura)
 * - schemaVersion (constante "1.0")
 * - requestId (UUID v4, por batch)
 *
 * @param eventType - Tipo de evento en formato entidad_acción (ej. "page_navigated")
 * @param properties - Payload específico del evento. Solo las claves del allowlist definido en event-schemas.json
 *
 * @example
 *   track("page_navigated", { page: "/suppliers" });
 *   track("login_attempted", { email: "hash", success: true, ip_address: "..." });
 */
export function track(
  eventType: string,
  properties: Record<string, unknown> = {},
): void {
  // Asegurar inicialización
  if (!initialized) {
    init();
  }

  const event = buildEvent(eventType, properties);
  eventQueue.push(event);

  // Forzar flush si se alcanzó el tamaño máximo del batch
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}