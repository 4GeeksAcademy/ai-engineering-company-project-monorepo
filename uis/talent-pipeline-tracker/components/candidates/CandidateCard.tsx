import type { Candidate } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StageBadge } from "@/components/ui/StageBadge";

export function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
    >
      <td className="px-4 py-3 text-sm font-medium text-white">
        {candidate.full_name}
      </td>
      <td className="px-4 py-3 text-sm text-slate-300">
        {candidate.position}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={candidate.status} />
      </td>
      <td className="px-4 py-3">
        <StageBadge stage={candidate.stage} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {new Date(candidate.applied_at).toLocaleDateString("es-ES")}
      </td>
    </tr>
  );
}
