// Correlation id (envelope `requestId`) of the API call that just finished.
//
// apiFetch makes one id per request and sends it as X-Request-Id. When the call settles it
// publishes the id here for the rest of the current task, so an event captured right after
// the call (`await createOutboundOrder(...)` then track(...)) carries that same id without the
// caller passing it. A macrotask later the id is gone: unrelated events get an id of their own.

let current: string | null = null;

export function currentRequestId(): string | null {
  return current;
}

export function publishRequestId(id: string): void {
  current = id;
  setTimeout(() => {
    if (current === id) current = null;
  }, 0);
}
