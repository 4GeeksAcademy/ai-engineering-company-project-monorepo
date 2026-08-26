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
//
// Telemetría:
// - login_attempted (O4): antes de llamar a la API
// - login_failed (O5): si la API rechaza las credenciales
// - session_started (O7): después de login exitoso, con rol del JWT

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/auth-actions";
import { track } from "@/lib/telemetry";

// ── Hash simple para PII (SHA-256 vía Web Crypto API) ─────

/**
 * Hashea un string usando SHA-256 (Web Crypto API).
 * Útil para anonimizar emails antes de enviarlos a telemetría.
 * Devuelve el hash en hexadecimal.
 */
async function sha256(message: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback: hash simple no criptográfico (entorno no seguro)
    return message;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Extraer rol del JWT ──────────────────────────────────

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Útil para obtener el role del usuario después del login.
 */
function getRoleFromToken(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "user";
    const payload = JSON.parse(atob(parts[1]));
    return payload.role || "user";
  } catch {
    return "user";
  }
}

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
   * 
   * Telemetría:
   * - login_attempted: antes de la llamada API (email hasheado)
   * - login_failed: en catch (con razón del fallo)
   * - session_started: tras login exitoso (con rol del JWT)
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Hashear email para PII
    const emailHash = await sha256(email);

    try {
      const response = await loginUser(email, password);

      // Track: intento de login exitoso
      track("login_attempted", {
        email: emailHash,
        success: true,
        ip_address: "frontend_capture", // placeholder — IP real debe añadirse server-side
        user_agent: navigator.userAgent,
      });

      // Track: sesión iniciada
      const role = getRoleFromToken(response.access_token);
      track("session_started", {
        role,
        ip_address: "frontend_capture",
        user_agent: navigator.userAgent,
      });

      // Guardar timestamp de login para calcular duración de sesión en logout
      try {
        sessionStorage.setItem("telemetry_login_timestamp", Date.now().toString());
      } catch {
        // sessionStorage no disponible
      }

      router.push("/suppliers");
    } catch (err: unknown) {
      const apiError = err as { status?: number; detail?: { detail?: string } };
      let failureReason: string;
      if (apiError.status === 401) {
        failureReason = "invalid_credentials";
        setError("Email o contraseña incorrectos");
      } else if (apiError.detail?.detail) {
        failureReason = "invalid_credentials";
        setError(apiError.detail.detail);
      } else {
        failureReason = "invalid_credentials";
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }

      // Track: intento de login fallido
      track("login_attempted", {
        email: emailHash,
        success: false,
        ip_address: "frontend_capture",
        user_agent: navigator.userAgent,
      });

      // Track: login fallido (evento específico con razón)
      track("login_failed", {
        email: emailHash,
        failure_reason: failureReason,
        ip_address: "frontend_capture",
        attempt_count: 1,
      });
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

        {/* Enlace a restablecimiento de contraseña */}
        <div className="text-center text-sm mt-2">
          <Link
            href="/forgot-password"
            className="text-indigo-600 hover:text-indigo-500"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

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