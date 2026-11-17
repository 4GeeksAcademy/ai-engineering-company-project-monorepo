import Link from "next/link";
import type { Candidate } from "@/types";
import { getStatusColor, getStageColor } from "@/lib/colors";

interface StatusLabelMap {
  value: string;
  label: string;
}

interface CandidateRowProps {
  candidate: Candidate;
  statusOptions?: StatusLabelMap[];
  stageOptions?: StatusLabelMap[];
}

export function CandidateRow({
  candidate,
  statusOptions,
  stageOptions,
}: CandidateRowProps) {
  const statusLabel = statusOptions?.find((o) => o.value === candidate.status)?.label ?? candidate.status;
  const stageLabel = stageOptions?.find((o) => o.value === candidate.stage)?.label ?? candidate.stage;
  const sc = getStatusColor(candidate.status);
  const tgc = getStageColor(candidate.stage);

  return (
    <Link href={`/candidates/${candidate.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
          cursor: "pointer",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.boxShadow = "none")
        }
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            {candidate.full_name}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
            {candidate.position}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span
            className="badge"
            style={{ background: sc.bg, color: sc.text }}
          >
            {statusLabel}
          </span>
          <span
            className="badge"
            style={{ background: tgc.bg, color: tgc.text }}
          >
            {stageLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}