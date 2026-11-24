"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { currentRoute, reportError } from "@/lib/errorTelemetry";
import { track } from "@/lib/telemetry";

const METRICS = new Set(["LCP", "INP", "CLS", "TTFB"]);

function deviceClass(): "desktop" | "mobile" {
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}

// Module-level so the hook always gets the same function.
function reportWebVital(metric: { name: string; value: number; rating?: string }) {
  if (!METRICS.has(metric.name) || !metric.rating) return;
  track("page_load_measured", {
    route_template: currentRoute(),
    metric: metric.name,
    value: metric.name === "CLS" ? Math.round(metric.value * 10_000) / 10_000 : Math.round(metric.value),
    rating: metric.rating,
    device_class: deviceClass(),
  });
}

/** Global technical capture, mounted once in the root layout: Web Vitals and uncaught errors. Renders nothing. */
export function TelemetryRoot() {
  useReportWebVitals(reportWebVital);

  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError("window_error", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError("unhandled_rejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
