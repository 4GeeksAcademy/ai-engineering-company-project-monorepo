'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { forgotPassword } from '../../services/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDisabled = hasSubmitted || isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isFormDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await forgotPassword({ email: email.trim() });
      setHasSubmitted(true);
    } catch (error) {
      setErrorMessage((error as Error).message || 'No fue posible enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Recuperar contrasena</h2>
          <p className="text-sm text-slate-600">
            Ingresa tu email y te enviaremos instrucciones para restablecer tu acceso.
          </p>
        </div>

        {hasSubmitted ? (
          <Alert variant="success" title="Solicitud enviada">
            Si esa direccion esta registrada, recibiras un enlace en breve.
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="error" title="No se pudo enviar la solicitud">
            {errorMessage}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
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
              disabled={isFormDisabled}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="nombre@trackflow.com"
            />
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperacion'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Volver a{' '}
          <Link href="/login" className="font-medium text-sky-700 hover:text-sky-800 hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </section>
  );
}
