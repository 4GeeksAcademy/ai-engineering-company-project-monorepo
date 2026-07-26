"use client";

import { useEffect, useState } from "react";
import { Supplier, VALID_CATEGORIES } from "../types";

const API_BASE_URL = "http://localhost:8000/suppliers";

export default function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Estado del formulario
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCountry) params.append("country", filterCountry);
      if (filterCategory) params.append("category", filterCategory);
      
      const res = await fetch(`${API_BASE_URL}/?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los proveedores");
      const data = await res.json();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Recargar al cambiar filtros
  useEffect(() => {
    fetchSuppliers();
  }, [filterCountry, filterCategory]);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      // Actualizar estado local
      setSuppliers(suppliers.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (err) {
      alert("No se pudo actualizar el estado.");
    }
  };

  const updateRate = async (id: number, currentRate: number) => {
    const promptValue = prompt("Ingresa la nueva tarifa (debe ser mayor a 0):", currentRate.toString());
    if (!promptValue) return;
    
    const newRate = parseFloat(promptValue);
    if (isNaN(newRate) || newRate <= 0) {
      alert("Tarifa inválida. Debe ser un número mayor a 0.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/${id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate_per_shipment: newRate })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Error al actualizar tarifa");
      }
      const updatedSupplier = await res.json();
      setSuppliers(suppliers.map(s => s.id === id ? updatedSupplier : s));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    
    const country = formData.get("country") as string;
    const currency = country === "USA" ? "USD" : "EUR";
    
    const payload = {
      name: formData.get("name"),
      country,
      categories: [formData.get("category")],
      rate_per_shipment: parseFloat(formData.get("rate") as string),
      currency,
      status: "active",
      service_zone: formData.get("service_zone") || null,
      contact_email: formData.get("contact_email") || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail?.[0]?.msg || JSON.stringify(errData.detail) || "Error de validación en la API");
      }
      
      // Añadir el nuevo a la lista y cerrar modal
      const newSupplier = await res.json();
      setSuppliers([...suppliers, newSupplier]);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <select 
            className="rounded-lg border-slate-300 bg-slate-50 text-sm font-medium focus:border-indigo-500 focus:ring-indigo-500"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
          >
            <option value="">Todos los países</option>
            <option value="USA">USA</option>
            <option value="Spain">España</option>
          </select>

          <select 
            className="rounded-lg border-slate-300 bg-slate-50 text-sm font-medium focus:border-indigo-500 focus:ring-indigo-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {VALID_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
        >
          {showForm ? "Cancelar" : "+ Nuevo Proveedor"}
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-inner">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Registrar Nuevo Proveedor</h2>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre *</label>
              <input required name="name" type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">País *</label>
              <select required name="country" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="USA">USA</option>
                <option value="Spain">España</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Categoría Principal *</label>
              <select required name="category" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500">
                {VALID_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tarifa *</label>
              <input required name="rate" type="number" step="0.01" min="0.01" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Zona de servicio (opcional)</label>
              <input name="service_zone" type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email (opcional)</label>
              <input name="contact_email" type="email" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2 pt-2">
              <button type="submit" className="w-full md:w-auto rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition">
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de Resultados */}
      {loading ? (
        <div className="py-10 text-center text-slate-500">Cargando proveedores...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">Error: {error}</div>
      ) : suppliers.length === 0 ? (
        <div className="py-10 text-center text-slate-500">No hay proveedores que coincidan con el filtro.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">País</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Categorías</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Tarifa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className={supplier.status === 'suspended' ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-semibold text-slate-900">{supplier.name}</div>
                      {supplier.service_zone && <div className="text-xs text-slate-500">{supplier.service_zone}</div>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        supplier.country === 'USA' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' : 'bg-red-50 text-red-700 ring-red-600/10'
                      }`}>
                        {supplier.country}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.map(cat => (
                          <span key={cat} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{cat.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                      {supplier.rate_per_shipment.toFixed(2)} {supplier.currency}
                      <button onClick={() => updateRate(supplier.id, supplier.rate_per_shipment)} className="ml-2 text-indigo-600 hover:text-indigo-900" title="Actualizar tarifa">
                        ✎
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {supplier.status === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button 
                        onClick={() => toggleStatus(supplier.id, supplier.status)}
                        className={`text-xs px-3 py-1 rounded-md border ${
                          supplier.status === 'active' 
                            ? 'border-orange-200 text-orange-700 hover:bg-orange-50' 
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {supplier.status === 'active' ? 'Suspender' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
