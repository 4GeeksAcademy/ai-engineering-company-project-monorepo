import React from 'react';
import Link from 'next/link';
import { CandidateDetail } from '../types/candidate';
import {
  getCandidateName,
  getCandidatePosition,
  getCandidatePhone,
  getCandidateLinkedin,
  getCandidateCv,
  getCandidateExperience,
  getCandidateAppliedDate,
} from '../utils/candidateUtils';

interface CandidateDetailProps {
  candidate: CandidateDetail;
  onStatusChange: (newStatus: string) => Promise<void>;
  onStageChange: (newStage: string) => Promise<void>;
  updatingStatus?: boolean;
  updatingStage?: boolean;
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

export const CandidateDetailComponent: React.FC<CandidateDetailProps> = ({
  candidate,
  onStatusChange,
  onStageChange,
  updatingStatus = false,
  updatingStage = false,
}) => {
  const name = getCandidateName(candidate);
  const position = getCandidatePosition(candidate);
  const phone = getCandidatePhone(candidate);
  const linkedin = getCandidateLinkedin(candidate);
  const cv = getCandidateCv(candidate);
  const experience = getCandidateExperience(candidate);
  const appliedDate = getCandidateAppliedDate(candidate);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm mb-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {name}
            </h1>
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Editar
            </Link>
          </div>
          <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400 mt-1">
            {position}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fecha de Aplicación: {appliedDate}
          </p>
        </div>

        {/* Quick Action Selectors for Status and Stage */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Status Select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="candidate-status-select"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5"
            >
              Estado Actual
              {updatingStatus && (
                <span className="inline-block w-3 h-3 animate-spin border-2 border-indigo-600 border-t-transparent rounded-full" />
              )}
            </label>
            <select
              id="candidate-status-select"
              value={candidate.status || ''}
              disabled={updatingStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="candidate-stage-select"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5"
            >
              Etapa Actual
              {updatingStage && (
                <span className="inline-block w-3 h-3 animate-spin border-2 border-indigo-600 border-t-transparent rounded-full" />
              )}
            </label>
            <select
              id="candidate-stage-select"
              value={candidate.stage || ''}
              disabled={updatingStage}
              onChange={(e) => onStageChange(e.target.value)}
              className="py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {/* Email */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Correo Electrónico
          </span>
          <a
            href={`mailto:${candidate.email}`}
            className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{candidate.email}</span>
          </a>
        </div>

        {/* Phone */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Teléfono
          </span>
          <a
            href={phone !== 'No proporcionado' ? `tel:${phone}` : undefined}
            className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{phone}</span>
          </a>
        </div>

        {/* Experience */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Años de Experiencia
          </span>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{experience}</span>
          </p>
        </div>

        {/* LinkedIn */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Perfil de LinkedIn
          </span>
          {linkedin ? (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 truncate"
            >
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span>Ver perfil en LinkedIn</span>
            </a>
          ) : (
            <span className="text-sm text-slate-400">No especificado</span>
          )}
        </div>

        {/* CV Link */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Curriculum Vitae (CV)
          </span>
          {cv ? (
            <a
              href={cv}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 truncate"
            >
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Ver documento CV</span>
            </a>
          ) : (
            <span className="text-sm text-slate-400">No adjunto</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailComponent;
