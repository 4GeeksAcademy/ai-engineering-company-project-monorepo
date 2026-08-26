// components/register-form.tsx — Formulario de registro de usuario
//
// Propósito: Renderiza un formulario completo de registro.
//
// Flujo:
// 1. Usuario completa todos los campos
// 2. Validación local: contraseña == confirmación
// 3. Llama a registerUser() que hace:
//    a) POST /users (crear usuario + perfil opcional)
//    b) POST /auth/login (login automático)
// 4. Si OK → guarda token + redirige a /suppliers
// 5. Si error → muestra errores por campo
//
// NOTA: El registro requiere autenticación del servidor.
// La acción de registro es: POST /users (público) + POST /auth/login.

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth-actions";

export default function RegisterForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Maneja el envío del formulario de registro.
   * 
   * Validación local:
   * - Contraseña debe coincidir con confirmación
   * 
   * Flujo API:
   * 1. POST /users (crear usuario)
   * 2. POST /auth/login (login automático)
   * 3. Redirige a /suppliers
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación local: contraseñas deben coincidir
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        email,
        password,
        name: name || undefined,
      });
      router.push("/suppliers");
    } catch (err: unknown) {
      const apiError = err as { status?: number; detail?: { detail?: string } };
      if (apiError.status === 409) {
        setError("Este email ya está registrado. Intenta iniciar sesión.");
      } else if (apiError.detail?.detail) {
        setError(apiError.detail.detail);
      } else {
        setError("Error al crear la cuenta. Intenta de nuevo.");
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
          <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
          <p className="mt-2 text-sm text-slate-600">
            Regístrate para acceder al panel de control de TrackFlow
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
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nombre (opcional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email *
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
              Contraseña *
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirmar contraseña *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        {/* Enlace a login */}
        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}