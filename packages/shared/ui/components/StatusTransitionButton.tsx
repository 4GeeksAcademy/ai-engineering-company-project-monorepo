/**
 * StatusTransitionButton — Button to transition an incident to a new status
 */
import type { IncidentStatus } from '../../types/incidents';
import { STATUS_LABELS, VALID_TRANSITIONS } from '../../types/incidents';

type Props = {
  currentStatus: IncidentStatus;
  onTransition: (newStatus: IncidentStatus) => void;
  loading?: boolean;
};

const TRANSITION_STYLES: Record<IncidentStatus, { bg: string; fg: string }> = {
  in_progress: { bg: 'rgba(255, 189, 89, 0.12)', fg: '#ffbd59' },
  resolved: { bg: 'rgba(88, 211, 143, 0.12)', fg: '#58d38f' },
  discarded: { bg: 'rgba(255, 125, 125, 0.12)', fg: '#ff7d7d' },
  open: { bg: 'rgba(120, 160, 255, 0.12)', fg: '#78a0ff' },
};

export function StatusTransitionButton({ currentStatus, onTransition, loading }: Props) {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (allowed.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {allowed.map((target) => {
        const style = TRANSITION_STYLES[target] ?? TRANSITION_STYLES.open;
        return (
          <button
            key={target}
            onClick={() => onTransition(target)}
            disabled={loading}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: style.bg,
              color: style.fg,
              border: `1px solid ${style.fg}33`,
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {STATUS_LABELS[target] ?? target}
          </button>
        );
      })}
    </div>
  );
}
