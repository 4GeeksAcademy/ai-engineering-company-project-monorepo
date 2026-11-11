'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import axios from 'axios';

export default function IncidentsPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();

  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [filters, setFilters] = useState({
    status: '',
    category: '',
    branch: '',
    origin: '',
  });

  const fetchData = useCallback(async () => {
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
        api.get(`/api/incidents?${queryParams.toString()}`),
        api.get('/api/incidents/summary'),
      ]);

      setIncidents(incRes.data);
      setSummary(sumRes.data);
    } catch {
      setErrorMsg('Ocurrió un error de conexión al cargar la lista. Puedes reintentar.');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleStatusChange = async (id: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return;

    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc)));

    try {
      await api.patch(`/api/incidents/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status: currentStatus } : inc)));

      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.detail || 'Hubo un error del servidor. No se pudo cambiar el estado de la incidencia.'
        : 'Hubo un error del servidor.';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="text-slate-100">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Operaciones en Tiempo Real
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">Panel de Incidencias</h1>
        </div>
        <button
          onClick={() => router.push('/incidents/new')}
          className="bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] text-xs font-bold py-2.5 px-5 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition"
        >
          + Registrar Nueva
        </button>
      </div>

      {/* Panel de Resumen (Métricas) */}
      <div className="bg-[#121721]/80 p-5 rounded-2xl border border-emerald-500/20 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
          Resumen Global de Incidencias
        </h2>
        {summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a0d12]/80 border border-emerald-500/15 p-3.5 rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">Por Estado</p>
              {Object.entries((summary.status as Record<string, number>) || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs text-slate-300 mt-1">
                  <span>{k}:</span> <span className="font-mono font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0a0d12]/80 border border-emerald-500/15 p-3.5 rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200 mb-2">Por Categoría</p>
              {Object.entries((summary.category as Record<string, number>) || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs text-slate-300 mt-1">
                  <span>{k}:</span> <span className="font-mono font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0a0d12]/80 border border-emerald-500/15 p-3.5 rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-300 mb-2">Por Origen</p>
              {Object.entries((summary.origin as Record<string, number>) || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs text-slate-300 mt-1">
                  <span>{k}:</span> <span className="font-mono font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0a0d12]/80 border border-emerald-500/15 p-3.5 rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">Por Sede</p>
              {Object.entries((summary.branch as Record<string, number>) || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs text-slate-300 mt-1">
                  <span>{k}:</span> <span className="font-mono font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-mono">Cargando métricas...</p>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-[#121721]/60 p-4 rounded-2xl border border-emerald-500/15">
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="px-3.5 py-2 border border-emerald-500/25 bg-[#0a0d12] text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Cualquier Estado</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="discarded">Discarded</option>
        </select>
        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="px-3.5 py-2 border border-emerald-500/25 bg-[#0a0d12] text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Cualquier Categoría</option>
          <option value="fallo_operativo">Fallo Operativo</option>
          <option value="queja">Queja</option>
          <option value="solicitud">Solicitud</option>
        </select>
        <select
          name="origin"
          value={filters.origin}
          onChange={handleFilterChange}
          className="px-3.5 py-2 border border-emerald-500/25 bg-[#0a0d12] text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Cualquier Origen</option>
          <option value="customer">Cliente</option>
          <option value="branch">Sede Local</option>
          <option value="internal">Interno</option>
        </select>
        <select
          name="branch"
          value={filters.branch}
          onChange={handleFilterChange}
          className="px-3.5 py-2 border border-emerald-500/25 bg-[#0a0d12] text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Cualquier Sede</option>
          <option value="central">Central</option>
          <option value="valencia">Valencia</option>
          <option value="miami">Miami</option>
        </select>
      </div>

      {errorMsg ? (
        <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-4 rounded-xl mb-4 flex items-center justify-between text-xs">
          <span>{errorMsg}</span>
          <button onClick={fetchData} className="underline font-bold">
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent"></div>
          <p className="mt-2 text-xs text-slate-400 font-mono">Cargando incidencias...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 bg-[#121721]/60 rounded-2xl border border-dashed border-emerald-500/25">
          <p className="text-base font-bold text-white">No se encontraron incidencias</p>
          <p className="text-xs text-slate-400 mt-1">
            Intenta ajustar los filtros o registra una nueva incidencia.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#121721]/80 rounded-2xl shadow-xl border border-emerald-500/20">
          <table className="min-w-full divide-y divide-emerald-500/15">
            <thead className="bg-[#0a0d12]/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Categoría / Sede
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Origen
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {incidents.map((inc) => (
                <tr key={inc.id as string} className="hover:bg-emerald-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-white">{inc.title as string}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-emerald-300">{inc.category as string}</div>
                    <div className="text-[11px] text-slate-400">{inc.branch as string}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                    {inc.origin as string}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={inc.status as string}
                      onChange={(e) =>
                        handleStatusChange(inc.id as string, inc.status as string, e.target.value)
                      }
                      className={`text-xs font-semibold rounded-full px-3 py-1 border bg-[#0a0d12] ${
                        inc.status === 'open'
                          ? 'text-amber-200 border-amber-300/40'
                          : inc.status === 'in_progress'
                          ? 'text-teal-300 border-teal-400/40'
                          : inc.status === 'resolved'
                          ? 'text-emerald-300 border-emerald-400/40'
                          : 'text-slate-400 border-slate-600'
                      }`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="discarded">Discarded</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                    {new Date(inc.created_at as string).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
