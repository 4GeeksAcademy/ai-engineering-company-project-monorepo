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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <BackLink href={`/candidates/${id}`}>Back to candidate</BackLink>

      <PageHeader
        title="Edit candidate"
        description={`Update ${candidate.full_name}'s details.`}
      />

      <CandidateForm mode="edit" candidate={candidate} />
    </main>
  );
}