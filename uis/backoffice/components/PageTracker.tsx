// components/PageTracker.tsx — Rastreador de navegación de páginas
//
// Propósito: Componente cliente que registra un evento page_navigated
// cada vez que se monta o cambia la ruta. Se usa como wrapper en páginas
// server components para añadir telemetría sin convertir la página completa.
//
// Uso:
//   import PageTracker from "@/components/PageTracker";
//   export default function MyPage() {
//     return (
//       <>
//         <PageTracker page="/my-page" />
//         <main>...</main>
//       </>
//     );
//   }

"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/telemetry";

interface PageTrackerProps {
  /** Ruta de la página (ej. "/incidents", "/suppliers") */
  page: string;
}

/**
 * Rastrea la navegación a una página.
 *
 * Emite el evento `page_navigated` con:
 * - page: ruta de destino
 * - source_page: ruta desde la que se navegó (document.referrer o anterior)
 * - navigation_time_ms: tiempo de navegación (desde que se inició hasta que se cargó)
 *
 * Solo se ejecuta en el cliente, una vez por montaje de componente.
 */
export default function PageTracker({ page }: PageTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Evitar doble tracking en StrictMode (React 18)
    if (trackedRef.current) return;
    trackedRef.current = true;

    // Obtener la página de origen
    const sourcePage = document.referrer
      ? (() => {
          try {
            const url = new URL(document.referrer);
            return url.pathname;
          } catch {
            return document.referrer;
          }
        })()
      : "";

    // Obtener tiempo de navegación desde Performance API
    let navigationTimeMs: number | undefined;
    try {
      const perfEntry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (perfEntry) {
        navigationTimeMs = Math.round(perfEntry.domContentLoadedEventEnd);
      }
    } catch {
      // Performance API no disponible
    }

    const properties: Record<string, unknown> = { page };
    if (sourcePage) {
      properties.source_page = sourcePage;
    }
    if (navigationTimeMs !== undefined) {
      properties.navigation_time_ms = navigationTimeMs;
    }

    track("page_navigated", properties);
  }, [page]);

  return null;
}