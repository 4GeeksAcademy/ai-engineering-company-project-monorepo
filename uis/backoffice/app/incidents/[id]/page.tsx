"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function IncidentDetailPage({
  params,
}: PageProps) {
  const router = useRouter();

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

        const resolvedParams = await params;
        const incidentId = resolvedParams.id;

        if (!incidentId) {
          throw new Error("No se indicó un incidente.");
        }

        const response = await api(
          `/api/incidents/${incidentId}`
        );

        const data = await response.json();

        if (!data || typeof data !== "object") {
          throw new Error(
            "La API devolvió datos inválidos."
          );
        }

        setIncident(data);
      } catch (err) {
        console.error("Error cargando incidente:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "No se pudo cargar el incidente."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadIncident();
  }, [params]);

  async function updateStatus(newStatus: string) {
    if (!incident || updating) {
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setMessage("");

      const response = await api(
        `/api/incidents/${incident.id}/status?status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error(
          "La API devolvió datos inválidos."
        );
      }

      setIncident((current) =>
        current
          ? {
              ...current,
              status: data.status,
            }
          : current
      );

      setMessage(
        "Estado actualizado correctamente."
      );
    } catch (err) {
      console.error(
        "Error actualizando estado:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "No se pudo actualizar el estado."
        );
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
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            Cargando incidente...
          </div>
        </div>
      </main>
    );
  }

  if (error && !incident) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-800">
              No se pudo cargar el incidente
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <Link
              href="/incidents"
              className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
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
        <div className="mb-6">
          <Link
            href="/incidents"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Volver a incidentes
          </Link>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Incidente #{incident.id}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-zinc-900">
                Detalle del incidente
              </h1>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                incident.status
              )}`}
            >
              {getStatusLabel(incident.status)}
            </span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-500">
                Categoría
              </p>

              <p className="mt-1 font-medium text-zinc-900">
                {getCategoryLabel(
                  incident.category
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Ubicación
              </p>

              <p className="mt-1 font-medium text-zinc-900">
                {incident.location_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Reportado por
              </p>

              <p className="mt-1 font-medium text-zinc-900">
                {incident.reporter_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Fecha
              </p>

              <p className="mt-1 font-medium text-zinc-900">
                {formatDate(incident.created_at)}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Satisfacción
              </p>

              <p className="mt-1 font-medium text-zinc-900">
                {incident.satisfaction_score ??
                  "-"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-zinc-500">
              Descripción
            </p>

            <p className="mt-2 rounded-lg bg-zinc-50 p-4 text-zinc-800">
              {incident.description}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Cambiar estado
            </h2>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  updating ||
                  incident.status === "OPEN"
                }
                onClick={() =>
                  updateStatus("OPEN")
                }
                className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Marcar abierto
              </button>

              <button
                type="button"
                disabled={
                  updating ||
                  incident.status === "CLOSED"
                }
                onClick={() =>
                  updateStatus("CLOSED")
                }
                className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Marcar cerrado
              </button>

              <button
                type="button"
                disabled={
                  updating ||
                  incident.status === "DISCARDED"
                }
                onClick={() =>
                  updateStatus("DISCARDED")
                }
                className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Descartar
              </button>
            </div>

            {updating && (
              <p className="mt-3 text-sm text-zinc-500">
                Actualizando estado...
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}