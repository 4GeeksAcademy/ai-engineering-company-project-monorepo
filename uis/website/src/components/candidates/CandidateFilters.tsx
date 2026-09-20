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

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Campo de búsqueda por Nombre o Email */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
            placeholder="Buscar por candidato o email..."
            value={currentQuery}
            onChange={(e) => updateParam('query', e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filtros por Estado y Etapa */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro Estado */}
          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2 font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING">PENDIENTE</option>
              <option value="IN_REVIEW">EN REVISIÓN</option>
              <option value="ACCEPTED">ACEPTADO / CONTRATADO</option>
              <option value="REJECTED">RECHAZADO</option>
            </select>
          </div>

          {/* Filtro Etapa */}
          <div>
            <select
              value={currentStage}
              onChange={(e) => updateParam('stage', e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2 font-medium"
            >
              <option value="ALL">Todas las Etapas</option>
              <option value="SCREENING">CRIBA (SCREENING)</option>
              <option value="INTERVIEW">ENTREVISTA</option>
              <option value="TECHNICAL_TEST">PRUEBA TÉCNICA</option>
              <option value="OFFER">OFERTA</option>
              <option value="HIRED">CONTRATADO</option>
            </select>
          </div>

          {/* Botón de Limpiar */}
          {(currentQuery || currentStatus !== 'ALL' || currentStage !== 'ALL') && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              Limpiar Filtros
            </button>
          )}

          {isPending && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
