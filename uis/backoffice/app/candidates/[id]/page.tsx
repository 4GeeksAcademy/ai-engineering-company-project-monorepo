import { notFound } from "next/navigation";

import CandidateDetailManager from "@/components/candidate-detail-manager";
import { fetchCandidateById, fetchCandidateNotes } from "@/services/api";

export const dynamic = "force-dynamic";

interface CandidateDetailPageProps {
  params: Promise<{ id?: string | string[] }>;
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

function buildBackHref(
  q?: string | string[],
  status?: string | string[],
  stage?: string | string[],
): string {
  const params = new URLSearchParams();
  const query = getSingleValue(q)?.trim();
  const statusValue = getSingleValue(status);
  const stageValue = getSingleValue(stage);

  if (query) {
    params.set("q", query);
  }

  if (statusValue) {
    params.set("status", statusValue);
  }

  if (stageValue) {
    params.set("stage", stageValue);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export default async function CandidateDetailPage({
  params,
  searchParams,
}: CandidateDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const candidateId = Array.isArray(id) ? id[0] : id;

  if (!candidateId) {
    notFound();
  }

  const candidate = await fetchCandidateById(candidateId);

  if (!candidate) {
    notFound();
  }

  const notes = await fetchCandidateNotes(candidateId);

  const backHref = buildBackHref(
    resolvedSearchParams.q,
    resolvedSearchParams.status,
    resolvedSearchParams.stage,
  );

  return <CandidateDetailManager candidate={candidate} notes={notes} backHref={backHref} />;
}
