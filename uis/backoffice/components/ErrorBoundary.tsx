// components/ErrorBoundary.tsx — Boundary de errores con telemetría
//
// Propósito: Captura errores no manejados en el árbol de componentes
// React y registra un evento `frontend_error_captured` antes de
// mostrar la UI de fallback.
//
// Uso:
//   import ErrorBoundary from "@/components/ErrorBoundary";
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { track } from "@/lib/telemetry";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Ruta opcional para identificar la página actual */
  page?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary que captura errores de renderizado en React.
 *
 * Cuando se captura un error:
 * 1. Registra el evento `frontend_error_captured` con tipo, mensaje y stack
 * 2. Muestra una UI de fallback con botón de recarga
 *
 * No captura:
 * - Errores en event handlers (try/catch manual)
 * - Errores asíncronos (Promise rejections no manejadas)
 * - Errores en SSR
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Determinar el tipo de error
    let errorType = "unknown";
    if (error instanceof TypeError) errorType = "TypeError";
    else if (error instanceof ReferenceError) errorType = "ReferenceError";
    else if (error instanceof RangeError) errorType = "RangeError";

    // Obtener la página actual
    const page =
      this.props.page ||
      (typeof window !== "undefined" ? window.location.pathname : "/");

    // Extraer component stack
    const componentStack = errorInfo.componentStack || "";

    track("frontend_error_captured", {
      error_type: errorType,
      error_message: error.message || "Unknown error",
      page,
      component_stack: componentStack,
      line: error.stack
        ? parseInt(error.stack.match(/:(\d+):/)?.[1] || "0", 10)
        : 0,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-xl font-bold text-red-800">
              Algo salió mal
            </h2>
            <p className="mb-6 text-sm text-red-600">
              Se ha producido un error inesperado.
              Nuestro equipo ha sido notificado automáticamente.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 transition"
            >
              Recargar página
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-red-500">
                  Detalles del error (solo desarrollo)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}