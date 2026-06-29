import type { CandidateStage } from "@/lib/types";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";

export function StageBadge({ stage }: { stage: CandidateStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
