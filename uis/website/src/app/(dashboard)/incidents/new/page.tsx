'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NewIncidentPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'solicitud',
    origin: 'customer',
    branch: 'central',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setErrorMsg(data.detail || 'Por favor verifica los campos introducidos.');
        } else {
          setErrorMsg('Ocurrió un problema de red. Intenta más tarde.');
        }
        return;
      }

      setSuccessMsg('Incidencia registrada correctamente.');
      setFormData({
        title: '',
        description: '',
        category: 'solicitud',
        origin: 'customer',
        branch: 'central',
      });
    } catch {
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isBranchOrigin = formData.origin === 'branch';

  return (
    <div className="py-4 text-slate-100">
      <div className="max-w-2xl mx-auto p-8 bg-[#121721]/85 rounded-2xl shadow-2xl border border-emerald-500/25 backdrop-blur-xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Registro Operativo
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-6 text-white">Registrar Nueva Incidencia</h1>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs mb-4">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 px-4 py-3 rounded-xl text-xs mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Título Breve
            </label>
            <input
              type="text"
              name="title"
              required
              minLength={5}
              maxLength={150}
              value={formData.title}
              onChange={handleChange}
              className="block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              placeholder="Ej: Problema con servidor en Miami"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Descripción Detallada
            </label>
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={1000}
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              placeholder="Describe el problema en detalle (mín. 20 caracteres)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Categoría
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-4 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              >
                <option value="fallo_operativo">Fallo Operativo</option>
                <option value="queja">Queja</option>
                <option value="solicitud">Solicitud</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Origen del Reporte
              </label>
              <select
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                className="block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-4 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              >
                <option value="customer">Cliente</option>
                <option value="branch">Sede Local</option>
                <option value="internal">Interno / Central</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Sede
            </label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className={`block w-full rounded-xl px-4 py-2.5 text-sm border bg-[#0a0d12] text-white transition-colors ${
                isBranchOrigin
                  ? 'border-amber-400 focus:border-amber-300'
                  : 'border-emerald-500/25 focus:border-emerald-400'
              }`}
            >
              <option value="central">Central</option>
              <option value="valencia">Valencia, España</option>
              <option value="miami">Miami, Florida</option>
            </select>
            {isBranchOrigin && (
              <p className="mt-1.5 text-xs text-amber-200 font-medium">
                Por favor verifica desde qué sede estás reportando.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-emerald-500/15 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/incidents')}
              className="text-xs font-semibold text-slate-400 hover:text-emerald-400"
            >
              ← Volver al listado
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#0a0d12] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition"
            >
              {loading ? 'Enviando...' : 'Registrar Incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
