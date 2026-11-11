"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Siempre devuelve 200 según STRATEGY.md
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      // Incluso en error mostramos éxito para no enumerar emails, o simplemente
      // ignoramos el error de UI porque el backend siempre manda 200.
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0d12] px-4 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 h-[460px] w-[720px] rounded-full bg-emerald-500/12 blur-[140px]" />

      <div className="relative z-10 max-w-md w-full p-8 bg-[#121721]/85 rounded-2xl shadow-2xl border border-emerald-500/25 backdrop-blur-xl">
        <div className="text-center mb-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Seguridad Corporativa
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white">Recuperar Contraseña</h1>
          <p className="text-xs text-slate-400 mt-2">
            Te enviaremos un enlace seguro para restablecer tus credenciales.
          </p>
        </div>

        {submitted ? (
          <div className="p-5 bg-emerald-500/10 border border-emerald-400/35 rounded-xl text-center">
            <p className="text-emerald-300 text-sm font-medium">
              Si la dirección de correo está en nuestro sistema, recibirás un enlace de restablecimiento en breve.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-amber-200 hover:text-amber-100 font-semibold text-xs underline"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-emerald-500/25 bg-[#0a0d12]/90 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 focus:outline-none transition"
                placeholder="tu@email.com"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] text-sm font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition disabled:opacity-50 flex justify-center"
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <div className="text-center mt-5 pt-4 border-t border-emerald-500/15">
              <Link href="/login" className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors">
                ← Volver a Iniciar Sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
