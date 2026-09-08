"use client";

import { useState, useEffect } from "react";
import SupplierForm from "@/components/SupplierForm";
import api from "@/lib/axios";

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

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (countryFilter) query.append("country", countryFilter);
      if (categoryFilter) query.append("category", categoryFilter);
      
      const res = await api.get(`/suppliers?${query.toString()}`);
      setSuppliers(res.data);
    } catch (err) {
      // Manejado silenciosamente, setError mostrará el mensaje en la UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [countryFilter, categoryFilter]);

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.patch(`/suppliers/${id}/status`, { status: newStatus });
      fetchSuppliers();
    } catch (err) {
      // Manejado silenciosamente, la UI reaccionará si es necesario
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
    } catch (err: any) {
      alert(JSON.stringify(err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="container mx-auto p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Directorio de Proveedores</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          + Nuevo Proveedor
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Filtrar por país..." 
          className="border border-gray-300 p-2 rounded shadow-sm w-full md:w-64"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        />
        <select 
          className="border border-gray-300 p-2 rounded shadow-sm w-full md:w-64"
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
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">Nombre</th>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">País</th>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">Categorías</th>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">Tarifa/hr</th>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">Estado</th>
                <th className="py-3 px-6 text-left font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6">{s.name}</td>
                  <td className="py-3 px-6">{s.country}</td>
                  <td className="py-3 px-6">{s.categories.join(", ")}</td>
                  <td className="py-3 px-6 font-medium text-gray-900">${s.hourly_rate}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="py-3 px-6 flex gap-3">
                    <button onClick={() => handleUpdateRate(s.id)} className="text-blue-600 hover:text-blue-800 font-medium">Tarifa</button>
                    <button onClick={() => handleUpdateStatus(s.id, s.status)} className="text-orange-600 hover:text-orange-800 font-medium">
                      {s.status === 'active' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No se encontraron proveedores que coincidan con los filtros.</td>
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
