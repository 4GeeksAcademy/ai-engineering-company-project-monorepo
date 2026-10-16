"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

        const response = await fetch(
          `${API_URL}/api/incidents/${incidentId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("El incidente no existe.");
          }

          throw new Error(
            "No se pudo cargar el incidente."
          );
        }

        const data = await response.json();

        setIncident(data);
      } catch (err) {
        console.error(err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "No se pudo conectar con la API."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadIncident();
  }, [params]);

  async function updateStatus(newStatus: string) {
    if (!incident) {
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
        let detail =
          "No se pudo actualizar el estado.";

        try {
          const data = await response.json();

          if (data?.detail) {
            detail = data.detail;
          }
        } catch {
          // La API puede devolver una respuesta que no sea JSON.
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

      setMessage(
        "Estado actualizado correctamente."
      );
    } catch (err) {
      console.error(err);

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

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-4xl">

        <header className="mb-8">
          <Link
            href="/incidents"
            className="mb-4 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            ← Volver a incidentes
          </Link>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-500">
              BRASALAND
            </p>

            <h1 className="text-3xl font-bold text-zinc-900">
              Detalle del incidente
            </h1>

            <p className="mt-1 text-zinc-600">
              Consulta y gestión del incidente.
            </p>
          </div>
        </header>

        {loading && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            Cargando incidente...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-medium">
              {error}
            </p>

            <button
              type="button"
              onClick={() => router.push("/incidents")}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
            >
              Volver a incidentes
            </button>
          </div>
        )}

        {!loading && !error && incident && (
          <div className="space-y-6">

            <section className="rounded-xl border bg-white p-6 shadow-sm">

              <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-sm text-zinc-500">
                    Incidente
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-zinc-900">
                    #{incident.id}
                  </h2>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                    incident.status
                  )}`}
                >
                  {getStatusLabel(
                    incident.status
                  )}
                </span>

              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">

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
                    Reportante
                  </p>

                  <p className="mt-1 font-medium text-zinc-900">
                    {incident.reporter_id}
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

                <div className="sm:col-span-2">
                  <p className="text-sm text-zinc-500">
                    Fecha de creación
                  </p>

                  <p className="mt-1 font-medium text-zinc-900">
                    {formatDate(
                      incident.created_at
                    )}
                  </p>
                </div>

              </div>

              <div className="mt-6">

                <p className="text-sm text-zinc-500">
                  Descripción
                </p>

                <div className="mt-2 rounded-lg bg-zinc-50 p-4 text-zinc-800">
                  {incident.description}
                </div>

              </div>

            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">

              <h2 className="text-lg font-semibold text-zinc-900">
                Gestionar estado
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Cambia el estado del incidente.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={
                    updating ||
                    incident.status === "OPEN"
                  }
                  onClick={() =>
                    updateStatus("OPEN")
                  }
                  className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Marcar como abierto
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
                  className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Marcar como cerrado
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
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Descartar incidente
                </button>

              </div>

              {updating && (
                <p className="mt-4 text-sm text-zinc-500">
                  Actualizando estado...
                </p>
              )}

              {message && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

            </section>

          </div>
        )}

      </div>
    </main>
  );
}