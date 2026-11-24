"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { reportError } from "@/lib/errorTelemetry";

// A rendering error anywhere below the root layout shows this instead of a blank page.
// The error's own text is never shown; Next.js already logs it in the browser console.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError("error_boundary", error), [error]);
  return <ErrorFallback message="No hemos podido mostrar esta página. Inténtalo de nuevo." onRetry={() => retry()} />;
}
