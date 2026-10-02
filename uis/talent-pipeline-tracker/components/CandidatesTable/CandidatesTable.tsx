import Link from "next/link";
import Badge from "../Badge";
import {
  STATUS_LABELS,
  STATUS_SHORT,
  STATUS_STYLES,
  STAGE_LABELS,
  STAGE_SHORT,
  STAGE_STYLES,
} from "@/lib/candidate-meta";
import { formatDate, formatYears } from "@/lib/format";
import type { Candidate } from "@/lib/types";

export default function CandidatesTable({
  candidates,
}: {
  candidates: Candidate[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Experience</th>
              <th className="px-4 py-3 font-medium">Applied</th>
              <th className="px-4 py-3 text-right font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {candidates.map((candidate) => (
              <tr
                key={candidate.id}
                className="relative transition-colors hover:bg-zinc-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/candidates/${candidate.id}`}
                    className="absolute inset-0"
                    aria-label={`View ${candidate.full_name}`}
                  />
                  <div className="font-medium text-zinc-900">
                    {candidate.full_name}
                  </div>
                  <a
                    href={`mailto:${candidate.email}`}
                    className="relative text-xs text-zinc-500 hover:text-zinc-700 hover:underline"
                  >
                    {candidate.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {candidate.position}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={STATUS_LABELS[candidate.status]}
                    shortLabel={STATUS_SHORT[candidate.status]}
                    className={STATUS_STYLES[candidate.status]}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={STAGE_LABELS[candidate.stage]}
                    shortLabel={STAGE_SHORT[candidate.stage]}
                    className={STAGE_STYLES[candidate.stage]}
                  />
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatYears(candidate.experience_years)}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatDate(candidate.applied_at)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700">
                  {candidate.notes_count}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/candidates/${candidate.id}/edit`}
                    aria-label={`Edit ${candidate.full_name}`}
                    className="relative z-10 inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}