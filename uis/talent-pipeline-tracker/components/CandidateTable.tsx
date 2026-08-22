import Link from "next/link";
import { Candidate, STATUS_LABELS, STAGE_LABELS } from "@/types/candidate";

export default function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  if (candidates.length === 0) {
    return <p className="py-8 text-slate-500">No candidates match these filters.</p>;
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">Position</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Stage</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c) => (
          <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4">
              <Link href={`/candidates/${c.id}`} className="font-medium text-brand hover:underline">
                {c.full_name}
              </Link>
            </td>
            <td className="py-2 pr-4">{c.position}</td>
            <td className="py-2 pr-4">{STATUS_LABELS[c.status]}</td>
            <td className="py-2 pr-4">{STAGE_LABELS[c.stage]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
