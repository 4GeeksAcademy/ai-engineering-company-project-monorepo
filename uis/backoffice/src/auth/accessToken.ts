/** Read JWT `exp` only. The token value is never sent to telemetry. */
export function accessTokenLooksExpired(token: string, nowMs = Date.now()): boolean {
  const payload = token.split(".")[1];
  if (!payload) {
    return false;
  }
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === "number" && json.exp * 1000 <= nowMs;
  } catch {
    return false;
  }
}
