'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function CandidateFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('query') || '';
  const currentStatus = searchParams.get('status') || 'ALL';
  const currentStage = searchParams.get('stage') || 'ALL';
  const currentSort = searchParams.get('sort') || 'score_desc';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL' && value.trim() !== '') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const toggleScoreSort = () => {
    const nextSort = currentSort === 'score_desc' ? 'score_asc' : 'score_desc';
    updateParam('sort', nextSort);
  };

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="bg-[#121721]/90 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-4 mb-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Campo de búsqueda por Nombre o Email */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por candidato, puesto o email..."
            value={currentQuery}
            onChange={(e) => updateParam('query', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0d12] border border-slate-700/80 text-white placeholder-slate-400 text-xs rounded-xl focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Filtros por Estado, Etapa y Ordenamiento por Score IA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Táctico para alternar Orden de Score IA (Mayor a Menor / Menor a Mayor) */}
          <button
            type="button"
            onClick={toggleScoreSort}
            className="group relative inline-flex items-center justify-between gap-2.5 rounded-xl border border-amber-300/35 bg-[#0d121a] p-1.5 pl-3 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/70 hover:bg-[#141c28] cursor-pointer"
            title="Cambiar orden de puntuación Score IA"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a]" />
              <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap">
                {currentSort === 'score_asc' ? 'Score IA: Menor a Mayor' : 'Score IA: Mayor a Menor'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
              <span>{currentSort === 'score_asc' ? 'ASC ↑' : 'DESC ↓'}</span>
            </span>
          </button>

          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-[#0a0d12] border border-slate-700/80 text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none px-3 py-2.5 font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING">PENDIENTE</option>
              <option value="IN_REVIEW">EN REVISIÓN</option>
              <option value="ACCEPTED">ACEPTADO / CONTRATADO</option>
              <option value="REJECTED">RECHAZADO</option>
            </select>
          </div>

          <div>
            <select
              value={currentStage}
              onChange={(e) => updateParam('stage', e.target.value)}
              className="bg-[#0a0d12] border border-slate-700/80 text-white text-xs rounded-xl focus:border-emerald-400 focus:outline-none px-3 py-2.5 font-medium"
            >
              <option value="ALL">Todas las Etapas</option>
              <option value="SCREENING">CRIBA (SCREENING)</option>
              <option value="INTERVIEW">ENTREVISTA</option>
              <option value="TECHNICAL_TEST">PRUEBA TÉCNICA</option>
              <option value="OFFER">OFERTA</option>
              <option value="HIRED">CONTRATADO</option>
            </select>
          </div>

          {(currentQuery || currentStatus !== 'ALL' || currentStage !== 'ALL' || currentSort !== 'score_desc') && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}

          {isPending && (
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
