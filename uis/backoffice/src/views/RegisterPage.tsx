"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { emptyForm, signUpErrorFromApi, validateSignUp, type Field, type FieldErrors, type Form } from "../lib/signUpForm";
import type { SignUpPayload } from "../types/auth";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none aria-[invalid=true]:border-rose-500";

export default function RegisterPage() {
  const { status, register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Form>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  // Logged in (straight after signing up, or already when opening /register): into the app.
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  if (status === "authenticated") return null;

  const update = (field: Field) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const errors = validateSignUp(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const payload: SignUpPayload = {
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };
    setSubmitting(true);
    try {
      const outcome = await register(payload);
      if (outcome !== "authenticated") setCreated(true); // otherwise the effect above redirects
    } catch (err) {
      const { fields, general } = signUpErrorFromApi(err);
      setFieldErrors(fields);
      setError(general);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Shell>
        <div role="status" className="mt-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>Cuenta creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión con tus datos.</p>
        </div>
        <Link
          href="/login"
          className="mt-6 flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Ir a iniciar sesión
        </Link>
      </Shell>
    );
  }

  const fieldProps = (field: Field) => ({
    value: form[field],
    onChange: (e: { target: { value: string } }) => update(field)(e.target.value),
    "aria-invalid": fieldErrors[field] ? true : undefined,
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
    className: `${inputClass} mt-1`,
  });
  const fieldError = (field: Field) =>
    fieldErrors[field] && (
      <span id={`${field}-error`} className="mt-1 block text-xs text-rose-300">
        {fieldErrors[field]}
      </span>
    );

  return (
    <Shell>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-4 text-sm text-slate-300">
          <label className="block">
            Email
            <input type="email" autoComplete="email" {...fieldProps("email")} />
          </label>
          {fieldError("email")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label className="block">
            Contraseña
            <input type="password" autoComplete="new-password" {...fieldProps("password")} />
          </label>
          {fieldError("password")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label className="block">
            Repite la contraseña
            <input type="password" autoComplete="new-password" {...fieldProps("confirmPassword")} />
          </label>
          {fieldError("confirmPassword")}
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-slate-500">Perfil (opcional)</p>
        <div className="mt-2 text-sm text-slate-300">
          <label className="block">
            Nombre
            <input type="text" autoComplete="name" {...fieldProps("name")} />
          </label>
          {fieldError("name")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label className="block">
            Teléfono
            <input type="tel" autoComplete="tel" {...fieldProps("phone")} />
          </label>
          {fieldError("phone")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label className="block">
            Dirección
            <input type="text" autoComplete="street-address" {...fieldProps("address")} />
          </label>
          {fieldError("address")}
        </div>

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
          Crear cuenta
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
          Inicia sesión
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xl font-black text-white">
          nexova<span className="text-cyan-400">.</span>
        </p>
        <p className="text-xs uppercase tracking-widest text-slate-500">Backoffice</p>
        <h1 className="mt-6 text-lg font-semibold text-white">Crear cuenta</h1>
        {children}
      </div>
    </div>
  );
}
