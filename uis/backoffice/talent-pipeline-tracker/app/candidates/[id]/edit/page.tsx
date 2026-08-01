'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CandidateForm } from '../../../../components/CandidateForm';
import { Alert } from '../../../../components/ui/Alert';
import { Spinner } from '../../../../components/ui/Spinner';
import { getCandidateById } from '../../../../services/api';
import type { Candidate } from '../../../../types/candidate';

export default function EditCandidatePage() {
  const params = useParams<{ id: string }>();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [candidateId]);

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
        {error || 'No se encontro informacion del candidato.'}
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
