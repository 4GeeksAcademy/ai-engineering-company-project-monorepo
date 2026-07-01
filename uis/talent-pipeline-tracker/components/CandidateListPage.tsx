"use client";

import { Suspense } from "react";
import CandidateFilters, {
  useCandidateFilters,
} from "@/components/CandidateFilters";
import CandidateTable from "@/components/CandidateTable";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { useCandidates } from "@/hooks/useCandidates";

function CandidateListContent() {
  const filters = useCandidateFilters();
  const { state, refetch } = useCandidates(filters);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Candidaturas</h2>
        <p className="mt-1 text-sm text-stone-600">
          Seguimiento del pipeline de selección de Brasaland. Filtra por estado,
          etapa o busca por nombre o email.
        </p>
      </div>

      <CandidateFilters />

      {state.status === "loading" && (
        <LoadingState label="Cargando candidaturas..." />
      )}

      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={refetch} />
      )}

      {state.status === "success" && state.data.data.length === 0 && (
        <EmptyState
          title="No hay candidaturas"
          description="Prueba ajustando los filtros o registra una nueva candidatura."
        />
      )}

      {state.status === "success" && state.data.data.length > 0 && (
        <>
          <p className="text-sm text-stone-600">
            Mostrando {state.data.data.length} de {state.data.total}{" "}
            candidaturas
          </p>
          <CandidateTable candidates={state.data.data} />
        </>
      )}
    </div>
  );
}

export default function CandidateListPage() {
  return (
    <Suspense fallback={<LoadingState label="Preparando listado..." />}>
      <CandidateListContent />
    </Suspense>
  );
}
