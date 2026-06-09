import { getStageLabel } from '../../lib/mappings';
import type { CandidateStage } from '../../types/candidate';

interface StageBadgeProps {
  stage: CandidateStage;
}

const stageClasses: Record<CandidateStage, string> = {
  pending: 'bg-slate-100 text-slate-800 ring-slate-200',
  review: 'bg-indigo-100 text-indigo-900 ring-indigo-200',
  personal_interview: 'bg-cyan-100 text-cyan-900 ring-cyan-200',
  technical_interview: 'bg-violet-100 text-violet-900 ring-violet-200',
  offer_presented: 'bg-green-100 text-green-900 ring-green-200',
};

export function StageBadge({ stage }: StageBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stageClasses[stage]}`}
    >
      {getStageLabel(stage)}
    </span>
  );
}
