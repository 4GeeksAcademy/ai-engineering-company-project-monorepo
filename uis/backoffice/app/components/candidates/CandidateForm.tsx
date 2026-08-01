'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../ui/Alert';
import { createCandidate, updateCandidate } from '../../../services/candidatesApi';
import type { Candidate, CandidatePayload } from '../../../types/candidate';

interface CandidateFormProps {
  mode: 'create' | 'edit';
  candidateId?: string;
  initialData?: Candidate;
}

interface CandidateFormState {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
}

function mapCandidateToForm(candidate?: Candidate): CandidateFormState {
  return {
    full_name: candidate?.full_name ?? '',
    email: candidate?.email ?? '',
    phone: candidate?.phone ?? '',
    position: candidate?.position ?? 'Asistente de Direccion',
    linkedin_url: candidate?.linkedin_url ?? '',
    cv_url: candidate?.cv_url ?? '',
    experience_years:
      typeof candidate?.experience_years === 'number' ? String(candidate.experience_years) : '',
  };
}

export function CandidateForm({ mode, candidateId, initialData }: CandidateFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<CandidateFormState>(() => mapCandidateToForm(initialData));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return mode === 'create' ? 'Creando...' : 'Guardando...';
    }

    return mode === 'create' ? 'Crear candidato' : 'Guardar cambios';
  }, [isSubmitting, mode]);

  const handleChange = (field: keyof CandidateFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validatePayload = (): CandidatePayload | null => {
    const full_name = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const position = form.position.trim() || 'Asistente de Direccion';
    const linkedin_url = form.linkedin_url.trim();
    const cv_url = form.cv_url.trim();
    const experience_years_raw = form.experience_years.trim();

    if (
      !full_name ||
      !email ||
      !phone ||
      !position ||
      !linkedin_url ||
      !cv_url ||
      !experience_years_raw
    ) {
      setError('Todos los campos son obligatorios.');
      return null;
    }

    const experience_years = Number(experience_years_raw);
    if (!Number.isFinite(experience_years) || Number.isNaN(experience_years)) {
      setError('Anios de experiencia debe ser un numero valido.');
      return null;
    }

    if (experience_years < 0) {
      setError('Anios de experiencia no puede ser negativo.');
      return null;
    }

    return {
      full_name,
      email,
      phone,
      position,
      linkedin_url,
      cv_url,
      experience_years,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = validatePayload();
    if (!payload) {
      return;
    }

    if (mode === 'edit' && !candidateId) {
      setError('No se puede editar: falta el identificador del candidato.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const created = await createCandidate(payload);
        setSuccess('Candidato creado correctamente.');
        router.push(`/candidaturas/${created.id}`);
        router.refresh();
      } else {
        await updateCandidate(candidateId as string, payload);
        setSuccess('Candidato actualizado correctamente.');
        router.push(`/candidaturas/${candidateId}`);
        router.refresh();
      }
    } catch (submitError) {
      setError((submitError as Error).message || 'Ocurrio un error al guardar el candidato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      {success ? <Alert variant="success">{success}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
              Nombre completo
            </label>
            <input
              id="full_name"
              type="text"
              value={form.full_name}
              onChange={(event) => handleChange('full_name', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Telefono
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="position" className="text-sm font-medium text-slate-700">
              Puesto
            </label>
            <input
              id="position"
              type="text"
              value={form.position}
              onChange={(event) => handleChange('position', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="experience_years" className="text-sm font-medium text-slate-700">
              Anios de experiencia
            </label>
            <input
              id="experience_years"
              type="number"
              min="0"
              step="1"
              value={form.experience_years}
              onChange={(event) => handleChange('experience_years', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="linkedin_url" className="text-sm font-medium text-slate-700">
              URL de LinkedIn
            </label>
            <input
              id="linkedin_url"
              type="url"
              value={form.linkedin_url}
              onChange={(event) => handleChange('linkedin_url', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="cv_url" className="text-sm font-medium text-slate-700">
              URL del CV
            </label>
            <input
              id="cv_url"
              type="url"
              value={form.cv_url}
              onChange={(event) => handleChange('cv_url', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
