import { trackClientException } from "./events";

let installed = false;

/** window error and unhandledrejection. Messages and stacks are not recorded. */
export function installClientErrorTracking(): void {
  if (installed || typeof window === "undefined") {
    return;
  }
  installed = true;
  window.addEventListener("error", (event) => {
    trackClientException("window_error", event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    trackClientException("unhandled_rejection", reason instanceof Error ? reason : null);
  });
}
