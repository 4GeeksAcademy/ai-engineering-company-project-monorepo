// components/reset-password-form.tsx — Formulario de restablecimiento de contraseña
//
// Propósito: Permite al usuario establecer una nueva contraseña
// usando el token recibido por email.
//
// Flujo:
// 1. Lee el token del query string de la URL: ?token=<jwt>
// 2. Si no hay token en la URL → mensaje de error + enlace a /forgot-password
// 3. Usuario ingresa nueva contraseña + confirmación
// 4. Click "Restablecer contraseña"
// 5. Llama a POST /auth/reset-password { token, new_password }
// 6. Si éxito → redirige a /login con mensaje
// 7. Si error (400) → "Este enlace ha expirado o ya ha sido utilizado"

"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-actions";

// ── Componente interno (usa useSearchParams, necesita Suspense) ──

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Leer token del query string de la URL
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Si no hay token en la URL ────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enlace inválido</h1>
          <p className="text-gray-600 mb-6">
            Este enlace no es válido o falta el token de restablecimiento.
          </p>
          <Link
            href="/forgot-password"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Solicita un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  // ── Envío del formulario ─────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que las contraseñas coinciden
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validar longitud mínima
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      // Redirigir a login con mensaje de éxito
      router.push("/login?reset=success");
    } catch (err: unknown) {
      const apiError = err as { status?: number; detail?: string };
      if (apiError.status === 400) {
        setError(
          "Este enlace ha expirado o ya ha sido utilizado. " +
            "Solicita uno nuevo."
        );
      } else {
        setError("Error al conectar con el servidor. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            TrackFlow
          </h1>
          <h2 className="mt-2 text-center text-sm text-gray-600">
            Establece una nueva contraseña
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Restableciendo..." : "Restablecer contraseña"}
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

// ── Componente exportado (envuelto en Suspense) ────────────
//
// ⚠️ NECESARIO: useSearchParams() requiere Suspense boundary
// en Next.js App Router. Sin esto, la página falla en build.

export default function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    }>
      <ResetPasswordFormInner />
    </Suspense>
  );
}