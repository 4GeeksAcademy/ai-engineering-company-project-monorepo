import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'stage' | 'default';
  type?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ label, variant = 'default', type, size = 'md' }: BadgeProps) {
  const normalized = (type || label || '').toUpperCase().trim();

  // Configuración del Telemetry Chip ganador (prefijo + colores LED)
  const getChipConfig = (val: string) => {
    switch (val) {
      case 'PENDING':
      case 'PENDIENTE':
      case 'TECHNICAL_TEST':
      case 'PRUEBA_TECNICA':
      case 'PRUEBA TÉCNICA':
        return {
          prefix: variant === 'stage' ? 'STAGE' : 'STATUS',
          border: 'border-amber-300/35',
          pillBg: 'bg-amber-400/15 text-amber-300 border-amber-300/25',
          dot: 'bg-amber-300 shadow-[0_0_6px_#fde68a]',
        };
      case 'IN_REVIEW':
      case 'EN_REVISION':
      case 'EN REVISIÓN':
      case 'INTERVIEW':
      case 'ENTREVISTA':
      case 'SCREENING':
      case 'CRIBA':
        return {
          prefix: variant === 'stage' ? 'STAGE' : 'STATUS',
          border: 'border-sky-400/35',
          pillBg: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
          dot: 'bg-sky-400 shadow-[0_0_6px_#38bdf8]',
        };
      case 'ACCEPTED':
      case 'ACEPTADO':
      case 'HIRED':
      case 'CONTRATADO':
      case 'OFFER':
      case 'OFERTA':
        return {
          prefix: variant === 'stage' ? 'STAGE' : 'STATUS',
          border: 'border-emerald-400/35',
          pillBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
        };
      case 'REJECTED':
      case 'RECHAZADO':
      case 'DESCARTADO':
        return {
          prefix: 'STATUS',
          border: 'border-rose-400/35',
          pillBg: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
          dot: 'bg-rose-400 shadow-[0_0_6px_#fb7185]',
        };
      default:
        return {
          prefix: 'TAG',
          border: 'border-emerald-400/30',
          pillBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
        };
    }
  };

  const cfg = getChipConfig(normalized);
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <span
      className={`inline-flex items-center rounded-lg border ${cfg.border} bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0`}
    >
      <span
        className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${cfg.pillBg}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.prefix}
      </span>
      <span className={`px-2 py-0.5 ${textSize} font-semibold tracking-wide text-white whitespace-nowrap`}>
        {label}
      </span>
    </span>
  );
}
