import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'stage' | 'default';
  type?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ label, variant = 'default', type, size = 'md' }: BadgeProps) {
  const normalized = (type || label || '').toUpperCase().trim();

  // Mapeo semafórico para Estado
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_REVIEW':
      case 'EN_REVISION':
      case 'EN REVISIÓN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ACCEPTED':
      case 'ACEPTADO':
      case 'HIRED':
      case 'CONTRATADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED':
      case 'RECHAZADO':
      case 'DESCARTADO':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Mapeo visual para Etapa
  const getStageStyle = (stage: string) => {
    switch (stage) {
      case 'SCREENING':
      case 'CRIBA':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'INTERVIEW':
      case 'ENTREVISTA':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'TECHNICAL_TEST':
      case 'PRUEBA_TECNICA':
      case 'PRUEBA TÉCNICA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OFFER':
      case 'OFERTA':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'HIRED':
      case 'CONTRATADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const styleClass =
    variant === 'status'
      ? getStatusStyle(normalized)
      : variant === 'stage'
      ? getStageStyle(normalized)
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors font-medium ${sizeClass} ${styleClass}`}
    >
      {label}
    </span>
  );
}
