"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";

type Summary = {
  total_records: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  closed_incidents: number;
  average_satisfaction: number | null;
};

export default function Home() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api("/api/incidents/summary");
        const data = await response.json();

        if (!data || typeof data !== "object") {
          throw new Error("La API devolvió datos inválidos.");
        }

        setSummary(data);
      } catch (err) {
        console.error("Error cargando resumen:", err);

        if (err instanceof Error) {
          setError(
            err.message || "No se pudo cargar el resumen."
          );
        } else {
          setError("No se pudo cargar el resumen.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  function getCategoryLabel(value: string) {
    switch (value) {
      case "CUSTOMER_COMPLAINT":
        return "Queja de cliente";
      case "FOOD_QUALITY":
        return "Calidad de alimentos";
      case "EQUIPMENT":
        return "Equipamiento";
      case "SUPPLY":
        return "Suministros";
      case "STAFF":
        return "Personal";
      default:
        return value;
    }
  }

  function getStatusLabel(value: string) {
    switch (value) {
      case "OPEN":
        return "Abiertos";
      case "CLOSED":
        return "Cerrados";
      case "DISCARDED":
        return "Descartados";
      default:
        return value;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                BRASALAND
              </p>

              <h1 className="text-3xl font-bold text-zinc-900">
                Incident Management
              </h1>

              <p className="mt-1 text-zinc-600">
                Resumen de incidentes registrados.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/incidents"
                className="rounded-lg bg-black px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Ver incidentes
              </Link>

              <Link
                href="/account/profile"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Mi perfil
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        {loading && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            Cargando resumen...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-medium text-red-800">
              No se pudo cargar el resumen
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Total incidentes
                </p>

                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {summary.total_records}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Abiertos
                </p>

                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {summary.by_status?.OPEN ?? 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Cerrados
                </p>

                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {summary.closed_incidents}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Satisfacción media
                </p>

                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {summary.average_satisfaction ?? "-"}
                </p>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Incidentes por categoría
                </h2>

                <div className="mt-4 space-y-3">
                  {Object.entries(
                    summary.by_category ?? {}
                  ).map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-zinc-600">
                        {getCategoryLabel(category)}
                      </span>

                      <span className="font-semibold text-zinc-900">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Incidentes por estado
                </h2>

                <div className="mt-4 space-y-3">
                  {Object.entries(
                    summary.by_status ?? {}
                  ).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-zinc-600">
                        {getStatusLabel(status)}
                      </span>

                      <span className="font-semibold text-zinc-900">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}