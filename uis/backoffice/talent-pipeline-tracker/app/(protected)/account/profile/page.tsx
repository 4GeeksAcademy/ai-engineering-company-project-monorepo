'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../../components/ui/Alert';
import { Spinner } from '../../../../components/ui/Spinner';
import { apiFetch, logout } from '../../../../services/httpClient';

const AUTH_TOKEN_STORAGE_KEY = 'trackflow_token';

interface ProfileFormValues {
  email: string;
  name: string;
  phone: string;
  address: string;
}

interface AuthMeResponse {
  email?: string;
  user?: {
    email?: string;
    name?: string;
    phone?: string;
    address?: string;
    profile?: {
      name?: string;
      phone?: string;
      address?: string;
    };
  };
  profile?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  name?: string;
  phone?: string;
  address?: string;
}

function getProfileValues(payload: AuthMeResponse): ProfileFormValues {
  const nestedProfile = payload.profile || payload.user?.profile;

  return {
    email: payload.email || payload.user?.email || '',
    name: nestedProfile?.name || payload.name || payload.user?.name || '',
    phone: nestedProfile?.phone || payload.phone || payload.user?.phone || '',
    address: nestedProfile?.address || payload.address || payload.user?.address || '',
  };
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrio un error inesperado. Intenta nuevamente.';
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const errorData = (await response.json()) as { message?: string; detail?: string; error?: string };
    return errorData.message || errorData.detail || errorData.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AccountProfilePage() {
  const [formValues, setFormValues] = useState<ProfileFormValues>({
    email: '',
    name: '',
    phone: '',
    address: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

      if (!storedToken) {
        logout();
        return;
      }

      try {
        const response = await apiFetch('/auth/me', {
          method: 'GET',
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          const message = await parseApiError(response, 'No fue posible cargar el perfil.');
          throw new Error(message);
        }

        const profilePayload = (await response.json()) as AuthMeResponse;

        if (isMounted) {
          setFormValues(getProfileValues(profilePayload));
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getReadableErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      logout();
      return;
    }

    setIsSavingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetch('/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formValues.name.trim(),
          phone: formValues.phone.trim(),
          address: formValues.address.trim(),
        }),
      });

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        const message = await parseApiError(response, 'No fue posible actualizar el perfil.');
        throw new Error(message);
      }

      const updatedPayload = (await response.json()) as Partial<AuthMeResponse>;

      setFormValues((previousValues) => ({
        ...previousValues,
        name: updatedPayload.profile?.name || updatedPayload.name || previousValues.name,
        phone: updatedPayload.profile?.phone || updatedPayload.phone || previousValues.phone,
        address: updatedPayload.profile?.address || updatedPayload.address || previousValues.address,
      }));

      setSuccessMessage('Perfil actualizado correctamente.');
    } catch (error) {
      setErrorMessage(getReadableErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Gestion de cuenta</h2>
        <p className="text-sm text-slate-600">Actualiza tu informacion de contacto para mantener tu perfil al dia.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {isLoadingProfile ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner label="Cargando perfil..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formValues.email}
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                disabled={isSavingProfile}
                value={formValues.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Tu nombre"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Telefono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                disabled={isSavingProfile}
                value={formValues.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="+1 555 123 4567"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="address" className="text-sm font-medium text-slate-700">
                Direccion
              </label>
              <input
                id="address"
                name="address"
                type="text"
                autoComplete="street-address"
                disabled={isSavingProfile}
                value={formValues.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Direccion de contacto"
              />
            </div>

            {errorMessage ? (
              <Alert variant="error" title="Error al actualizar perfil">
                {errorMessage}
              </Alert>
            ) : null}

            {successMessage ? (
              <Alert variant="success" title="Cambios guardados">
                {successMessage}
              </Alert>
            ) : null}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingProfile ? 'Guardando cambios...' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
