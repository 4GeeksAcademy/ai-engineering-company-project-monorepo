'use client';

import { FormEvent, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { changePassword } from '../../../../services/authApi';

export default function AccountChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('La contrasena nueva debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('La confirmacion de la nueva contrasena no coincide.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('La nueva contrasena debe ser diferente de la actual.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      clearForm();
      setSuccessMessage('Contrasena actualizada correctamente.');
    } catch (error) {
      setErrorMessage((error as Error).message || 'No fue posible cambiar la contrasena.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cambiar contrasena</h2>
        <p className="text-sm text-slate-600">
          Actualiza la clave de acceso de tu cuenta para mantenerla segura.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-sm font-medium text-slate-700">
              Contrasena actual
            </label>
            <input
              id="current-password"
              name="current-password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Ingresa tu contrasena actual"
            />
          </div>

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
              disabled={isSubmitting}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Al menos 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
              Confirmar nueva contrasena
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSubmitting}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Repite la nueva contrasena"
            />
          </div>

          {errorMessage ? (
            <Alert variant="error" title="No se pudo cambiar la contrasena">
              {errorMessage}
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert variant="success" title="Contrasena actualizada">
              {successMessage}
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Cambiar contrasena'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
