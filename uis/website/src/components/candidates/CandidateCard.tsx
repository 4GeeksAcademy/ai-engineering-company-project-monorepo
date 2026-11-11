import React from 'react';
import Link from 'next/link';
import { Candidate } from '@/types/candidate';
import Badge from '@/components/ui/Badge';

interface CandidateCardProps {
  candidate: Candidate;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const score = candidate.score_ia ?? 0;

  const scoreConfig =
    score >= 80
      ? {
          border: 'border-emerald-400/35',
          pillBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
        }
      : score >= 60
      ? {
          border: 'border-amber-300/35',
          pillBg: 'bg-amber-400/15 text-amber-300 border-amber-300/25',
          dot: 'bg-amber-300 shadow-[0_0_6px_#fde68a]',
        }
      : {
          border: 'border-slate-600/80',
          pillBg: 'bg-slate-700/40 text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
        };

  return (
    <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-400/40 transition-all overflow-hidden">
      <div>
        {/* Fila superior: ID a la izquierda + Telemetry Chip de Score IA a la derecha (sin desbordes) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono font-semibold text-white/60">
            ID #{candidate.id}
          </span>

          <div
            className={`inline-flex items-center rounded-lg border ${scoreConfig.border} bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0`}
          >
            <span
              className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${scoreConfig.pillBg}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${scoreConfig.dot}`} />
              SCORE IA
            </span>
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wide text-white">
              {score}/100
            </span>
          </div>
        </div>

        {/* Nombre del candidato en 1 sola línea + Puesto debajo en blanco */}
        <header className="mb-4">
          <h3 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate hover:text-emerald-300 transition-colors">
            <Link href={`/scoring/candidates/${candidate.id}`}>{candidate.name}</Link>
          </h3>
          <p className="text-xs font-semibold text-white mt-1 whitespace-nowrap truncate">
            {candidate.position}
          </p>
        </header>

        {/* Fila dedicada para las etiquetas de Estado y Etapa (con flex-wrap dentro de la tarjeta) */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge label={candidate.status} variant="status" size="sm" />
          <Badge label={candidate.stage} variant="stage" size="sm" />
        </div>

        {/* Datos estructurados estilo Panel Overview */}
        <ul className="space-y-2.5 text-xs border-t border-slate-800/80 pt-4">
          <li className="flex items-center justify-between gap-3">
            <span className="text-white/80 shrink-0">Correo</span>
            <span className="font-semibold text-white truncate text-right" title={candidate.email}>
              {candidate.email}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-white/80 shrink-0">Experiencia</span>
            <strong className="font-bold text-amber-200">
              {candidate.years_of_experience !== undefined && candidate.years_of_experience !== null
                ? `${candidate.years_of_experience} años`
                : 'No esp.'}
            </strong>
          </li>
        </ul>
      </div>

      {/* Footer Action: Botón Ganador Executive Command Pill */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <Link
          href={`/scoring/candidates/${candidate.id}`}
          className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
            <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
              Ver Expediente
            </span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
            <span>ABRIR</span>
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </span>
        </Link>
      </div>
    </article>
  );
}
