import Link from "next/link";
import { toStageLabel, toStatusLabel } from "@/lib/labels";
import type { CandidateRecord } from "@/types/candidate";

interface CandidateTableProps {
  candidates: CandidateRecord[];
}

function fullNameFromRecord(candidate: CandidateRecord): string {
  if (candidate.full_name) {
    return candidate.full_name;
  }

  const combinedName = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim();
  return combinedName || "Unnamed candidate";
}

export function CandidateTable({ candidates }: CandidateTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Position
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-800">
                  <p className="font-medium">{fullNameFromRecord(candidate)}</p>
                  <p className="text-slate-500">{candidate.email ?? "-"}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{candidate.position ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{toStatusLabel(candidate.status)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{toStageLabel(candidate.stage)}</td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/candidates/${candidate.id}`}
                    className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2"
                  >
                    Open profile
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
