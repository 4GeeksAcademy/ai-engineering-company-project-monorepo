import NewCandidateForm from "@/components/NewCandidateForm";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";

export default function NewCandidatePage() {
  return (
    <div>
      <BackLink href="/hiring">Back to candidates</BackLink>

      <PageHeader
        title="New candidate"
        description="Register a new candidate in the talent pipeline."
      />

      <NewCandidateForm />
    </div>
  );
}
