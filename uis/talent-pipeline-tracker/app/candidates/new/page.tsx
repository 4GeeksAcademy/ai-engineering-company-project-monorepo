import NewCandidateForm from "@/components/NewCandidateForm";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";

export default function NewCandidatePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <BackLink href="/">Back to candidates</BackLink>

      <PageHeader
        title="New candidate"
        description="Register a new candidate in the talent pipeline."
      />

      <NewCandidateForm />
    </main>
  );
}