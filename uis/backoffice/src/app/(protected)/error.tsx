"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { reportError } from "@/lib/errorTelemetry";

// Same as app/error.tsx, but inside the protected layout, so the top bar and menu stay.
export default function ProtectedError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError("error_boundary", error), [error]);
  return <ErrorFallback message="No hemos podido mostrar esta página. Inténtalo de nuevo." onRetry={() => retry()} />;
}
