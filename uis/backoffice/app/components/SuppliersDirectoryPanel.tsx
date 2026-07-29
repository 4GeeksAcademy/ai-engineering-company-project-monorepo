"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SupplierCountry = "Estados Unidos" | "España";
type SupplierCategory =
  | "Gestión de almacenes"
  | "Entregas de última milla"
  | "Logística inversa";
type SupplierStatus = "Activo" | "Suspendido";

type SupplierResponse = {
  id: string;
  nombre: string;
  pais: SupplierCountry;
  categorias: SupplierCategory[];
  tarifa: number;
  estado: SupplierStatus;
  updated_at: string;
};

type SupplierCreate = {
  nombre: string;
  pais: SupplierCountry;
  categorias: SupplierCategory[];
  tarifa: string;
  estado: SupplierStatus;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const countryOptions: SupplierCountry[] = ["Estados Unidos", "España"];
const categoryOptions: SupplierCategory[] = [
  "Gestión de almacenes",
  "Entregas de última milla",
  "Logística inversa",
];

const initialForm: SupplierCreate = {
  nombre: "",
  pais: "Estados Unidos",
  categorias: ["Entregas de última milla"],
  tarifa: "",
  estado: "Activo",
};

function buildSuppliersUrl(filters: { pais?: string; categoria?: string }) {
  const params = new URLSearchParams();

  if (filters.pais) {
    params.set("pais", filters.pais);
  }

  if (filters.categoria) {
    params.set("categoria", filters.categoria);
  }

  const query = params.toString();
  return query ? `${API_BASE_URL}/suppliers?${query}` : `${API_BASE_URL}/suppliers`;
}

export function SuppliersDirectoryPanel() {
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [createForm, setCreateForm] = useState<SupplierCreate>(initialForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [updatingRateId, setUpdatingRateId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const activeFilters = useMemo(
    () => ({
      pais: selectedCountry || undefined,
      categoria: selectedCategory || undefined,
    }),
    [selectedCategory, selectedCountry],
  );

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildSuppliersUrl(activeFilters), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el directorio de proveedores.");
        }

        const data = (await response.json()) as SupplierResponse[];
        setSuppliers(data);
      } catch {
        setError("No pudimos cargar proveedores. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    void fetchSuppliers();
  }, [activeFilters]);

  const handleCreateSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setSubmittingCreate(true);

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createForm,
          tarifa: Number(createForm.tarifa),
        }),
      });

      if (response.status === 422) {
        setCreateError("No pudimos crear el proveedor. Revisa los campos del formulario.");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setCreateError(payload?.error ?? "Ocurrio un error al crear el proveedor.");
        return;
      }

      const createdSupplier = (await response.json()) as SupplierResponse;
      setSuppliers((prev) => [createdSupplier, ...prev]);
      setCreateForm(initialForm);
      setCreateSuccess("Proveedor creado correctamente.");
    } catch {
      setCreateError("No fue posible conectarse con la API.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUpdateRate = async (supplier: SupplierResponse) => {
    const draftValue = rateDrafts[supplier.id] ?? supplier.tarifa.toString();
    const parsedRate = Number(draftValue);

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setError("La tarifa debe ser un numero mayor a 0.");
      return;
    }

    setUpdatingRateId(supplier.id);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tarifa: parsedRate }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la tarifa.");
      }

      const updatedSupplier = (await response.json()) as SupplierResponse;
      setSuppliers((prev) => prev.map((item) => (item.id === supplier.id ? updatedSupplier : item)));
      setRateDrafts((prev) => ({ ...prev, [supplier.id]: updatedSupplier.tarifa.toString() }));
    } catch {
      setError("No se pudo actualizar la tarifa. Intenta nuevamente.");
    } finally {
      setUpdatingRateId(null);
    }
  };

  const handleToggleStatus = async (supplier: SupplierResponse) => {
    const nextStatus: SupplierStatus = supplier.estado === "Activo" ? "Suspendido" : "Activo";

    setUpdatingStatusId(supplier.id);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado.");
      }

      const updatedSupplier = (await response.json()) as SupplierResponse;
      setSuppliers((prev) => prev.map((item) => (item.id === supplier.id ? updatedSupplier : item)));
    } catch {
      setError("No se pudo actualizar el estado. Intenta nuevamente.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Directorio de proveedores</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestiona carriers por pais, categoria, tarifa y estado operativo.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Crear proveedor</h2>
        <form onSubmit={handleCreateSupplier} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Nombre
            <input
              required
              type="text"
              value={createForm.nombre}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  nombre: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Pais
            <select
              value={createForm.pais}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  pais: event.target.value as SupplierCountry,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Categoria
            <select
              value={createForm.categorias[0]}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  categorias: [event.target.value as SupplierCategory],
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Tarifa
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={createForm.tarifa}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  tarifa: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Estado
            <select
              value={createForm.estado}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  estado: event.target.value as SupplierStatus,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="Activo">Activo</option>
              <option value="Suspendido">Suspendido</option>
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submittingCreate}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingCreate ? "Creando..." : "Crear proveedor"}
            </button>
          </div>
        </form>

        {createError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {createError}
          </p>
        ) : null}

        {createSuccess ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {createSuccess}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Listado de proveedores</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Filtrar por pais
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Todos</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Filtrar por categoria
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Todas</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">Tabla del directorio de proveedores logisticos</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Nombre
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Pais
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Categorias
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Tarifa
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Cargando proveedores...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No hay proveedores para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => {
                  const isActive = supplier.estado === "Activo";

                  return (
                    <tr key={supplier.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3 font-medium text-slate-900">{supplier.nombre}</td>
                      <td className="px-3 py-3 text-slate-700">{supplier.pais}</td>
                      <td className="px-3 py-3 text-slate-700">{supplier.categorias.join(", ")}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={rateDrafts[supplier.id] ?? supplier.tarifa.toString()}
                            onChange={(event) =>
                              setRateDrafts((prev) => ({
                                ...prev,
                                [supplier.id]: event.target.value,
                              }))
                            }
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                          />
                          <button
                            type="button"
                            disabled={updatingRateId === supplier.id}
                            onClick={() => void handleUpdateRate(supplier)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingRateId === supplier.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            isActive
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                              : "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                          }
                        >
                          {supplier.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={updatingStatusId === supplier.id}
                          onClick={() => void handleToggleStatus(supplier)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingStatusId === supplier.id
                            ? "Actualizando..."
                            : isActive
                              ? "Suspender"
                              : "Activar"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}