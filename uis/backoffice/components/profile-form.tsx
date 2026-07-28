// components/profile-form.tsx — Formulario de perfil del usuario
//
// Propósito: Muestra y permite editar los datos del perfil del usuario.
//
// Flujo:
// 1. Al cargar: llama a getCurrentUser() → GET /auth/me
// 2. Muestra email (solo lectura) + name/phone/address (editables)
// 3. Al guardar: llama a updateProfile() → PUT /profiles/me
// 4. Si éxito → muestra mensaje de confirmación
// 5. Si 401 → redirige a /login (sesión expirada)
//
// PROTEGIDO

"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  updateProfile,
  logoutUser,
} from "@/lib/auth-actions";

export default function ProfileForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Carga los datos del usuario al montar el componente.
   * 
   * Si el token es inválido o ha expirado (401),
   * cierra la sesión y redirige al login.
   */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getCurrentUser();
        setEmail(user.email);
        setRole(user.role);
        setName(user.profile?.name ?? "");
        setPhone(user.profile?.phone ?? "");
        setAddress(user.profile?.address ?? "");
      } catch (err: unknown) {
        const apiError = err as { status?: number };
        if (apiError.status === 401) {
          logoutUser();
        } else {
          setError("Error al cargar el perfil");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  /**
   * Maneja el guardado del perfil.
   * 
   * 1. Llama a PUT /profiles/me con los datos editados
   * 2. Si éxito → muestra mensaje de confirmación por 3 segundos
   * 3. Si 401 → cierra sesión
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateProfile({ name, phone: phone || undefined, address: address || undefined });
      setSuccess("Perfil actualizado correctamente");
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const apiError = err as { status?: number };
      if (apiError.status === 401) {
        logoutUser();
      } else {
        setError("Error al guardar el perfil. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Estado de carga inicial ──────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <p className="text-slate-500">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Encabezado */}
        <div className="mb-6">
          <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
            Mi cuenta
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
            Perfil de usuario
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gestiona tu información personal. El email no se puede modificar.
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Mensaje de éxito */}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
            {success}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-400">
              El email no se puede modificar.
            </p>
          </div>

          {/* Rol (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Rol
            </label>
            <input
              type="text"
              value={role}
              disabled
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <textarea
              id="address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, ciudad, código postal..."
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}