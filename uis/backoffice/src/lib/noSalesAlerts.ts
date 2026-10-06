/** Pure helpers for the operations no-sales alert stream. */

export type OpsAlert = {
  location_id: string;
  location_name: string;
  city: string;
  region: string;
  country: string;
  currency: "COP" | "USD" | string;
  status?: string;
  window_minutes: number;
  quiet_minutes: number;
  last_sale_at: string | null;
  detected_at: string;
  timezone: string;
  business_hours: string;
  message: string;
};

export type OpsAlertSnapshot = {
  window_minutes: number;
  open_hour: number;
  close_hour: number;
  alerts: OpsAlert[];
  generated_at?: string;
};

export type ParsedSse = {
  id: string | null;
  event: string;
  data: Record<string, unknown>;
};

export function reconnectDelayMs(attempt: number): number {
  const step = Math.max(0, attempt - 1);
  return Math.min(30_000, 1000 * 2 ** step);
}

export function defaultSaleAmount(currency: string): string {
  return currency === "USD" ? "36.00" : "48000";
}

export function reduceOpsAlerts(alerts: OpsAlert[], frame: ParsedSse): OpsAlert[] {
  if (frame.event === "ops_alert_snapshot") {
    const rows = frame.data.alerts;
    return Array.isArray(rows) ? (rows as OpsAlert[]) : [];
  }
  if (frame.event === "no_sales_alert") {
    const next = frame.data as unknown as OpsAlert;
    if (!next || typeof next.location_id !== "string") {
      return alerts;
    }
    return [next, ...alerts.filter((row) => row.location_id !== next.location_id)];
  }
  if (frame.event === "no_sales_cleared") {
    const locationId = frame.data.location_id;
    if (typeof locationId !== "string") {
      return alerts;
    }
    return alerts.filter((row) => row.location_id !== locationId);
  }
  return alerts;
}

export function toastForFrame(frame: ParsedSse): { tone: "alert" | "clear"; text: string } | null {
  if (frame.event === "no_sales_alert") {
    const name = stringField(frame.data.location_name) ?? "A location";
    const minutes = frame.data.quiet_minutes;
    const quiet = typeof minutes === "number" ? ` for ${minutes} minutes` : "";
    return { tone: "alert", text: `${name} has no sales${quiet} during opening hours.` };
  }
  if (frame.event === "no_sales_cleared") {
    const name = stringField(frame.data.location_name) ?? "A location";
    return { tone: "clear", text: `${name} recorded a sale. Alert cleared.` };
  }
  return null;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Pull complete SSE blocks out of a streaming text buffer. */
export function consumeSseBuffer(buffer: string): { events: ParsedSse[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: ParsedSse[] = [];
  for (const part of parts) {
    const parsed = parseSseBlock(part);
    if (parsed) {
      events.push(parsed);
    }
  }
  return { events, rest };
}

export function parseSseBlock(block: string): ParsedSse | null {
  let id: string | null = null;
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) {
      continue;
    }
    const splitAt = line.indexOf(":");
    const field = splitAt === -1 ? line : line.slice(0, splitAt);
    const value = splitAt === -1 ? "" : line.slice(splitAt + 1).replace(/^ /, "");
    if (field === "id") {
      id = value;
    } else if (field === "event") {
      event = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  try {
    const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return null;
    }
    return { id, event, data };
  } catch {
    return null;
  }
}
