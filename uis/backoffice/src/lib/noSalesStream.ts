import { getStoredToken, clearSessionAndRedirectToLogin } from "./api";
import { consumeSseBuffer, reconnectDelayMs, type ParsedSse } from "./noSalesAlerts";

export type StreamStatus = "connecting" | "live" | "reconnecting";

type Handlers = {
  onEvent: (frame: ParsedSse) => void;
  onStatus: (status: StreamStatus) => void;
};

const STREAM_PATH = "/realtime/ops-alerts/stream";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Staff JWT via fetch. EventSource cannot set Authorization. */
export async function connectOpsAlertStream(handlers: Handlers, signal: AbortSignal): Promise<void> {
  let attempt = 0;
  let lastEventId: string | null = null;

  while (!signal.aborted) {
    handlers.onStatus(attempt === 0 ? "connecting" : "reconnecting");
    const token = getStoredToken();
    if (!token) {
      clearSessionAndRedirectToLogin();
      return;
    }
    const headers = new Headers({
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    });
    if (lastEventId) {
      headers.set("Last-Event-ID", lastEventId);
    }

    try {
      const response = await fetch(STREAM_PATH, { headers, signal });
      if (response.status === 401) {
        clearSessionAndRedirectToLogin();
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error("stream unavailable");
      }
      handlers.onStatus("live");
      attempt = 0;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const consumed = consumeSseBuffer(buffer);
        buffer = consumed.rest;
        for (const frame of consumed.events) {
          if (frame.id) {
            lastEventId = frame.id;
          }
          handlers.onEvent(frame);
        }
      }
    } catch {
      if (signal.aborted) {
        return;
      }
    }

    if (signal.aborted) {
      return;
    }
    attempt += 1;
    handlers.onStatus("reconnecting");
    await sleep(reconnectDelayMs(attempt), signal);
  }
}
