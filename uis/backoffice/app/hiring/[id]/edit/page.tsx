import { notFound } from "next/navigation";
import { fetchCandidate } from "@/lib/api";
import CandidateForm from "@/components/CandidateForm";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let candidate;

  try {
    candidate = await fetchCandidate(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <BackLink href={`/hiring/${id}`}>Back to candidate</BackLink>

      <PageHeader
        title="Edit candidate"
        description={`Update ${candidate.full_name}'s details.`}
      />

      <CandidateForm mode="edit" candidate={candidate} />
    </div>
  );
}
