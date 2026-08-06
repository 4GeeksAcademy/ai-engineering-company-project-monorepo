'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CandidateForm } from '../../../components/candidates/CandidateForm';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { getCandidateById } from '../../../../services/candidatesApi';
import type { Candidate } from '../../../../types/candidate';

export default function EditCandidatePage() {
  const params = useParams<{ id: string }>();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidate() {
      if (!candidateId) {
        if (isMounted) {
          setError('No se pudo identificar la candidatura a editar.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getCandidateById(candidateId);
        if (isMounted) {
          setCandidate(data);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError((fetchError as Error).message || 'No fue posible cargar el candidato.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCandidate();

    return () => {
      isMounted = false;
    };
  }, [candidateId, reloadKey]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Spinner label="Cargando candidato..." />
      </div>
    );
  }

  if (error || !candidate || !candidateId) {
    return (
      <Alert variant="error" title="Error al cargar candidato">
        <div className="space-y-3">
          <p>{error || 'No se encontro informacion del candidato.'}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((previous) => previous + 1)}
              className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Reintentar
            </button>
            <Link
              href="/candidaturas"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </Alert>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Editar candidatura</h2>
        <p className="mt-1 text-sm text-slate-600">Actualiza la informacion del candidato y guarda los cambios.</p>
      </header>

      <CandidateForm mode="edit" candidateId={candidateId} initialData={candidate} />
    </section>
  );
}
