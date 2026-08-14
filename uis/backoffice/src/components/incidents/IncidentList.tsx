/**
 * IncidentList — Filterable list of incidents with status transitions
 */
'use client';

import { useState } from 'react';
import {
  CATEGORY_LABELS,
  BRANCH_LABELS,
  STATUS_LABELS,
  VALID_TRANSITIONS,
  type Incident,
  type IncidentCategory,
  type IncidentBranch,
  type IncidentStatus,
} from '@/lib/incidents-api';
import styles from './IncidentList.module.css';

type Props = {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  onTransition: (id: string, status: IncidentStatus) => Promise<boolean>;
  onRefresh: () => void;
};

const STATUS_OPTIONS: [IncidentStatus, string][] = [
  ['open', 'Abierto'],
  ['in_progress', 'En progreso'],
  ['resolved', 'Resuelto'],
  ['discarded', 'Descartado'],
];

export function IncidentList({ incidents, loading, error, onTransition, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const filtered = incidents.filter((inc) => {
    if (filterStatus && inc.status !== filterStatus) return false;
    if (filterCategory && inc.category !== filterCategory) return false;
    if (filterBranch && inc.branch !== filterBranch) return false;
    return true;
  });

  async function handleTransition(id: string, newStatus: IncidentStatus) {
    setTransitioningId(id);
    await onTransition(id, newStatus);
    setTransitioningId(null);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.heading}>Incidencias ({filtered.length})</h3>
        <button className={styles.refreshBtn} onClick={onRefresh} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {(Object.entries(CATEGORY_LABELS) as [IncidentCategory, string][]).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">Todas las sedes</option>
          {(Object.entries(BRANCH_LABELS) as [IncidentBranch, string][]).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {filtered.length === 0 && !loading && (
        <div className={styles.empty}>No hay incidencias para mostrar.</div>
      )}

      <div className={styles.list}>
        {filtered.map((inc) => {
          const transitions = VALID_TRANSITIONS[inc.status];
          const isBusy = transitioningId === inc.id;

          return (
            <div key={inc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.statusBadge} data-status={inc.status}>
                  {STATUS_LABELS[inc.status]}
                </span>
                <span className={styles.category}>{CATEGORY_LABELS[inc.category]}</span>
                <span className={styles.branch}>{BRANCH_LABELS[inc.branch]}</span>
              </div>

              <h4 className={styles.title}>{inc.title}</h4>
              <p className={styles.desc}>{inc.description}</p>

              <div className={styles.meta}>
                <span>ID: {inc.id}</span>
                <span>Creado: {formatDate(inc.reported_at)}</span>
                <span>Actualizado: {formatDate(inc.updated_at)}</span>
                <span>Origen: {inc.origin}</span>
              </div>

              {transitions.length > 0 && (
                <div className={styles.actions}>
                  {transitions.map((target) => (
                    <button
                      key={target}
                      className={styles.transitionBtn}
                      data-target={target}
                      onClick={() => handleTransition(inc.id, target)}
                      disabled={isBusy}
                    >
                      {STATUS_LABELS[target]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
