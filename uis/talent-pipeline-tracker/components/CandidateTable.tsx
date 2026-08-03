import Link from "next/link";
import { STAGE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { CandidateRecord } from "@/types/records";

interface CandidateTableProps {
  records: CandidateRecord[];
}

export function CandidateTable({ records }: CandidateTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        No candidates match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 text-left text-sm text-slate-700">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Position</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{record.full_name}</div>
                <div className="text-slate-600">{record.email}</div>
              </td>
              <td className="px-4 py-3 text-slate-700">{record.position}</td>
              <td className="px-4 py-3 text-slate-700">{STATUS_LABELS[record.status]}</td>
              <td className="px-4 py-3 text-slate-700">{STAGE_LABELS[record.stage]}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/candidates/${record.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-800 hover:bg-slate-100"
                >
                  Open detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
