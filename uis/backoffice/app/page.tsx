import Link from "next/link";

import CandidateListFilters from "@/components/candidate-list-filters";
import CreateCandidateForm from "@/components/create-candidate-form";
import { getStageLabel, getStatusLabel } from "@/lib/candidate-labels";
import { fetchCandidates } from "@/services/api";
import type { Candidate, CandidateStage, CandidateStatus } from "@/types/models";

export const dynamic = "force-dynamic";

const VALID_STATUSES: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];
const VALID_STAGES: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

interface CandidatesPageProps {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    stage?: string | string[];
  }>;
}

function getSingleValue(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value?: string): CandidateStatus | undefined {
  if (!value) {
    return undefined;
  }

  return VALID_STATUSES.includes(value as CandidateStatus)
    ? (value as CandidateStatus)
    : undefined;
}

function parseStage(value?: string): CandidateStage | undefined {
  if (!value) {
    return undefined;
  }

  return VALID_STAGES.includes(value as CandidateStage)
    ? (value as CandidateStage)
    : undefined;
}

function matchesSearch(candidate: Candidate, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLocaleLowerCase();
  return (
    candidate.name.toLocaleLowerCase().includes(normalizedQuery)
    || candidate.email.toLocaleLowerCase().includes(normalizedQuery)
  );
}

function buildCurrentQuery(
  searchQuery: string,
  status: CandidateStatus | undefined,
  stage: CandidateStage | undefined,
): string {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  if (status) {
    params.set("status", status);
  }

  if (stage) {
    params.set("stage", stage);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = getSingleValue(resolvedSearchParams.q) ?? "";
  const searchQuery = rawQuery.trim();
  const statusFilter = parseStatus(getSingleValue(resolvedSearchParams.status));
  const stageFilter = parseStage(getSingleValue(resolvedSearchParams.stage));

  const candidates = await fetchCandidates();
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesStatus = !statusFilter || candidate.status === statusFilter;
    const matchesStage = !stageFilter || candidate.stage === stageFilter;
    const matchesQuery = matchesSearch(candidate, searchQuery);

    return matchesStatus && matchesStage && matchesQuery;
  });
  const currentQuery = buildCurrentQuery(searchQuery, statusFilter, stageFilter);

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Listado de candidaturas</h1>
        <p className="page-subtitle">Gestiona y filtra candidaturas del pipeline de seleccion.</p>
      </header>

      <CandidateListFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        stageFilter={stageFilter}
        totalCandidates={candidates.length}
        shownCandidates={filteredCandidates.length}
      />

      <CreateCandidateForm />

      {filteredCandidates.length === 0 ? (
        <section className="empty-state" aria-live="polite">
          <h2>Sin resultados</h2>
          <p>No hay candidaturas que coincidan con los filtros actuales.</p>
        </section>
      ) : (
        <ul className="candidate-grid" aria-live="polite">
          {filteredCandidates.map((candidate) => (
            <li key={candidate.id} className="candidate-card">
              <h2 className="candidate-name">
                <Link className="candidate-link" href={`/candidates/${candidate.id}${currentQuery}`}>
                  {candidate.name}
                </Link>
              </h2>
              <p><strong>Puesto:</strong> {candidate.position}</p>
              <p><strong>Estado:</strong> {getStatusLabel(candidate.status)}</p>
              <p><strong>Etapa:</strong> {getStageLabel(candidate.stage)}</p>
              <div className="candidate-actions">
                <Link
                  className="link-button"
                  href={`/candidates/${candidate.id}${currentQuery}#editar-candidatura`}
                  aria-label={`Editar candidatura de ${candidate.name}`}
                >
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
