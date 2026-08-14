/**
 * IncidentForm — Form for creating new incidents
 */
'use client';

import { FormEvent, useState } from 'react';
import {
  CATEGORY_LABELS,
  BRANCH_LABELS,
  type IncidentCategory,
  type IncidentBranch,
  type IncidentCreateRequest,
} from '@/lib/incidents-api';
import styles from './IncidentForm.module.css';

type Props = {
  onSubmit: (data: IncidentCreateRequest) => Promise<boolean>;
  loading?: boolean;
};

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [IncidentCategory, string][];
const BRANCHES = Object.entries(BRANCH_LABELS) as [IncidentBranch, string][];

export function IncidentForm({ onSubmit, loading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('CUSTOMER_COMPLAINT');
  const [branch, setBranch] = useState<IncidentBranch>('COL-01');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const ok = await onSubmit({ title, description, category, branch });
    if (ok) {
      setTitle('');
      setDescription('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.heading}>Registrar nueva incidencia</h3>

      {success && (
        <div className={styles.success}>Incidencia creada correctamente.</div>
      )}

      <div className={styles.field}>
        <label htmlFor="inc-title">Título</label>
        <input
          id="inc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumen breve del incidente"
          required
          minLength={3}
          maxLength={200}
          disabled={loading}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="inc-desc">Descripción</label>
        <textarea
          id="inc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle del incidente (mínimo 5 caracteres)"
          required
          minLength={5}
          rows={3}
          disabled={loading}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="inc-category">Categoría</label>
          <select
            id="inc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as IncidentCategory)}
            disabled={loading}
          >
            {CATEGORIES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-branch">Sede</label>
          <select
            id="inc-branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value as IncidentBranch)}
            disabled={loading}
          >
            {BRANCHES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? 'Creando...' : 'Crear incidencia'}
      </button>
    </form>
  );
}
