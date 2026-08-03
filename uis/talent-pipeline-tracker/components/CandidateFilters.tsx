import { STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/labels";

interface CandidateFiltersProps {
  search: string;
  status: string;
  stage: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStageChange: (value: string) => void;
}

export function CandidateFilters({
  search,
  status,
  stage,
  onSearchChange,
  onStatusChange,
  onStageChange,
}: CandidateFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          Search by name or email
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Type a name or email"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Filter by status
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Filter by stage
          <select
            value={stage}
            onChange={(event) => onStageChange(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All stages</option>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
