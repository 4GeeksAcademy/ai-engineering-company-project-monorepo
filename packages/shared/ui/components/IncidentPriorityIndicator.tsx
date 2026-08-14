/**
 * IncidentPriorityIndicator — Visual priority based on category
 */
import type { IncidentCategory } from '../../types/incidents';
import { CATEGORY_LABELS } from '../../types/incidents';

const CATEGORY_ICONS: Record<IncidentCategory, string> = {
  CUSTOMER_COMPLAINT: '💬',
  EQUIPMENT: '⚙️',
  SUPPLY: '📦',
  FOOD_QUALITY: '🍽️',
  STAFF: '👤',
};

type Props = {
  category: IncidentCategory;
  showLabel?: boolean;
};

export function IncidentPriorityIndicator({ category, showLabel = true }: Props) {
  const icon = CATEGORY_ICONS[category] ?? '❓';
  const label = CATEGORY_LABELS[category] ?? category;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
      }}
      title={label}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {showLabel && <span style={{ color: 'var(--muted, #a6b5cc)' }}>{label}</span>}
    </span>
  );
}
