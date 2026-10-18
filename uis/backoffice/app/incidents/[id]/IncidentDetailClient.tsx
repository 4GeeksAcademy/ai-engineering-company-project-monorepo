"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

type Incident = {
  id: number;
  location_id: string;
  category: string;
  description: string;
  reporter_id: string;
  status: string;
  satisfaction_score: number | null;
  created_at: string | null;
};

type Props = {
  incidentId: string;
};

export default function IncidentDetailClient({
  incidentId,
}: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadIncident() {
      try {
        setLoading(true);
        setError("");

        const response = await api(
          /api/incidents/
        );

        const data = await response.json();

        if (!data || typeof data !== "object") {
          throw new Error("La API devolvió datos inválidos.");
        }

        setIncident(data);
      } catch (err) {
        console.error("Error cargando incidente:", err);

        if (err instanceof Error) {
          setError(
            err.message || "No se pudo cargar el incidente."
          );
        } else {
          setError("No se pudo cargar el incidente.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadIncident();
  }, [incidentId]);

  async function updateStatus(newStatus: string) {
    if (!incident || updating) {
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setMessage("");

      const response = await api(
        /api/incidents//status?status=,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      setIncident((current) =>
        current
          ? {
              ...current,
              status: data.status,
            }
          : current
      );

      setMessage("Estado actualizado correctamente.");
    } catch (err) {
      console.error("Error actualizando incidente:", err);

      if (err instanceof Error) {
        setError(
          err.message || "No se pudo actualizar el estado."
        );
      } else {
        setError("No se pudo actualizar el estado.");
      }
    } finally {
      setUpdating(false);
    }
  }

  function getStatusLabel(value: string) {
    switch (value) {
      case "OPEN":
        return "Abierto";
      case "CLOSED":
        return "Cerrado";
      case "DISCARDED":
        return "Descartado";
      default:
        return value;
    }
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

  function getStatusClasses(value: string) {
    switch (value) {
      case "OPEN":
        return "bg-yellow-50 text-yellow-700";
      case "CLOSED":
        return "bg-green-50 text-green-700";
      case "DISCARDED":
        return "bg-zinc-100 text-zinc-600";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("es-ES");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <div className="mx-auto max-w-4xl rounded-xl border bg-white p-8 shadow-sm">
          <p className="text-zinc-600">
            Cargando incidente...
          </p>
        </div>
      </main>
    );
  }

  if (error && !incident) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-lg font-semibold text-red-800">
            No se pudo cargar el incidente
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Reintentar
            </button>

            <Link
              href="/incidents"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800"
            >
              Volver a incidentes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!incident) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/incidents"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Volver a incidentes
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Inicio
          </Link>
        </div>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Incidente #{incident.id}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-zinc-900">
                {getCategoryLabel(incident.category)}
              </h1>
            </div>

            <span
              className={ounded-full px-3 py-1 text-sm font-medium }
            >
              {getStatusLabel(incident.status)}
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-zinc-400">
                Ubicación
              </p>
              <p className="mt-1 text-zinc-800">
                {incident.location_id}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-zinc-400">
                Reportado por
              </p>
              <p className="mt-1 text-zinc-800">
                {incident.reporter_id}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-zinc-400">
                Fecha
              </p>
              <p className="mt-1 text-zinc-800">
                {formatDate(incident.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-zinc-400">
                Satisfacción
              </p>
              <p className="mt-1 text-zinc-800">
                {incident.satisfaction_score ?? "-"}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <p className="text-xs font-medium uppercase text-zinc-400">
              Descripción
            </p>

            <p className="mt-2 whitespace-pre-wrap text-zinc-700">
              {incident.description}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                No se pudo actualizar el incidente.
              </p>
              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <p className="mb-3 text-sm font-medium text-zinc-700">
              Cambiar estado
            </p>

            <div className="flex flex-wrap gap-3">
              {["OPEN", "CLOSED", "DISCARDED"].map(
                (newStatus) => (
                  <button
                    key={newStatus}
                    onClick={() => updateStatus(newStatus)}
                    disabled={
                      updating ||
                      incident.status === newStatus
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating &&
                    incident.status !== newStatus
                      ? "Actualizando..."
                      : getStatusLabel(newStatus)}
                  </button>
                )
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
