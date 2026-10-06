import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installClientErrorTracking } from "./telemetry/clientErrors";
import "./styles/backoffice.css";

installClientErrorTracking();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Backoffice root element #root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
