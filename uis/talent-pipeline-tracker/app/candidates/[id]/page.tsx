import Link from "next/link";

export default async function CandidateDetailPage(
  props: PageProps<"/candidates/[id]">,
) {
  const { id } = await props.params;

  return (
    <main className="flex flex-1 w-full max-w-3xl flex-col gap-4 py-16 px-6 mx-auto">
      <Link href="/" className="text-sm text-zinc-600 hover:underline">
        ← Back to Candidates
      </Link>
      <h1 className="text-2xl font-semibold">Candidate details</h1>
      <p className="text-zinc-600">Candidate ID: {id}</p>
    </main>
  );
}
