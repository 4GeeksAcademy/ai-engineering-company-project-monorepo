"use client";

import { useState } from "react";

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
      const res = await fetch("http://localhost:8000/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(JSON.stringify(errorData.detail) || "Error al crear proveedor");
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Network error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-black">
        <h2 className="text-xl font-bold mb-4">Nuevo Proveedor</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input required type="text" className="w-full border border-gray-300 p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">País</label>
            <input required type="text" className="w-full border border-gray-300 p-2 rounded" value={country} onChange={e => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select className="w-full border border-gray-300 p-2 rounded" value={categories} onChange={e => setCategories(e.target.value)}>
              <option value="IT">IT</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Facilities">Facilities</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tarifa (por hora)</label>
            <input required type="number" step="0.01" min="0.01" className="w-full border border-gray-300 p-2 rounded" value={hourlyRate} onChange={e => setHourlyRate(parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select className="w-full border border-gray-300 p-2 rounded" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
