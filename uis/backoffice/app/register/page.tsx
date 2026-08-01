'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../components/ui/Alert';
import { login, register, setSessionToken } from '../../services/authApi';

interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.email.trim()) {
    errors.email = 'El email es obligatorio.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresa un email valido.';
  }

  if (!values.password) {
    errors.password = 'La contrasena es obligatoria.';
  } else if (values.password.length < 8) {
    errors.password = 'La contrasena debe tener al menos 8 caracteres.';
  } else if (getUtf8ByteLength(values.password) > 72) {
    errors.password = 'La contrasena es demasiado larga. Usa un maximo de 72 bytes.';
  }

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formValues, setFormValues] = useState<RegisterFormValues>({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<RegisterFormErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isButtonDisabled = useMemo(() => isSubmitting, [isSubmitting]);

  const handleFieldChange = (field: keyof RegisterFormValues, value: string) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }));

    setFormErrors((previousErrors) => {
      if (!previousErrors[field]) {
        return previousErrors;
      }

      const nextErrors = { ...previousErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateRegisterForm(formValues);
    setFormErrors(validationErrors);
    setErrorMessage(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: formValues.email.trim(),
        password: formValues.password,
        name: formValues.name.trim() || undefined,
        phone: formValues.phone.trim() || undefined,
        address: formValues.address.trim() || undefined,
      };

      await register(payload);
      const token = await login({ email: payload.email, password: payload.password });
      setSessionToken(token);
      router.replace('/');
    } catch (error) {
      setErrorMessage((error as Error).message || 'No fue posible completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h2>
          <p className="text-sm text-slate-600">
            Registra un usuario para ingresar al Backoffice de TrackFlow.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="nombre@trackflow.com"
              aria-invalid={Boolean(formErrors.email)}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
            />
            {formErrors.email ? (
              <p id="email-error" className="text-xs font-medium text-rose-700">
                {formErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSubmitting}
              value={formValues.password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Minimo 8 caracteres"
              aria-invalid={Boolean(formErrors.password)}
              aria-describedby={formErrors.password ? 'password-error' : undefined}
            />
            {formErrors.password ? (
              <p id="password-error" className="text-xs font-medium text-rose-700">
                {formErrors.password}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nombre (opcional)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Telefono (opcional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              disabled={isSubmitting}
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="address" className="text-sm font-medium text-slate-700">
              Direccion (opcional)
            </label>
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              disabled={isSubmitting}
              value={formValues.address}
              onChange={(event) => handleFieldChange('address', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Direccion de contacto"
            />
          </div>

          {errorMessage ? (
            <Alert variant="error" title="Error de registro">
              {errorMessage}
            </Alert>
          ) : null}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-sky-700 hover:text-sky-800 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </section>
  );
}
