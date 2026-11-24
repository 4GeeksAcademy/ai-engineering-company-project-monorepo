"use client"; // Error boundaries must be Client Components

import "./globals.css";
import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { reportError } from "@/lib/errorTelemetry";

// Last resort for errors in the root layout itself: it replaces the layout, so it renders its own document.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError("global_error", error), [error]);
  return (
    <html lang="es">
      <body>
        <title>Error · Nexova Backoffice</title>
        <ErrorFallback message="No hemos podido cargar el backoffice. Inténtalo de nuevo en unos minutos." onRetry={() => retry()} />
      </body>
    </html>
  );
}
