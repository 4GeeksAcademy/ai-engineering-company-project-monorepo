'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '../components/ui/Alert';
import { resetPassword } from '../../services/authApi';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDisabled = isSubmitting || hasSubmitted || !token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isFormDisabled) {
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await resetPassword({ token, newPassword });
      setHasSubmitted(true);
      router.replace('/login');
    } catch (error) {
      setErrorMessage((error as Error).message || 'No fue posible restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Crear nueva contraseña</h2>
          <p className="text-sm text-slate-600">
            Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
          </p>
        </div>

        {!token ? (
          <Alert variant="error" title="Enlace invalido">
            El enlace de recuperacion no incluye un token valido o ya no es utilizable.
          </Alert>
        ) : null}

        {hasSubmitted ? (
          <Alert variant="success" title="Contrasena actualizada">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="error" title="No se pudo restablecer la contrasena">
            {errorMessage}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
              Nueva contrasena
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isFormDisabled}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Al menos 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
              Confirmar contrasena
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isFormDisabled}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Repite la nueva contrasena"
            />
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Actualizando...' : 'Restablecer contrasena'}
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