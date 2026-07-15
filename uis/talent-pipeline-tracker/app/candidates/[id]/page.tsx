"use client";

import Link from "next/link";
import { use } from "react";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import NotesPanel from "@/components/NotesPanel";
import StageBadge from "@/components/StageBadge";
import StageSelect from "@/components/StageSelect";
import StatusBadge from "@/components/StatusBadge";
import StatusSelect from "@/components/StatusSelect";
import { useCandidate } from "@/hooks/useCandidate";
import { STAGE_LABELS, STATUS_LABELS } from "@/lib/constants";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function DetailField({
  label,
  value,
  href,
  empty = false,
}: {
  label: string;
  value: string;
  href?: string;
  empty?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${empty ? "text-stone-400 italic" : "text-stone-900"}`}
      >
        {href && !empty ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-700 underline hover:text-orange-600"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state, refetch, setCandidate } = useCandidate(id);

  if (state.status === "loading") {
    return <LoadingState label="Cargando candidatura..." />;
  }

  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={refetch} />;
  }

  const candidate = state.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-orange-700 hover:text-orange-600"
          >
            ← Volver al listado
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">
            {candidate.full_name}
          </h2>
          <p className="text-sm text-stone-600">{candidate.position}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={candidate.status} />
            <StageBadge stage={candidate.stage} />
          </div>
        </div>
        <Link
          href={`/candidates/${candidate.id}/edit`}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
        >
          Editar candidatura
        </Link>
      </div>

      <section className="grid gap-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Nombre" value={candidate.full_name} />
          <DetailField label="Email" value={candidate.email} />
          <DetailField label="Teléfono" value={candidate.phone} />
          <DetailField label="Puesto" value={candidate.position} />
          <DetailField
            label="Años de experiencia"
            value={String(candidate.experience_years)}
          />
          <DetailField
            label="Estado"
            value={STATUS_LABELS[candidate.status]}
          />
          <DetailField label="Etapa" value={STAGE_LABELS[candidate.stage]} />
          <DetailField
            label="Fecha de aplicación"
            value={formatDate(candidate.applied_at)}
          />
          <DetailField
            label="LinkedIn"
            value={candidate.linkedin_url ? "Ver perfil" : "No disponible"}
            href={candidate.linkedin_url ?? undefined}
            empty={!candidate.linkedin_url}
          />
          <DetailField
            label="Enlace al CV"
            value={candidate.cv_url ? "Ver CV" : "No disponible"}
            href={candidate.cv_url ?? undefined}
            empty={!candidate.cv_url}
          />
        </dl>

        <div className="space-y-4">
          <StatusSelect candidate={candidate} onUpdated={setCandidate} />
          <StageSelect candidate={candidate} onUpdated={setCandidate} />
        </div>
      </section>

      <NotesPanel recordId={candidate.id} />
    </div>
  );
}
