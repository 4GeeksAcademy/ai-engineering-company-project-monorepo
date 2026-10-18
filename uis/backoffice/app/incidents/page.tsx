"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

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

const categories = [
  "ALL",
  "CUSTOMER_COMPLAINT",
  "EQUIPMENT",
  "SUPPLY",
  "FOOD_QUALITY",
  "STAFF",
];

const statuses = [
  "ALL",
  "OPEN",
  "CLOSED",
  "DISCARDED",
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadIncidents() {
    try {
      setLoading(true);
      setError("");

      const response = await api("/api/incidents");

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "La API no devolvió una lista de incidentes."
        );
      }

      setIncidents(data);
    } catch (err) {
      console.error("Error cargando incidentes:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "No se pudieron cargar los incidentes."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = incidents.filter(
    (incident) => {
      const matchesCategory =
        category === "ALL" ||
        incident.category === category;

      const matchesStatus =
        status === "ALL" ||
        incident.status === status;

      return matchesCategory && matchesStatus;
    }
  );

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

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Incidentes
            </h1>

            <p className="mt-2 text-zinc-600">
              Gestiona y consulta los incidentes registrados.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Volver al inicio
          </Link>
        </div>

        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Categoría
              </label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL"
                      ? "Todas"
                      : getCategoryLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Estado
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL"
                      ? "Todos"
                      : getStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-zinc-500">
              Mostrando{" "}
              <span className="font-semibold text-zinc-900">
                {filteredIncidents.length}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-zinc-900">
                {incidents.length}
              </span>{" "}
              incidentes
            </div>
          </div>
        </section>

        {loading && (
          <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />

            <p className="text-zinc-600">
              Cargando incidentes...
            </p>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="font-semibold text-red-800">
              No se pudieron cargar los incidentes
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadIncidents}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Reintentar
            </button>

            <div className="mt-3">
              <Link
                href="/"
                className="text-sm font-medium text-red-700 underline"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        )}

        {!loading && !error && (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center">
                <h2 className="font-semibold text-zinc-900">
                  No hay incidentes
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  No se encontraron incidentes con los filtros
                  seleccionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50">
                    <tr>
                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        ID
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Categoría
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Descripción
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Ubicación
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Estado
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Fecha
                      </th>

                      <th className="px-5 py-4 font-semibold text-zinc-700">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr
                        key={incident.id}
                        className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                      >
                        <td className="px-5 py-4 font-medium text-zinc-900">
                          #{incident.id}
                        </td>

                        <td className="px-5 py-4 text-zinc-700">
                          {getCategoryLabel(
                            incident.category
                          )}
                        </td>

                        <td className="max-w-md px-5 py-4 text-zinc-700">
                          <p className="line-clamp-2">
                            {incident.description}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-zinc-700">
                          {incident.location_id}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              incident.status
                            )}`}
                          >
                            {getStatusLabel(
                              incident.status
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                          {formatDate(
                            incident.created_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}