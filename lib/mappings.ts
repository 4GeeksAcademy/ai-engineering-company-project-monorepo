import type { CandidateStage, CandidateStatus } from '../types/candidate';

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: 'Recibido',
  in_progress: 'En proceso',
  selected: 'Seleccionado',
  discarded: 'Descartado',
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: 'Pendiente',
  review: 'Revision',
  personal_interview: 'Entrevista personal',
  technical_interview: 'Entrevista tecnica',
  offer_presented: 'Oferta presentada',
};

export const getStatusLabel = (status: CandidateStatus): string =>
  STATUS_LABELS[status];

export const getStageLabel = (stage: CandidateStage): string => STAGE_LABELS[stage];
