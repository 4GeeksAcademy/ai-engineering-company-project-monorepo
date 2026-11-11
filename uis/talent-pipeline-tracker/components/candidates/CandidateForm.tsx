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

    const payload: CreateCandidateInput | UpdateCandidateInput = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      position: position.trim(),
      linkedin: linkedin.trim() || undefined,
      resume_url: resumeUrl.trim() || undefined,
      years_of_experience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
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

  const inputClass =
    'w-full bg-[#181f2c]/90 border border-emerald-500/25 text-white placeholder-emerald-200/30 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50 transition-all';

  return (
    <form onSubmit={handleSubmit} className="bg-[#121721]/80 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-6 pb-3 border-b border-emerald-500/15">
        {isEditing ? 'Editar Datos de Candidatura' : 'Registrar Nueva Candidatura'}
      </h2>

      {validationError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs rounded-xl mb-6 flex items-center justify-between">
          <span>{validationError}</span>
          <button type="button" onClick={() => setValidationError(null)} className="text-rose-300 hover:text-white font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Nombre completo */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">
            Nombre Completo <span className="text-amber-300">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Ana Mendoza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Correo Electrónico */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">
            Correo Electrónico <span className="text-amber-300">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="Ej: ana.mendoza@nexova.es"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Puesto al que aplica */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">
            Puesto de Trabajo <span className="text-amber-300">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Consultor de Selección Senior"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">Teléfono de Contacto</label>
          <input
            type="tel"
            placeholder="Ej: +34 612 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Enlace LinkedIn */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">Enlace Perfil LinkedIn</label>
          <input
            type="url"
            placeholder="https://linkedin.com/in/candidato"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Enlace al CV */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">URL Documento CV</label>
          <input
            type="url"
            placeholder="https://drive.google.com/cv.pdf"
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Años de Experiencia */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">Años de Experiencia</label>
          <input
            type="number"
            min="0"
            max="50"
            placeholder="Ej: 5"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        {/* Estado Inicial */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">Estado de Candidatura</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateStatus)}
            disabled={submitting}
            className={inputClass}
          >
            <option value="PENDING">PENDIENTE (PENDING)</option>
            <option value="IN_REVIEW">EN REVISIÓN (IN_REVIEW)</option>
            <option value="ACCEPTED">ACEPTADO (ACCEPTED)</option>
            <option value="REJECTED">RECHAZADO (REJECTED)</option>
          </select>
        </div>

        {/* Etapa Inicial */}
        <div>
          <label className="block text-xs font-bold text-emerald-100/80 mb-1.5">Etapa del Proceso</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as CandidateStage)}
            disabled={submitting}
            className={inputClass}
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
      <div className="flex items-center justify-end space-x-3 border-t border-emerald-500/15 pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all disabled:opacity-50"
        >
          {submitting && (
            <div className="w-3.5 h-3.5 border-2 border-[#0a0d12] border-t-transparent rounded-full animate-spin mr-2" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
