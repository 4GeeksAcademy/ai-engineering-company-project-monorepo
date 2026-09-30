import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth, type RegisterResult } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { validateProfileFields } from "../lib/profileFields";
import type { SignUpPayload } from "../types/auth";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none aria-[invalid=true]:border-rose-500";

// Same limits as the API (services/api/users/schemas.py, UserCreate); the profile ones live in lib/profileFields.
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "email" | "password" | "confirmPassword" | "name" | "phone" | "address";
type FieldErrors = Partial<Record<Field, string>>;
type Form = Record<Field, string>;

const emptyForm: Form = { email: "", password: "", confirmPassword: "", name: "", phone: "", address: "" };

function validate(form: Form): FieldErrors {
  const errors: FieldErrors = {};
  const email = form.email.trim();
  if (!email) errors.email = "El email es obligatorio.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "El email no es válido.";

  if (!form.password) errors.password = "La contraseña es obligatoria.";
  else if (form.password.length < PASSWORD_MIN)
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  else if (new TextEncoder().encode(form.password).length > PASSWORD_MAX_BYTES)
    errors.password = `La contraseña es demasiado larga (máximo ${PASSWORD_MAX_BYTES} bytes).`;

  if (form.confirmPassword !== form.password) errors.confirmPassword = "Las contraseñas no coinciden.";

  return { ...errors, ...validateProfileFields(form, { nameRequired: false }) };
}

/** Translates the API's rejection into per-field messages where possible, plus a general one. */
function fromApiError(err: unknown): { fields: FieldErrors; general: string | null } {
  if (!(err instanceof ApiError)) {
    return { fields: {}, general: "No se pudo crear la cuenta. Comprueba tu conexión e inténtalo de nuevo." };
  }
  if (err.status === 409) return { fields: { email: "Ya existe una cuenta con ese email." }, general: null };
  if (err.status === 422) {
    const fields: FieldErrors = {};
    const unknown: string[] = [];
    for (const [field, message] of Object.entries(err.fieldErrors)) {
      if (field in emptyForm) fields[field as Field] = message;
      else unknown.push(message);
    }
    const general =
      unknown.length || !Object.keys(fields).length ? `Revisa los datos del formulario. ${unknown.join(" ")}`.trim() : null;
    return { fields, general };
  }
  return { fields: {}, general: "No se pudo crear la cuenta. Inténtalo de nuevo." };
}

export default function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Exclude<RegisterResult, "authenticated"> | null>(null);

  if (status === "authenticated") return <Navigate to="/" replace />;

  const update = (field: Field) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const errors = validate(form);
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
      if (outcome === "authenticated") navigate("/", { replace: true });
      else setResult(outcome);
    } catch (err) {
      const { fields, general } = fromApiError(err);
      setFieldErrors(fields);
      setError(general);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Shell>
        <div role="status" className="mt-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>
            {result === "pending"
              ? "Cuenta creada. Un administrador tiene que aprobarla antes de que puedas iniciar sesión."
              : "Cuenta creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión con tus datos."}
          </p>
        </div>
        <Link
          to="/login"
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
        <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
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
