'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function ProfilePage() {
  const { logout } = useAuth();

  // 1. Estados de la vista
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2. Estados editables del formulario
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // 3. Efecto para Cargar Datos
  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const data = response.data;

      setProfile(data);
      setName(data.full_name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
    } catch (err) {
      setError('Ocurrió un error al cargar la información del perfil.');
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  // 4. Función para guardar los cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.put('/profiles/me', {
        full_name: name,
        phone: phone,
        address: address,
      });
      setProfile(response.data);
      setSuccess('¡Perfil actualizado con éxito!');
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  // 5. Interfaz mientras carga los datos
  if (loading)
    return (
      <div className="p-8 text-center text-emerald-400 font-mono text-sm">
        Cargando perfil seguro...
      </div>
    );

  // 6. Interfaz Visual (UI) — Emerald Command Center
  return (
    <div className="py-4 px-2 sm:px-6">
      <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-500/25 bg-[#121721]/85 shadow-2xl p-8 backdrop-blur-xl">
        {/* Cabecera y botones */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-emerald-500/15 pb-5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Credenciales de Operador
            </span>
            <h1 className="text-2xl font-bold text-white mt-0.5">Mi Perfil</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/account/change-password"
              className="text-xs border border-emerald-500/30 bg-[#0a0d12]/70 text-emerald-300 px-3.5 py-2 rounded-xl hover:bg-emerald-500/15 transition font-medium"
            >
              Cambiar Contraseña
            </Link>
            <button
              onClick={logout}
              className="text-xs border border-rose-500/35 bg-rose-500/10 text-rose-300 px-3.5 py-2 rounded-xl hover:bg-rose-500/20 transition font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3.5 mb-5 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 p-3.5 mb-5 rounded-xl text-xs font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Correo Electrónico */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Correo Electrónico (No editable)
            </label>
            <input
              type="email"
              disabled
              className="mt-1.5 block w-full px-4 py-2.5 border border-emerald-500/15 rounded-xl bg-[#0a0d12]/50 text-slate-400 text-sm cursor-not-allowed"
              value={(profile?.email as string) || ''}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Nombre Completo
            </label>
            <input
              type="text"
              className="mt-1.5 block w-full px-4 py-2.5 border border-emerald-500/25 rounded-xl bg-[#0a0d12]/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Teléfono
            </label>
            <input
              type="tel"
              className="mt-1.5 block w-full px-4 py-2.5 border border-emerald-500/25 rounded-xl bg-[#0a0d12]/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Dirección
            </label>
            <textarea
              rows={3}
              className="mt-1.5 block w-full px-4 py-2.5 border border-emerald-500/25 rounded-xl bg-[#0a0d12]/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 resize-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] text-xs font-bold text-[#0a0d12] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
