"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import axios from "axios";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("La nueva contraseña no puede ser igual a la actual.");
      return;
    }

    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Error al cambiar la contraseña.");
      } else {
        setError("Error al cambiar la contraseña.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Seguridad
          </span>
          <h1 className="text-2xl font-bold text-white mt-0.5">Cambiar Contraseña</h1>
          <p className="text-xs text-slate-400 mt-1">Actualiza tu contraseña de acceso corporativo.</p>
        </div>
        <Link href="/account/profile" className="text-xs font-semibold text-emerald-400 hover:underline">
          &larr; Volver a mi perfil
        </Link>
      </div>

      <div className="bg-[#121721]/85 rounded-2xl shadow-2xl border border-emerald-500/25 p-8 backdrop-blur-xl">
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-400/40 rounded-xl text-emerald-300 text-xs font-medium">
            ¡Tu contraseña ha sido cambiada exitosamente!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Contraseña Actual
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <hr className="border-emerald-500/15" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] text-xs font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-50 transition"
            >
              {isSubmitting ? "Guardando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
