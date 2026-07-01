"use client";

import Link from "next/link";
import { use } from "react";
import CandidateForm from "@/components/CandidateForm";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { updateRecord } from "@/lib/api";
import { useCandidate } from "@/hooks/useCandidate";
import type { RecordCreate } from "@/types";

export default function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state, refetch } = useCandidate(id);

  if (state.status === "loading") {
    return <LoadingState label="Cargando candidatura..." />;
  }

  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={refetch} />;
  }

  const candidate = state.data;

  const handleSubmit = async (data: RecordCreate) => {
    await updateRecord(candidate.id, data);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/candidates/${candidate.id}`}
          className="text-sm font-medium text-orange-700 hover:text-orange-600"
        >
          ← Volver al detalle
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-stone-900">
          Editar candidatura
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Actualiza los datos de {candidate.full_name}.
        </p>
      </div>

      <CandidateForm
        mode="edit"
        initialData={candidate}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
