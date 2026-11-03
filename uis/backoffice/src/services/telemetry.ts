// uis/backoffice/src/services/telemetry.ts

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  sessionId: string;
  userId?: string | null;
  event_type: string;
  schemaVersion: string;
  requestId: string;
  properties: Record<string, unknown>;
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private readonly BATCH_SIZE_LIMIT = 20;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 segundos
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  
  // Endpoint configurado en .env.local
  private endpoint = process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || 'http://localhost:8000/telemetry/events';

  constructor() {
    // (Paso 2.5) Flush confiable: Si el usuario esconde o cierra la pestaña, mandamos lo que quede.
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushBeacon();
        }
      });
    }
  }

  // Única función pública que usarán los componentes (Paso 2.8)
  public track(eventType: string, properties: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Prevenir ejecución en SSR

    // (Paso 2.3) Autoinyección de metadatos
    const event: TelemetryEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(), 
      event_type: eventType,
      schemaVersion: '1.0',
      requestId: crypto.randomUUID(),
      properties
    };

    // (Paso 2.4) Añadir a la cola y calcular envío
    this.queue.push(event);
    this.scheduleFlush();
  }

  // --- Metadatos Simulados ---
  private getSessionId(): string {
    let session = sessionStorage.getItem('telemetry_session_id');
    if (!session) {
      session = crypto.randomUUID();
      sessionStorage.setItem('telemetry_session_id', session);
    }
    return session;
  }

  private getUserId(): string | null {
    // Idealmente leemos el ID de sesión del usuario logueado
    return localStorage.getItem('user_id') || null;
  }

  // --- (Paso 2.4) Mecanismo de Batching y Debounce ---
  private scheduleFlush(): void {
    if (this.queue.length >= this.BATCH_SIZE_LIMIT) {
      this.flushQueue(); // Si llegamos a 20, enviamos ya
      return;
    }
    if (!this.timerId) {
      this.timerId = setTimeout(() => {
        this.flushQueue(); // Si pasan 10s, enviamos
      }, this.FLUSH_INTERVAL_MS);
    }
  }

  // --- (Paso 2.5) Envío Confiable al cerrar la pestaña ---
  private flushBeacon(): void {
    if (this.queue.length === 0) return;
    const data = JSON.stringify({ events: this.queue });
    // sendBeacon ignora cors y se asegura de llegar aunque la página muera
    navigator.sendBeacon(this.endpoint, data);
    this.queue = [];
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = null;
  }

  // --- (Paso 2.6) Envío Normal con Backoff Exponencial ---
  private async flushQueue(retries = 3, delay = 1000): Promise<void> {
    if (this.queue.length === 0 || this.isFlushing) return;
    
    this.isFlushing = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    // Copiamos la cola actual y la vaciamos para aceptar nuevos eventos
    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      this.isFlushing = false;
      
    } catch (error) {
      console.warn(`[Telemetry] Error enviando lote. Reintentos restantes: ${retries - 1}`);
      
      if (retries > 1) {
        // Backoff exponencial: esperar delay, luego reintentar con delay * 2
        setTimeout(() => {
          // Regresamos los eventos fallidos al principio de la cola nueva
          this.queue = [...batch, ...this.queue];
          this.isFlushing = false;
          this.flushQueue(retries - 1, delay * 2);
        }, delay);
      } else {
        // Fail Safe: Descartar lote si fallan los 3 intentos
        console.error('[Telemetry] Lote descartado tras múltiples fallos de red.');
        this.isFlushing = false;
      }
    }
  }
}

// (Paso 2.8) Exportar como Singleton para que toda la app use la misma cola
export const telemetry = new TelemetryService();
