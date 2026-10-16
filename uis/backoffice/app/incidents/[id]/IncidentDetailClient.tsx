"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://127.0.0.1:8000";

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

        const response = await fetch(
          `${API_URL}/api/incidents/${incidentId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("El incidente no existe.");
          }

          throw new Error("No se pudo cargar el incidente.");
        }

        const data = await response.json();
        setIncident(data);
      } catch (err) {
        console.error(err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo conectar con la API.");
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

      const response = await fetch(
        `${API_URL}/api/incidents/${incident.id}/status?status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        let detail = "No se pudo actualizar el estado.";

        try {
          const data = await response.json();

          if (data?.detail) {
            detail = data.detail;
          }
        } catch {
          // La respuesta puede no ser JSON.
        }

        throw new Error(detail);
      }

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
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
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
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <p className="text-zinc-600">
              Cargando incidente...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !incident) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/incidents"
            className="mb-6 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            ← Volver a incidentes
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!incident) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            No se encontró el incidente.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <Link
            href="/incidents"
            className="mb-6 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            ← Volver a incidentes
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                BRASALAND
              </p>

              <h1 className="mt-1 text-3xl font-bold text-zinc-900">
                Incidente #{incident.id}
              </h1>

              <p className="mt-1 text-zinc-600">
                Detalle del incidente registrado.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-medium ${getStatusClasses(
                incident.status
              )}`}
            >
              {getStatusLabel(incident.status)}
            </span>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-900">
              Información del incidente
            </h2>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-500">ID</p>
              <p className="mt-1 font-semibold text-zinc-900">
                #{incident.id}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Ubicación
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {incident.location_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Categoría
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {getCategoryLabel(incident.category)}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Reportante
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {incident.reporter_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Satisfacción
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {incident.satisfaction_score ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Fecha de creación
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {formatDate(incident.created_at)}
              </p>
            </div>
          </div>

          <div className="border-t px-6 py-5">
            <p className="text-sm text-zinc-500">
              Descripción
            </p>

            <p className="mt-2 leading-7 text-zinc-700">
              {incident.description}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Cambiar estado
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Actualiza el estado del incidente.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateStatus("OPEN")}
              disabled={updating || incident.status === "OPEN"}
              className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar como abierto
            </button>

            <button
              type="button"
              onClick={() => updateStatus("CLOSED")}
              disabled={updating || incident.status === "CLOSED"}
              className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar como cerrado
            </button>

            <button
              type="button"
              onClick={() => updateStatus("DISCARDED")}
              disabled={
                updating || incident.status === "DISCARDED"
              }
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Descartar incidente
            </button>
          </div>
        </section>

        <div className="mt-6">
          <Link
            href="/incidents"
            className="inline-flex rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    </main>
  );
}