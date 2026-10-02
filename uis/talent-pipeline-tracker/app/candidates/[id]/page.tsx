import { notFound } from "next/navigation";
import { fetchCandidate, fetchNotes } from "@/lib/api";
import CandidateUpdate from "@/components/CandidateUpdate";
import CandidateNotes from "@/components/CandidateNotes";
import BackLink from "@/components/BackLink";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import InfoRow from "@/components/InfoRow";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  STAGE_LABELS,
  STAGE_STYLES,
} from "@/lib/candidate-meta";
import { formatDate, formatYearsLabel } from "@/lib/format";
import type { CandidateNote } from "@/lib/types";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let candidate;
  let notes: CandidateNote[] = [];

  try {
    candidate = await fetchCandidate(id);
  } catch {
    notFound();
  }

  try {
    notes = await fetchNotes(id);
  } catch {
    notes = [];
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <BackLink href="/">Back to candidates</BackLink>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {candidate.full_name}
          </h1>
          <Badge
            label={STATUS_LABELS[candidate.status]}
            className={STATUS_STYLES[candidate.status]}
            maxWidthClass="max-w-[10rem]"
          />
          <Badge
            label={STAGE_LABELS[candidate.stage]}
            className={STAGE_STYLES[candidate.stage]}
            maxWidthClass="max-w-[10rem]"
          />
        </div>
        <p className="mt-1 text-sm text-zinc-500">{candidate.position}</p>
      </div>

      <Card title="Contact">
        <dl className="divide-y divide-zinc-100 text-sm">
          <InfoRow label="Email">
            <a
              href={`mailto:${candidate.email}`}
              className="text-indigo-600 hover:underline"
            >
              {candidate.email}
            </a>
          </InfoRow>
          <InfoRow label="Phone">{candidate.phone}</InfoRow>
          <InfoRow label="LinkedIn">
            {candidate.linkedin_url ? (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                {candidate.linkedin_url}
              </a>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </InfoRow>
          <InfoRow label="CV">
            {candidate.cv_url ? (
              <a
                href={candidate.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Download CV
              </a>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </InfoRow>
        </dl>
      </Card>

      <div className="mt-6">
        <Card title="Pipeline">
          <dl className="divide-y divide-zinc-100 text-sm">
            <InfoRow label="Experience">
              {formatYearsLabel(candidate.experience_years)}
            </InfoRow>
            <InfoRow label="Applied">{formatDate(candidate.applied_at)}</InfoRow>
            <InfoRow label="Last updated">
              {formatDate(candidate.updated_at)}
            </InfoRow>
            <InfoRow label="Notes">{candidate.notes_count}</InfoRow>
          </dl>
        </Card>
      </div>

      <CandidateUpdate
        candidateId={id}
        initialStatus={candidate.status}
        initialStage={candidate.stage}
      />

      <CandidateNotes candidateId={id} initialNotes={notes} />
    </main>
  );
}