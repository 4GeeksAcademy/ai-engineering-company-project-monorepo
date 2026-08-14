/**
 * IncidentSummary — Dashboard summary of all incidents
 */
'use client';

import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  BRANCH_LABELS,
  ORIGIN_LABELS,
  type IncidentSummary as IncidentSummaryType,
} from '@/lib/incidents-api';
import styles from './IncidentSummary.module.css';

type Props = {
  summary: IncidentSummaryType | null;
  loading: boolean;
  error: string | null;
};

export function IncidentSummary({ summary, loading, error }: Props) {
  if (loading) {
    return <div className={styles.loading}>Cargando resumen...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!summary || summary.total === 0) {
    return (
      <div className={styles.empty}>
        <p>No hay incidencias registradas.</p>
        <p className={styles.hint}>Crea una nueva incidencia o importa datos desde CSV.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Resumen de incidencias</h3>

      <div className={styles.totalCard}>
        <span className={styles.totalNumber}>{summary.total}</span>
        <span className={styles.totalLabel}>incidencias totales</span>
      </div>

      <div className={styles.grid}>
        {/* By Status */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Por estado</h4>
          <div className={styles.bars}>
            {summary.by_status.map((item) => {
              const pct = Math.round((item.count / summary.total) * 100);
              return (
                <div key={item.status} className={styles.barRow}>
                  <span className={styles.barLabel}>{item.label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      data-status={item.status}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.barCount}>{item.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Por categoría</h4>
          <div className={styles.bars}>
            {summary.by_category.map((item) => {
              const pct = Math.round((item.count / summary.total) * 100);
              return (
                <div key={item.category} className={styles.barRow}>
                  <span className={styles.barLabel}>{item.label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      data-category={item.category}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.barCount}>{item.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Branch */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Por sede</h4>
          <div className={styles.branchGrid}>
            {summary.by_branch
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <div key={item.branch} className={styles.branchItem}>
                  <span className={styles.branchName}>{BRANCH_LABELS[item.branch] ?? item.branch}</span>
                  <span className={styles.branchCount}>{item.count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
