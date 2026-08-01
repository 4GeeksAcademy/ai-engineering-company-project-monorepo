'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { apiFetch, getSessionToken, logout } from '../../../services/authApi';

interface ProfileFormValues {
  email: string;
  name: string;
  phone: string;
  address: string;
}

interface AuthMeResponse {
  email?: string;
  profile?: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
}

interface ProfileUpdateResponse {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

function normalizeField(value: string | null | undefined): string {
  return value?.trim() || '';
}

function getProfileValues(payload: AuthMeResponse): ProfileFormValues {
  return {
    email: payload.email || '',
    name: normalizeField(payload.profile?.name),
    phone: normalizeField(payload.profile?.phone),
    address: normalizeField(payload.profile?.address),
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
  const [profileValues, setProfileValues] = useState<ProfileFormValues>({
    email: '',
    name: '',
    phone: '',
    address: '',
  });
  const [draftValues, setDraftValues] = useState<ProfileFormValues>({
    email: '',
    name: '',
    phone: '',
    address: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!getSessionToken()) {
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
          const message = await parseApiError(response, 'No fue posible cargar los datos de tu cuenta.');
          throw new Error(message);
        }

        const profilePayload = (await response.json()) as AuthMeResponse;
        const nextValues = getProfileValues(profilePayload);

        if (isMounted) {
          setProfileValues(nextValues);
          setDraftValues(nextValues);
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

  const hasUnsavedChanges = useMemo(() => {
    return (
      profileValues.name !== draftValues.name ||
      profileValues.phone !== draftValues.phone ||
      profileValues.address !== draftValues.address
    );
  }, [profileValues, draftValues]);

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setDraftValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEdit = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setDraftValues(profileValues);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftValues(profileValues);
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditing) {
      return;
    }

    if (!getSessionToken()) {
      logout();
      return;
    }

    setIsSavingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      name: draftValues.name.trim(),
      phone: draftValues.phone.trim(),
      address: draftValues.address.trim(),
    };

    try {
      const response = await apiFetch('/profiles/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        const message = await parseApiError(response, 'No fue posible actualizar tus datos de perfil.');
        throw new Error(message);
      }

      const updatedPayload = (await response.json()) as ProfileUpdateResponse;
      const updatedValues: ProfileFormValues = {
        email: profileValues.email,
        name: normalizeField(updatedPayload.name),
        phone: normalizeField(updatedPayload.phone),
        address: normalizeField(updatedPayload.address),
      };

      setProfileValues(updatedValues);
      setDraftValues(updatedValues);
      setIsEditing(false);
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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Gestion de usuario</h2>
        <p className="text-sm text-slate-600">
          Revisa y actualiza tus datos de contacto. El email y la contrasena no se editan desde esta vista.
        </p>
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
                value={profileValues.email}
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
                disabled={!isEditing || isSavingProfile}
                value={draftValues.name}
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
                disabled={!isEditing || isSavingProfile}
                value={draftValues.phone}
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
                disabled={!isEditing || isSavingProfile}
                value={draftValues.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Direccion de contacto"
              />
            </div>

            {errorMessage ? (
              <Alert variant="error" title="Error de perfil">
                {errorMessage}
              </Alert>
            ) : null}

            {successMessage ? (
              <Alert variant="success" title="Cambios guardados">
                {successMessage}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSavingProfile}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile || !hasUnsavedChanges}
                    className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800"
                >
                  Editar perfil
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
