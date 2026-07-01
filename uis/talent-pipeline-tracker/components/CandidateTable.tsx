import Link from "next/link";
import StageBadge from "@/components/StageBadge";
import StatusBadge from "@/components/StatusBadge";
import type { RecordOut } from "@/types";

function CandidateRow({ candidate }: { candidate: RecordOut }) {
  return (
    <tr className="border-b border-stone-100 transition hover:bg-orange-50/40">
      <td className="px-4 py-3">
        <Link
          href={`/candidates/${candidate.id}`}
          className="font-medium text-stone-900 hover:text-orange-700"
        >
          {candidate.full_name}
        </Link>
        <p className="text-xs text-stone-500">{candidate.email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">{candidate.position}</td>
      <td className="px-4 py-3">
        <StatusBadge status={candidate.status} />
      </td>
      <td className="px-4 py-3">
        <StageBadge stage={candidate.stage} />
      </td>
    </tr>
  );
}

export default function CandidateTable({
  candidates,
}: {
  candidates: RecordOut[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Candidato/a</th>
              <th className="px-4 py-3 font-semibold">Puesto</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Etapa</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
