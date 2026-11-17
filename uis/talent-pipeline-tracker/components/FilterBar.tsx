"use client";
import { getStatusColor, getStageColor } from "@/lib/colors";

interface FilterBarProps {
  status: string;
  stage: string;
  search: string;
  /** All possible status values for the dropdown */
  statusOptions: { value: string; label: string }[];
  /** All possible stage values for the dropdown */
  stageOptions: { value: string; label: string }[];
  onChange: (updates: { status?: string; stage?: string; search?: string }) => void;
  onClear: () => void;
}

export function FilterBar({
  status,
  stage,
  search,
  statusOptions,
  stageOptions,
  onChange,
  onClear,
}: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "flex-end",
        marginBottom: "1.5rem",
      }}
    >
      {/* Status filter */}
      <div style={{ flex: "1 1 160px" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
            color: "#64748b",
          }}
        >
          Status
        </label>
        <select
          className="select"
          value={status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">All</option>
          {statusOptions.map((opt) => {
            const c = getStatusColor(opt.value);
            return (
              <option key={opt.value} value={opt.value} style={{ background: c.bg, color: c.text }}>
                {opt.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Stage filter */}
      <div style={{ flex: "1 1 160px" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
            color: "#64748b",
          }}
        >
          Stage
        </label>
        <select
          className="select"
          value={stage}
          onChange={(e) => onChange({ stage: e.target.value })}
        >
          <option value="">All</option>
          {stageOptions.map((opt) => {
            const c = getStageColor(opt.value);
            return (
              <option key={opt.value} value={opt.value} style={{ background: c.bg, color: c.text }}>
                {opt.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Search */}
      <div style={{ flex: "1 1 200px" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
            color: "#64748b",
          }}
        >
          Search (name / email)
        </label>
        <input
          className="input"
          type="text"
          placeholder="Type to filter…"
          value={search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      {/* Clear */}
      <div>
        <button
          className="btn btn-secondary"
          onClick={onClear}
          disabled={!status && !stage && !search}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}