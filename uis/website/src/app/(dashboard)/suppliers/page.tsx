"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/axios";
import axios from "axios";

const SupplierForm = dynamic(() => import("@/components/SupplierForm"), {
  loading: () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#121721] border border-emerald-500/30 p-6 rounded-2xl shadow-2xl text-emerald-300 font-mono text-xs">
        Cargando formulario...
      </div>
    </div>
  ),
  ssr: false,
});

interface Supplier {
  id: number;
  name: string;
  country: string;
  categories: string[];
  hourly_rate: number;
  status: string;
  updated_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const supplierStats = useMemo(() => {
    if (!suppliers || suppliers.length === 0) {
      return { total: 0, activeCount: 0, avgRate: "0.00", uniqueCategories: 0 };
    }

    const activeSuppliers = suppliers.filter((s) => s.status === "active");
    const totalRate = activeSuppliers.reduce((sum, s) => sum + (s.hourly_rate || 0), 0);
    const uniqueCategoriesSet = new Set(suppliers.flatMap((s) => s.categories || []));

    return {
      total: suppliers.length,
      activeCount: activeSuppliers.length,
      avgRate: activeSuppliers.length > 0 ? (totalRate / activeSuppliers.length).toFixed(2) : "0.00",
      uniqueCategories: uniqueCategoriesSet.size,
    };
  }, [suppliers]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (countryFilter) query.append("country", countryFilter);
      if (categoryFilter) query.append("category", categoryFilter);

      const res = await api.get(`/suppliers?${query.toString()}`);
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Manejado silenciosamente
    } finally {
      setLoading(false);
    }
  }, [countryFilter, categoryFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.patch(`/suppliers/${id}/status`, { status: newStatus });
      fetchSuppliers();
    } catch {
      // Manejado silenciosamente
    }
  };

  const handleUpdateRate = async (id: number) => {
    const newRateStr = prompt("Ingrese nueva tarifa (debe ser > 0):");
    if (!newRateStr) return;
    const newRate = parseFloat(newRateStr);
    if (isNaN(newRate) || newRate <= 0) {
      alert("Tarifa inválida");
      return;
    }

    try {
      await api.patch(`/suppliers/${id}/rate`, { hourly_rate: newRate });
      fetchSuppliers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        alert(JSON.stringify(err.response?.data?.detail || err.message));
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Error de red");
      }
    }
  };

  return (
    <div className="text-slate-100">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Red Global B2B
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Directorio de Proveedores
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] text-xs font-bold py-2.5 px-5 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition"
        >
          + Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121721]/80 p-5 rounded-2xl border border-emerald-500/20">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Proveedores
          </p>
          <p className="text-2xl font-extrabold text-white mt-1">{supplierStats.total}</p>
        </div>
        <div className="bg-[#121721]/80 p-5 rounded-2xl border border-emerald-500/20">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Activos
          </p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{supplierStats.activeCount}</p>
        </div>
        <div className="bg-[#121721]/80 p-5 rounded-2xl border border-emerald-500/20">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Tarifa Media (Activos)
          </p>
          <p className="text-2xl font-extrabold text-amber-200 mt-1">${supplierStats.avgRate}/h</p>
        </div>
        <div className="bg-[#121721]/80 p-5 rounded-2xl border border-emerald-500/20">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Categorías Únicas
          </p>
          <p className="text-2xl font-extrabold text-teal-300 mt-1">{supplierStats.uniqueCategories}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-[#121721]/60 p-4 rounded-2xl border border-emerald-500/15">
        <input
          type="text"
          placeholder="Filtrar por país..."
          className="border border-emerald-500/25 bg-[#0a0d12] text-white placeholder-slate-500 px-3.5 py-2 rounded-xl text-xs w-full md:w-64 focus:border-emerald-400 focus:outline-none"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        />
        <select
          className="border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-xs w-full md:w-64 focus:border-emerald-400 focus:outline-none"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          <option value="IT">IT</option>
          <option value="Marketing">Marketing</option>
          <option value="HR">HR</option>
          <option value="Facilities">Facilities</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      ) : (
        <div className="bg-[#121721]/80 rounded-2xl border border-emerald-500/20 shadow-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-emerald-500/15 text-sm">
            <thead className="bg-[#0a0d12]/70">
              <tr>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nombre
                </th>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  País
                </th>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Categorías
                </th>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tarifa/hr
                </th>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Estado
                </th>
                <th className="py-3.5 px-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-emerald-500/5 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-white">{s.name}</td>
                  <td className="py-3.5 px-6 text-slate-300">{s.country}</td>
                  <td className="py-3.5 px-6 text-slate-300 text-xs">{s.categories.join(", ")}</td>
                  <td className="py-3.5 px-6 font-mono font-semibold text-amber-200">${s.hourly_rate}</td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        s.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                          : "bg-rose-500/15 text-rose-300 border-rose-400/40"
                      }`}
                    >
                      {s.status === "active" ? "Activo" : "Suspendido"}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 flex gap-3 text-xs">
                    <button
                      onClick={() => handleUpdateRate(s.id)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Tarifa
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(s.id, s.status)}
                      className="text-amber-300 hover:text-amber-200 font-semibold"
                    >
                      {s.status === "active" ? "Suspender" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                    No se encontraron proveedores que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SupplierForm
          onSuccess={() => {
            setShowForm(false);
            fetchSuppliers();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
