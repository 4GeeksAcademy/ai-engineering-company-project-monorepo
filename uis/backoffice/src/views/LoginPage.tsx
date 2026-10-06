"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { currentReturnTo } from "../lib/returnTo";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none";

export default function LoginPage() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Logged in (by this form, by another tab, or already when opening /login): go to ?next= or the home page.
  useEffect(() => {
    if (status === "authenticated") router.replace(currentReturnTo());
  }, [status, router]);

  if (status === "authenticated") return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Introduce el email y la contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password); // the effect above redirects
    } catch (err) {
      // The API answers the same 401 for a wrong password, an unknown email and an account that an
      // admin has switched off, so the message covers all three.
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email o contraseña incorrectos, o la cuenta está desactivada."
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <p className="text-xl font-black text-white">
          nexova<span className="text-cyan-400">.</span>
        </p>
        <p className="text-xs uppercase tracking-widest text-slate-500">Backoffice</p>
        <h1 className="mt-6 text-lg font-semibold text-white">Iniciar sesión</h1>

        <label className="mt-4 block text-sm text-slate-300">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="mt-4 block text-sm text-slate-300">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Entrar
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
