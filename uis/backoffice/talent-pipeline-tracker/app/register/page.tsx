'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../../components/ui/Alert';

const API_BASE_URL = 'https://crispy-space-goggles-qxjqwvjvw4qc9r5g-3001.app.github.dev';
const AUTH_SUCCESS_REDIRECT_PATH = '/dashboard';

interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
}

interface LoginResponse {
  token?: string;
  access_token?: string;
  jwt?: string;
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

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No fue posible completar el registro. Intenta nuevamente.';
}

async function parseResponseError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const errorData = (await response.json()) as {
      message?: string;
      detail?: string;
      error?: string;
    };

    return errorData.message || errorData.detail || errorData.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
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
      const trimmedName = formValues.name.trim();
      const trimmedPhone = formValues.phone.trim();
      const trimmedAddress = formValues.address.trim();

      const registerPayload: Record<string, string> = {
        email: formValues.email.trim(),
        password: formValues.password,
      };

      if (trimmedName) {
        registerPayload.name = trimmedName;
      }

      if (trimmedPhone) {
        registerPayload.phone = trimmedPhone;
      }

      if (trimmedAddress) {
        registerPayload.address = trimmedAddress;
      }

      const registerResponse = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerPayload),
      });

      if (!registerResponse.ok) {
        const registerErrorMessage = await parseResponseError(
          registerResponse,
          registerResponse.status === 409 || registerResponse.status === 400
            ? 'El email ya esta registrado.'
            : 'No fue posible crear la cuenta.',
        );

        throw new Error(registerErrorMessage);
      }

      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formValues.email.trim(),
          password: formValues.password,
        }),
      });

      const loginResponseData = (await loginResponse.json()) as LoginResponse & { message?: string };

      if (!loginResponse.ok) {
        if (loginResponse.status === 401) {
          throw new Error('Cuenta creada, pero no fue posible iniciar sesion con esas credenciales.');
        }

        throw new Error(loginResponseData.message || 'No fue posible iniciar sesion despues del registro.');
      }

      const jwtToken =
        loginResponseData.token || loginResponseData.access_token || loginResponseData.jwt;

      if (!jwtToken) {
        throw new Error('La respuesta de autenticacion no incluye un token valido.');
      }

      localStorage.setItem('trackflow_token', jwtToken);
      router.replace(AUTH_SUCCESS_REDIRECT_PATH);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-11rem)] items-center justify-center py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h2>
          <p className="text-sm text-slate-600">
            Registra un nuevo usuario para acceder al panel interno de TrackFlow.
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
      </div>
    </section>
  );
}