"use client";

import { useEffect, useState } from "react";

import { IncidentRegistrationForm } from "./IncidentRegistrationForm";
import { IncidentsListPanel } from "./IncidentsListPanel";
import { IncidentsSummaryPanel } from "./IncidentsSummaryPanel";

type ToastKind = "success" | "error";

interface ToastState {
  kind: ToastKind;
  message: string;
}

export function IncidentsDashboard() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  const handleDataChanged = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const handleNotify = (kind: ToastKind, message: string) => {
    setToast({ kind, message });
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={
              toast.kind === "success"
                ? "rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow"
                : "rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow"
            }
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <IncidentRegistrationForm onCreated={handleDataChanged} onNotify={handleNotify} />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <IncidentsListPanel
          refreshToken={refreshToken}
          onChanged={handleDataChanged}
          onNotify={handleNotify}
        />
        <IncidentsSummaryPanel refreshToken={refreshToken} />
      </div>
    </div>
  );
}
