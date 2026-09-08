import React from 'react';
import Link from 'next/link';
import { Candidate } from '@/types/candidate';
import Badge from '@/components/ui/Badge';

interface CandidateCardProps {
  candidate: Candidate;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
      <div>
        {/* Header: Name and Badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors">
              <Link href={`/candidates/${candidate.id}`}>{candidate.name}</Link>
            </h3>
            <p className="text-xs font-semibold text-blue-600 mt-0.5">{candidate.position}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className={`px-2 py-1 rounded-md border text-xs font-bold ${
              !candidate.score_ia ? 'bg-slate-50 text-slate-500 border-slate-200' :
              candidate.score_ia >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              candidate.score_ia >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              Score IA: {candidate.score_ia || 0}/100
            </div>
            <div className="flex gap-1.5">
              <Badge label={candidate.status} variant="status" size="sm" />
              <Badge label={candidate.stage} variant="stage" size="sm" />
            </div>
          </div>
        </div>

        {/* Metadata: Email, Experience */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-4 border-t border-slate-100 pt-3">
          <div className="flex items-center text-slate-600">
            <svg className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{candidate.email}</span>
          </div>

          {candidate.years_of_experience !== undefined && candidate.years_of_experience !== null && (
            <div className="flex items-center text-slate-600">
              <svg className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{candidate.years_of_experience} años de experiencia</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">ID: #{candidate.id}</span>
        <Link
          href={`/candidates/${candidate.id}`}
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Ver Detalle
          <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
