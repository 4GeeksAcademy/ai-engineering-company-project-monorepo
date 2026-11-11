"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import axios from "axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(token ? "" : "Token no proporcionado en la URL.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "El token es inválido o ha expirado.");
      } else {
        setError("El token es inválido o ha expirado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-medium">
          Enlace inválido o sin token de seguridad.
        </div>
        <Link href="/forgot-password" className="inline-block text-emerald-400 hover:underline text-xs font-semibold">
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-emerald-500/15 border border-emerald-400/40 rounded-xl text-emerald-300 text-sm font-medium">
          ¡Contraseña actualizada con éxito!
        </div>
        <p className="text-xs text-slate-400">Serás redirigido al inicio de sesión en unos segundos...</p>
        <Link
          href="/login"
          className="inline-block mt-2 px-5 py-2.5 bg-emerald-400 text-[#0a0d12] rounded-xl font-bold text-xs"
        >
          Ir a Iniciar Sesión ahora
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
          {error}
          <div className="mt-2">
            <Link href="/forgot-password" className="font-semibold text-amber-200 underline">
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Nueva Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Confirmar Contraseña
        </label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] text-sm font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-50 transition"
      >
        {isSubmitting ? "Guardando..." : "Restablecer Contraseña"}
      </button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0d12] px-4 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 h-[460px] w-[720px] rounded-full bg-emerald-500/12 blur-[140px]" />

      <div className="relative z-10 max-w-md w-full p-8 bg-[#121721]/85 rounded-2xl shadow-2xl border border-emerald-500/25 backdrop-blur-xl">
        <div className="text-center mb-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Restablecimiento Seguro
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white">Elige tu nueva contraseña</h1>
          <p className="text-xs text-slate-400 mt-1.5">Asegúrate de usar al menos 6 caracteres.</p>
        </div>
        <Suspense fallback={<div className="text-center text-xs text-slate-400">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
