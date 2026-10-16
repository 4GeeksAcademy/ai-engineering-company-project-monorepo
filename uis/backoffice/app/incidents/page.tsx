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

  useEffect(() => {
    async function loadIncidents() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/incidents`
        );

        if (!response.ok) {
          throw new Error(
            `Error de la API: ${response.status}`
          );
        }

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
            "No se pudo conectar con la API."
          );
        }
      } finally {
        setLoading(false);
      }
    }

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
        return "Queja cliente";
      case "FOOD_QUALITY":
        return "Calidad alimentos";
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
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-medium text-zinc-500">
                BRASALAND
              </p>

              <h1 className="text-3xl font-bold text-zinc-900">
                Incidentes
              </h1>

              <p className="mt-1 text-zinc-600">
                Consulta y filtra los incidentes registrados.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              Volver al dashboard
            </Link>

          </div>
        </header>

        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

            <div>
              <label
                htmlFor="category"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Categoría
              </label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {categories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
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
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Estado
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {statuses.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === "ALL"
                      ? "Todos"
                      : getStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
              Mostrando{" "}
              <span className="font-semibold text-zinc-900">
                {filteredIncidents.length}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-zinc-900">
                {incidents.length}
              </span>
            </div>

          </div>
        </section>

        {loading && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            Cargando incidentes...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">
              No se pudieron cargar los incidentes.
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">
                      ID
                    </th>

                    <th className="px-4 py-3">
                      Ubicación
                    </th>

                    <th className="px-4 py-3">
                      Categoría
                    </th>

                    <th className="px-4 py-3">
                      Descripción
                    </th>

                    <th className="px-4 py-3">
                      Reportante
                    </th>

                    <th className="px-4 py-3">
                      Estado
                    </th>

                    <th className="px-4 py-3">
                      Satisfacción
                    </th>

                    <th className="px-4 py-3">
                      Fecha
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">

                  {filteredIncidents.map(
                    (incident) => (
                      <tr
                        key={incident.id}
                        className="transition hover:bg-zinc-50"
                      >

                        <td className="px-4 py-4">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                          >
                            #{incident.id}
                          </Link>
                        </td>

                        <td className="px-4 py-4 text-zinc-600">
                          {incident.location_id}
                        </td>

                        <td className="px-4 py-4 text-zinc-600">
                          {getCategoryLabel(
                            incident.category
                          )}
                        </td>

                        <td className="max-w-md px-4 py-4 text-zinc-600">
                          {incident.description}
                        </td>

                        <td className="px-4 py-4 text-zinc-600">
                          {incident.reporter_id}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              incident.status
                            )}`}
                          >
                            {getStatusLabel(
                              incident.status
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-zinc-600">
                          {incident.satisfaction_score ??
                            "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-zinc-500">
                          {formatDate(
                            incident.created_at
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {filteredIncidents.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                No hay incidentes que coincidan con los filtros.
              </div>
            )}

          </section>
        )}

      </div>
    </main>
  );
}