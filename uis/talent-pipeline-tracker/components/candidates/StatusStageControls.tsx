'use client';

import React, { useState } from 'react';
import { CandidateStatus, CandidateStage } from '@/types/candidate';
import { patchCandidateStatusStage } from '@/services/api';
import Badge from '@/components/ui/Badge';

interface StatusStageControlsProps {
  candidateId: number | string;
  initialStatus: CandidateStatus;
  initialStage: CandidateStage;
  onUpdate?: (newStatus: CandidateStatus, newStage: CandidateStage) => void;
}

export default function StatusStageControls({
  candidateId,
  initialStatus,
  initialStage,
  onUpdate,
}: StatusStageControlsProps) {
  const [status, setStatus] = useState<CandidateStatus>(initialStatus);
  const [stage, setStage] = useState<CandidateStage>(initialStage);
  const [updating, setUpdating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleStatusChange = async (newStatus: CandidateStatus) => {
    if (newStatus === status) return;
    setUpdating(true);
    setFeedback(null);
    try {
      await patchCandidateStatusStage(candidateId, { status: newStatus, stage });
      setStatus(newStatus);
      setFeedback({ type: 'success', message: 'Estado actualizado correctamente' });
      if (onUpdate) onUpdate(newStatus, stage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el estado.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setUpdating(false);
    }
  };

  const handleStageChange = async (newStage: CandidateStage) => {
    if (newStage === stage) return;
    setUpdating(true);
    setFeedback(null);
    try {
      await patchCandidateStatusStage(candidateId, { status, stage: newStage });
      setStage(newStage);
      setFeedback({ type: 'success', message: 'Etapa actualizada correctamente' });
      if (onUpdate) onUpdate(status, newStage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la etapa.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Control de Estado y Etapa (PATCH)
        </h3>
        {updating && (
          <div className="flex items-center text-xs font-semibold text-blue-600">
            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1.5" />
            Actualizando...
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold mb-4 flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cambiar Estado */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Estado Actual:</span>
            <Badge label={status} variant="status" size="sm" />
          </label>
          <select
            disabled={updating}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as CandidateStatus)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="PENDING">PENDIENTE (PENDING)</option>
            <option value="IN_REVIEW">EN REVISIÓN (IN_REVIEW)</option>
            <option value="ACCEPTED">ACEPTADO (ACCEPTED)</option>
            <option value="REJECTED">RECHAZADO (REJECTED)</option>
          </select>
        </div>

        {/* Cambiar Etapa */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Etapa Actual:</span>
            <Badge label={stage} variant="stage" size="sm" />
          </label>
          <select
            disabled={updating}
            value={stage}
            onChange={(e) => handleStageChange(e.target.value as CandidateStage)}
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
    </div>
  );
}
