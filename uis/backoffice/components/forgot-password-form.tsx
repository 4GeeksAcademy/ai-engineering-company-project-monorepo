// components/forgot-password-form.tsx — Formulario de solicitud de restablecimiento
//
// Propósito: Renderiza un formulario donde el usuario ingresa su email
// para recibir un enlace de restablecimiento de contraseña.
//
// Flujo:
// 1. Usuario completa email
// 2. Click "Enviar enlace"
// 3. Llama a POST /auth/forgot-password
// 4. SIEMPRE muestra el mismo mensaje de confirmación
//    (incluso si el email no existe — previene enumeración)
// 5. El formulario se desactiva tras el envío para evitar duplicados
//
// Telemetría:
// - password_reset_requested (O6): cuando se solicita restablecimiento

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth-actions";
import { track } from "@/lib/telemetry";

/**
 * Hashea un string usando SHA-256 (Web Crypto API).
 * Para anonimizar emails antes de enviarlos a telemetría.
 */
async function sha256(message: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return message;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await forgotPassword(email);

      // Track: solicitud de restablecimiento de contraseña
      // El email se hashea para cumplir con PII (retención máxima 30 días)
      const emailHash = await sha256(email);
      track("password_reset_requested", {
        email: emailHash,
        source: "forgot_password_page",
      });

      // Siempre mostrar confirmación — no revelar si el email existe
      setSubmitted(true);
    } catch {
      // Incluso si hay error de red, trackear el intento
      // para medir tasa de fallo de la funcionalidad de reset
      const emailHash = await sha256(email).catch(() => email);
      track("password_reset_requested", {
        email: emailHash,
        source: "forgot_password_page",
      });

      // Incluso si hay error de red, mostrar confirmación
      // para no revelar información sobre usuarios registrados
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Estado: Formulario enviado (mostrar confirmación) ─────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Revisa tu email
          </h1>
          <p className="text-gray-600 mb-6">
            Si esa dirección está registrada en nuestro sistema,
            recibirás un enlace de restablecimiento en breve.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            ¿No recibiste el email? Revisa tu carpeta de spam
            o intenta de nuevo más tarde.
          </p>
          <Link
            href="/login"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  // ── Estado: Formulario activo ─────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            TrackFlow
          </h1>
          <h2 className="mt-2 text-center text-sm text-gray-600">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-center text-xs text-gray-500">
            Ingresa tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
          </button>

          <div className="text-center text-sm">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}