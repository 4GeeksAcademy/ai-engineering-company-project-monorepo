"use client";

import { useState } from "react";
import api from "@/lib/axios";
import axios from "axios";

interface SupplierFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SupplierForm({ onSuccess, onCancel }: SupplierFormProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [categories, setCategories] = useState("IT");
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [status, setStatus] = useState("active");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name,
      country,
      categories: [categories],
      hourly_rate: hourlyRate,
      status,
    };

    try {
      await api.post("/suppliers", payload);
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.message || "Network error");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Network error");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-[#121721] border border-emerald-500/30 rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-100">
        <h2 className="text-xl font-bold text-white mb-4">Nuevo Proveedor B2B</h2>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Nombre
            </label>
            <input
              required
              type="text"
              className="w-full border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              País
            </label>
            <input
              required
              type="text"
              className="w-full border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Categoría
            </label>
            <select
              className="w-full border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            >
              <option value="IT">IT</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Facilities">Facilities</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Tarifa (por hora)
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              className="w-full border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Estado
            </label>
            <select
              className="w-full border border-emerald-500/25 bg-[#0a0d12] text-white px-3.5 py-2 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-emerald-500/15">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-emerald-500/25 rounded-xl text-xs font-semibold text-slate-300 hover:bg-emerald-500/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-400 text-[#0a0d12] rounded-xl text-xs font-bold hover:bg-emerald-300"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
