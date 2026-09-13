import React, { useState } from 'react';
import { Candidate } from '../types/candidate';
import {
  getCandidateName,
  getCandidatePosition,
  getCandidatePhone,
  getCandidateLinkedin,
  getCandidateCv,
} from '../utils/candidateUtils';

interface CandidateFormProps {
  initialData?: Candidate | null;
  onSubmit: (formData: Partial<Candidate>) => Promise<void>;
  isEditing?: boolean;
  onCancel?: () => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  position?: string;
  years_of_experience?: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'on_hold', label: 'En Espera' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

const STAGE_OPTIONS = [
  { value: 'applied', label: 'Aplicado' },
  { value: 'screening', label: 'Filtro Inicial' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'technical_test', label: 'Prueba Técnica' },
  { value: 'offer', label: 'Oferta' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

export const CandidateForm: React.FC<CandidateFormProps> = ({
  initialData,
  onSubmit,
  isEditing = false,
  onCancel,
}) => {
  const [name, setName] = useState<string>(
    initialData ? getCandidateName(initialData) : ''
  );
  const [email, setEmail] = useState<string>(initialData?.email || '');
  const [phone, setPhone] = useState<string>(
    initialData ? getCandidatePhone(initialData) : ''
  );
  const [position, setPosition] = useState<string>(
    initialData ? getCandidatePosition(initialData) : ''
  );
  const [linkedin, setLinkedin] = useState<string>(
    initialData ? getCandidateLinkedin(initialData) || '' : ''
  );
  const [cvUrl, setCvUrl] = useState<string>(
    initialData ? getCandidateCv(initialData) || '' : ''
  );
  const [yearsOfExperience, setYearsOfExperience] = useState<number | string>(
    initialData?.years_of_experience ??
      initialData?.yearsOfExperience ??
      initialData?.experience ??
      0
  );
  const [status, setStatus] = useState<string>(
    initialData?.status || 'active'
  );
  const [stage, setStage] = useState<string>(initialData?.stage || 'applied');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Introduce un correo electrónico válido.';
    }

    if (!position.trim()) {
      newErrors.position = 'El puesto es obligatorio.';
    }

    const expNumber = Number(yearsOfExperience);
    if (isNaN(expNumber) || expNumber < 0) {
      newErrors.years_of_experience =
        'Los años de experiencia deben ser un número mayor o igual a 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    const formData: Partial<Candidate> = {
      name: name.trim(),
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      phone_number: phone.trim(),
      position: position.trim(),
      job_title: position.trim(),
      linkedin: linkedin.trim(),
      linkedin_url: linkedin.trim(),
      cv: cvUrl.trim(),
      cv_url: cvUrl.trim(),
      years_of_experience: Number(yearsOfExperience) || 0,
      status,
      stage,
    };

    try {
      await onSubmit(formData);
    } catch (err) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Ocurrió un error al guardar la candidatura.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm"
    >
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        {isEditing ? 'Editar Candidatura' : 'Crear Nueva Candidatura'}
      </h2>

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre completo */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Nombre Completo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Ej. María García"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Correo Electrónico <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email)
                setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="maria.garcia@example.com"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Puesto */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Puesto / Cargo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              if (errors.position)
                setErrors((prev) => ({ ...prev, position: undefined }));
            }}
            placeholder="Ej. Senior Frontend Engineer"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {errors.position && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errors.position}
            </p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Teléfono
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
        </div>

        {/* LinkedIn URL */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            URL de LinkedIn
          </label>
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/usuario"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
        </div>

        {/* CV URL */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            URL del CV
          </label>
          <input
            type="url"
            value={cvUrl}
            onChange={(e) => setCvUrl(e.target.value)}
            placeholder="https://example.com/cv.pdf"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
        </div>

        {/* Años de experiencia */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Años de Experiencia
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={yearsOfExperience}
            onChange={(e) => {
              setYearsOfExperience(e.target.value);
              if (errors.years_of_experience)
                setErrors((prev) => ({ ...prev, years_of_experience: undefined }));
            }}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {errors.years_of_experience && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errors.years_of_experience}
            </p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Etapa */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Etapa del Proceso
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isEditing ? 'Guardando cambios...' : 'Creando candidatura...'}
            </>
          ) : isEditing ? (
            'Guardar Cambios'
          ) : (
            'Crear Candidatura'
          )}
        </button>
      </div>
    </form>
  );
};

export default CandidateForm;
