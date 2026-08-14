/**
 * IncidentStatusBadge — Displays an incident's status with color coding
 */
import type { IncidentStatus } from '../../types/incidents';
import { STATUS_LABELS } from '../../types/incidents';

const STATUS_COLORS: Record<IncidentStatus, { bg: string; fg: string }> = {
  open: { bg: 'rgba(255, 189, 89, 0.15)', fg: '#ffbd59' },
  in_progress: { bg: 'rgba(88, 211, 143, 0.15)', fg: '#58d38f' },
  resolved: { bg: 'rgba(120, 160, 255, 0.15)', fg: '#78a0ff' },
  discarded: { bg: 'rgba(166, 181, 204, 0.15)', fg: '#a6b5cc' },
};

type Props = {
  status: IncidentStatus;
};

export function IncidentStatusBadge({ status }: Props) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.open;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.fg}33`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.fg,
        }}
      />
      {label}
    </span>
  );
}
