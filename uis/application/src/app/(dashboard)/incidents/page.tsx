'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function IncidentsPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  
  const [incidents, setIncidents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    branch: '',
    origin: ''
  });

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.branch) queryParams.append('branch', filters.branch);
      if (filters.origin) queryParams.append('origin', filters.origin);

      const [incRes, sumRes] = await Promise.all([
        fetch(`http://localhost:8000/api/incidents?${queryParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/incidents/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!incRes.ok || !sumRes.ok) {
        throw new Error('Error al cargar datos del servidor');
      }

      const incData = await incRes.json();
      const sumData = await sumRes.json();

      setIncidents(incData);
      setSummary(sumData);
    } catch (err: any) {
      setErrorMsg('Ocurrió un error de conexión al cargar la lista. Puedes reintentar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [filters, isAuthenticated]);

  const handleStatusChange = async (id: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return;
    
    // Optimistic update
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
    
    try {
      const res = await fetch(`http://localhost:8000/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        throw new Error('Failed');
      }
    } catch (err) {
      // Revert on failure
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: currentStatus } : inc));
      alert('Hubo un error del servidor. No se pudo cambiar el estado de la incidencia.');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white text-black min-h-screen py-10">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Incidencias</h1>
        <button 
          onClick={() => router.push('/incidents/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
        >
          Registrar Nueva
        </button>
      </div>

      {/* Panel de Resumen (Métricas) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Resumen Global</h2>
        {summary ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm font-semibold text-blue-800">Por Estado</p>
              {Object.entries(summary.status || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm mt-1">
                  <span>{k}:</span> <span className="font-bold">{v as number}</span>
                </div>
              ))}
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm font-semibold text-green-800">Por Categoría</p>
              {Object.entries(summary.category || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm mt-1">
                  <span>{k}:</span> <span className="font-bold">{v as number}</span>
                </div>
              ))}
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <p className="text-sm font-semibold text-orange-800">Por Origen</p>
              {Object.entries(summary.origin || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm mt-1">
                  <span>{k}:</span> <span className="font-bold">{v as number}</span>
                </div>
              ))}
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-sm font-semibold text-purple-800">Por Sede</p>
              {Object.entries(summary.branch || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm mt-1">
                  <span>{k}:</span> <span className="font-bold">{v as number}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Cargando métricas...</p>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
        <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md">
          <option value="">Cualquier Estado</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="discarded">Discarded</option>
        </select>
        <select name="category" value={filters.category} onChange={handleFilterChange} className="p-2 border rounded-md">
          <option value="">Cualquier Categoría</option>
          <option value="fallo_operativo">Fallo Operativo</option>
          <option value="queja">Queja</option>
          <option value="solicitud">Solicitud</option>
        </select>
        <select name="origin" value={filters.origin} onChange={handleFilterChange} className="p-2 border rounded-md">
          <option value="">Cualquier Origen</option>
          <option value="customer">Cliente</option>
          <option value="branch">Sede Local</option>
          <option value="internal">Interno</option>
        </select>
        <select name="branch" value={filters.branch} onChange={handleFilterChange} className="p-2 border rounded-md">
          <option value="">Cualquier Sede</option>
          <option value="central">Central</option>
          <option value="valencia">Valencia</option>
          <option value="miami">Miami</option>
        </select>
      </div>

      {errorMsg ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={fetchData} className="underline font-semibold">Reintentar</button>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando incidencias...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-xl text-gray-600">No se encontraron incidencias</p>
          <p className="text-gray-500 mt-2">Intenta ajustar los filtros o registra una nueva incidencia.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría / Sede</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{inc.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{inc.category}</div>
                    <div className="text-xs text-gray-500">{inc.branch}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {inc.origin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, inc.status, e.target.value)}
                      className={`text-sm rounded-full px-3 py-1 border ${
                        inc.status === 'open' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        inc.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        inc.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="discarded">Discarded</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
