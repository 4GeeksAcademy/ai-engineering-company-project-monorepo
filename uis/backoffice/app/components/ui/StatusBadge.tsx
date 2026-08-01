import { getStatusLabel } from '../../../lib/candidatesMappings';
import type { CandidateStatus } from '../../../types/candidate';

interface StatusBadgeProps {
  status: CandidateStatus;
}

const statusClasses: Record<CandidateStatus, string> = {
  received: 'bg-sky-100 text-sky-800 ring-sky-200',
  in_progress: 'bg-amber-100 text-amber-900 ring-amber-200',
  selected: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  discarded: 'bg-rose-100 text-rose-900 ring-rose-200',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
