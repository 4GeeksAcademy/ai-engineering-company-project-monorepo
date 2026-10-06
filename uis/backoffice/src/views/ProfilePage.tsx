"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { profileChanges, toProfileForm, validateProfileFields, type ProfileFieldValues } from "../lib/profileFields";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none aria-[invalid=true]:border-rose-500";

type Field = keyof ProfileFieldValues;
type FieldErrors = Partial<Record<Field, string>>;

export default function ProfilePage() {
  const { user, refreshUser, saveProfile } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<ProfileFieldValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Always show what the API has now (GET /auth/me), not what the session loaded at login.
  useEffect(() => {
    let cancelled = false;
    refreshUser()
      .then(() => !cancelled && setLoaded(true))
      .catch(() => !cancelled && setLoadError("No se pudo cargar tu perfil. Recarga la página para intentarlo de nuevo."));
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (loaded && user) setForm(toProfileForm(user));
  }, [loaded, user]);

  if (loadError) {
    return (
      <div role="alert" className="mx-auto max-w-2xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
        {loadError}
      </div>
    );
  }
  if (!user || !form) return <p className="text-sm text-slate-400">Cargando tu perfil…</p>;

  const update = profileChanges(toProfileForm(user), form);
  const dirty = Object.keys(update).length > 0;

  const change = (field: Field) => (value: string) => {
    setForm((current) => current && { ...current, [field]: value });
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setSaved(false);
    const errors = validateProfileFields(form, { nameRequired: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length || !dirty) return;

    setSaving(true);
    try {
      await saveProfile(update);
      setSaved(true);
    } catch (err) {
      // A 401 never lands here visibly: the API client drops the token and RequireAuth sends to /login.
      if (err instanceof ApiError && err.status === 422) {
        const fields: FieldErrors = {};
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          if (field in form) fields[field as Field] = message;
        }
        setFieldErrors(fields);
        setError(Object.keys(fields).length ? null : `Revisa los datos del formulario. ${err.message}`);
      } else {
        setError("No se pudieron guardar los cambios. Inténtalo de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (field: Field) => ({
    id: field,
    value: form[field],
    onChange: (e: { target: { value: string } }) => change(field)(e.target.value),
    "aria-invalid": fieldErrors[field] ? true : undefined,
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
    className: inputClass,
  });
  const fieldError = (field: Field) =>
    fieldErrors[field] && (
      <span id={`${field}-error`} className="mt-1 block text-xs text-rose-300">
        {fieldErrors[field]}
      </span>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Mi perfil</h1>
      <p className="mt-2 text-slate-400">Tus datos de contacto dentro de Nexova.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="text-sm text-slate-300">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user.email} readOnly aria-readonly className={`${inputClass} cursor-not-allowed text-slate-400`} />
          <span className="mt-1 block text-xs text-slate-500">Es el email con el que inicias sesión; no se cambia desde aquí.</span>
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label htmlFor="name">Nombre</label>
          <input type="text" autoComplete="name" {...fieldProps("name")} />
          {fieldError("name")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label htmlFor="phone">Teléfono</label>
          <input type="tel" autoComplete="tel" {...fieldProps("phone")} />
          {fieldError("phone")}
        </div>
        <div className="mt-4 text-sm text-slate-300">
          <label htmlFor="address">Dirección</label>
          <input type="text" autoComplete="street-address" {...fieldProps("address")} />
          {fieldError("address")}
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {saved && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 size={16} />
            Cambios guardados.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Guardar cambios
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => {
              setForm(toProfileForm(user));
              setFieldErrors({});
              setError(null);
            }}
            className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
          >
            Descartar
          </button>
        </div>
      </form>
    </div>
  );
}
