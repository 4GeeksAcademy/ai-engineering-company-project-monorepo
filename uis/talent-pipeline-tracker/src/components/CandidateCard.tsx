import React from 'react';
import Link from 'next/link';
import { Candidate } from '../types/candidate';
import {
  getCandidateName,
  getCandidatePosition,
} from '../utils/candidateUtils';

interface CandidateCardProps {
  candidate: Candidate;
}

const getStatusBadge = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'active':
      return {
        label: 'Activo',
        className:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'hired':
      return {
        label: 'Contratado',
        className:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    case 'rejected':
      return {
        label: 'Descartado',
        className:
          'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      };
    case 'on_hold':
      return {
        label: 'En Espera',
        className:
          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    default:
      return {
        label: status || 'Desconocido',
        className:
          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
  }
};

const getStageBadge = (stage: string) => {
  const normalized = (stage || '').toLowerCase();
  switch (normalized) {
    case 'applied':
      return {
        label: 'Aplicado',
        className:
          'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      };
    case 'screening':
      return {
        label: 'Filtro Inicial',
        className:
          'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      };
    case 'interview':
      return {
        label: 'Entrevista',
        className:
          'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      };
    case 'technical_test':
      return {
        label: 'Prueba Técnica',
        className:
          'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
      };
    case 'offer':
      return {
        label: 'Oferta',
        className:
          'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      };
    case 'hired':
      return {
        label: 'Contratado',
        className:
          'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      };
    case 'rejected':
      return {
        label: 'Descartado',
        className:
          'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    default:
      return {
        label: stage || 'Sin etapa',
        className:
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
  }
};

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const name = getCandidateName(candidate);
  const position = getCandidatePosition(candidate);
  const statusBadge = getStatusBadge(candidate.status);
  const stageBadge = getStageBadge(candidate.stage);

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {name}
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              {position}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-2">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs">Etapa:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${stageBadge.className}`}
            >
              {stageBadge.label}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
        <Link
          href={`/candidates/${candidate.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          Ver Perfil Completo
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default CandidateCard;
