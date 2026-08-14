/**
 * IncidentBoard — Main board component combining summary, form and list
 */
'use client';

import { useState } from 'react';
import { useIncidentList, useIncidentMutations, useIncidentSummary } from '@/lib/hooks/useIncidents';
import { IncidentForm } from './IncidentForm';
import { IncidentList } from './IncidentList';
import { IncidentSummary } from './IncidentSummary';
import styles from './IncidentBoard.module.css';

type Tab = 'board' | 'create' | 'analysis';

export function IncidentBoard() {
  const [tab, setTab] = useState<Tab>('board');
  const { summary, loading: summaryLoading, error: summaryError, refresh: refreshSummary } = useIncidentSummary();
  const { incidents, loading: listLoading, error: listError, refresh: refreshList } = useIncidentList();
  const { create, transition, loading: mutationLoading, error: mutationError } = useIncidentMutations();

  async function handleCreate(data: { title: string; description: string; category: string; branch: string }) {
    const result = await create(data as any);
    if (result) {
      refreshList();
      refreshSummary();
      return true;
    }
    return false;
  }

  async function handleTransition(id: string, newStatus: string): Promise<boolean> {
    const result = await transition(id, newStatus as any);
    if (result) {
      refreshList();
      refreshSummary();
      return true;
    }
    return false;
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'board' ? styles.tabActive : ''}`}
          onClick={() => setTab('board')}
        >
          Tablero
        </button>
        <button
          className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
          onClick={() => setTab('create')}
        >
          Registrar
        </button>
        <button
          className={`${styles.tab} ${tab === 'analysis' ? styles.tabActive : ''}`}
          onClick={() => setTab('analysis')}
        >
          Análisis CSV
        </button>
      </div>

      {mutationError && (
        <div className={styles.globalError}>{mutationError}</div>
      )}

      {tab === 'board' && (
        <div className={styles.boardGrid}>
          <aside className={styles.sidebar}>
            <IncidentSummary summary={summary} loading={summaryLoading} error={summaryError} />
          </aside>
          <section className={styles.main}>
            <IncidentList
              incidents={incidents}
              loading={listLoading}
              error={listError}
              onTransition={handleTransition}
              onRefresh={() => { refreshList(); refreshSummary(); }}
            />
          </section>
        </div>
      )}

      {tab === 'create' && (
        <div className={styles.createView}>
          <IncidentForm onSubmit={handleCreate} loading={mutationLoading} />
        </div>
      )}

      {tab === 'analysis' && (
        <div className={styles.analysisView}>
          <p style={{ color: 'var(--muted, #a6b5cc)' }}>
            El módulo de análisis CSV está disponible en la pestaña de análisis existente.
          </p>
        </div>
      )}
    </div>
  );
}
