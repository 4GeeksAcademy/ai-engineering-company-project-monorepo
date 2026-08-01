'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../../components/ui/Alert';

const API_BASE_URL = 'https://crispy-space-goggles-qxjqwvjvw4qc9r5g-3001.app.github.dev';
const AUTH_SUCCESS_REDIRECT_PATH = '/dashboard';

interface LoginResponse {
  token?: string;
  access_token?: string;
  jwt?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No fue posible iniciar sesión. Intenta nuevamente.';
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const responseData = (await response.json()) as LoginResponse & { message?: string };

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Credenciales invalidas');
        }

        throw new Error(responseData.message || 'No fue posible iniciar sesion.');
      }

      const jwtToken = responseData.token || responseData.access_token || responseData.jwt;

      if (!jwtToken) {
        throw new Error('La respuesta de autenticacion no incluye un token valido.');
      }

      localStorage.setItem('trackflow_token', jwtToken);
      router.replace(AUTH_SUCCESS_REDIRECT_PATH);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-11rem)] items-center justify-center py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesion</h2>
          <p className="text-sm text-slate-600">
            Accede a tu panel interno de TrackFlow para gestionar candidaturas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Correo corporativo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2"
              placeholder="nombre@trackflow.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2"
              placeholder="Ingresa tu contrasena"
            />
          </div>

          {errorMessage ? (
            <Alert variant="error" title="Error de autenticacion">
              {errorMessage}
            </Alert>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Ingresando...' : 'Entrar al sistema'}
          </button>
        </form>
      </div>
    </section>
  );
}