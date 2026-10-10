'use client';

import React, { useState } from 'react';
import { Candidate, CandidateStatus, CandidateStage, CreateCandidateInput, UpdateCandidateInput } from '@/types/candidate';

interface CandidateFormProps {
  initialData?: Candidate;
  onSubmit: (data: CreateCandidateInput | UpdateCandidateInput) => Promise<void>;
  submitLabel?: string;
  isEditing?: boolean;
}

export default function CandidateForm({
  initialData,
  onSubmit,
  submitLabel = 'Guardar Candidatura',
  isEditing = false,
}: CandidateFormProps) {
  const [name, setName] = useState<string>(initialData?.name || '');
  const [email, setEmail] = useState<string>(initialData?.email || '');
  const [phone, setPhone] = useState<string>(initialData?.phone || '');
  const [position, setPosition] = useState<string>(initialData?.position || '');
  const [linkedin, setLinkedin] = useState<string>(initialData?.linkedin || '');
  const [resumeUrl, setResumeUrl] = useState<string>(initialData?.resume_url || initialData?.resume || '');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(
    initialData?.years_of_experience !== undefined && initialData?.years_of_experience !== null
      ? String(initialData.years_of_experience)
      : ''
  );
  const [status, setStatus] = useState<CandidateStatus>(initialData?.status || 'PENDING');
  const [stage, setStage] = useState<CandidateStage>(initialData?.stage || 'SCREENING');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validaciones de campos obligatorios
    if (!name.trim()) {
      setValidationError('El nombre completo del candidato es obligatorio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!position.trim()) {
      setValidationError('El puesto al que postula es obligatorio.');
      return;
    }

    const payload: any = {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      position: position.trim(),
      linkedin: linkedin.trim() || undefined,
      resume_url: resumeUrl.trim() || undefined,
      experience_years: yearsOfExperience ? Number(yearsOfExperience) : undefined,
      status,
      stage,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el formulario.';
      setValidationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">
        {isEditing ? 'Editar Datos de Candidatura' : 'Registrar Nueva Candidatura'}
      </h2>

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg mb-6 flex items-center justify-between">
          <span>{validationError}</span>
          <button type="button" onClick={() => setValidationError(null)} className="text-rose-600 hover:text-rose-800 font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Nombre completo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre Completo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Ana Mendoza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Correo Electrónico */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Correo Electrónico <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="Ej: ana.mendoza@nexova.es"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Puesto al que aplica */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Puesto de Trabajo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Consultor de Selección Senior"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
          <input
            type="tel"
            placeholder="Ej: +34 612 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Enlace LinkedIn */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Enlace Perfil LinkedIn</label>
          <input
            type="url"
            placeholder="https://linkedin.com/in/candidato"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Enlace al CV */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">URL Documento CV</label>
          <input
            type="url"
            placeholder="https://drive.google.com/cv.pdf"
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Años de Experiencia */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Años de Experiencia</label>
          <input
            type="number"
            min="0"
            max="50"
            placeholder="Ej: 5"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Estado Inicial */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Candidatura</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateStatus)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="PENDING">PENDIENTE (PENDING)</option>
            <option value="IN_REVIEW">EN REVISIÓN (IN_REVIEW)</option>
            <option value="ACCEPTED">ACEPTADO (ACCEPTED)</option>
            <option value="REJECTED">RECHAZADO (REJECTED)</option>
          </select>
        </div>

        {/* Etapa Inicial */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Etapa del Proceso</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as CandidateStage)}
            disabled={submitting}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="SCREENING">CRIBA (SCREENING)</option>
            <option value="INTERVIEW">ENTREVISTA (INTERVIEW)</option>
            <option value="TECHNICAL_TEST">PRUEBA TÉCNICA (TECHNICAL_TEST)</option>
            <option value="OFFER">OFERTA (OFFER)</option>
            <option value="HIRED">CONTRATADO (HIRED)</option>
          </select>
        </div>
      </div>

      {/* Acciones del Formulario */}
      <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {submitting && (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
