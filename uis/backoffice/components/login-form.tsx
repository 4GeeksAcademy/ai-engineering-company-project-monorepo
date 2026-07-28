// components/login-form.tsx — Formulario de inicio de sesión
//
// Propósito: Renderiza un formulario de email + contraseña.
//
// Flujo:
// 1. Usuario completa email y contraseña
// 2. Click "Iniciar sesión"
// 3. Llama a loginUser() que hace POST /auth/login
// 4. Si OK → redirige a /suppliers (vista protegida principal)
// 5. Si error → muestra mensaje de error claro
//
// Props: ninguna (es una página completa)

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/auth-actions";

export default function LoginForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Maneja el envío del formulario de login.
   * 
   * 1. Limpia errores previos
   * 2. Activa estado de carga
   * 3. Llama a loginUser() que hace POST /auth/login
   * 4. Si éxito → redirige a /suppliers
   * 5. Si error 401 → muestra "Email o contraseña incorrectos"
   * 6. Si otro error → muestra mensaje genérico
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password);
      router.push("/suppliers");
    } catch (err: unknown) {
      const apiError = err as { status?: number; detail?: { detail?: string } };
      if (apiError.status === 401) {
        setError("Email o contraseña incorrectos");
      } else if (apiError.detail?.detail) {
        setError(apiError.detail.detail);
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-600">
            Accede al panel de control de TrackFlow
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Enlace a registro */}
        <p className="mt-6 text-center text-sm text-slate-600">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}