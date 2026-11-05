import CandidatePipeline from '../components/CandidatePipeline';
import { getCandidates } from '../services/candidates';
import type { Candidate } from '../types/candidate';

// The list is rendered on the server so it is in the first HTML (LCP no longer waits for
// hydration + a browser fetch). The data is cached for 30 s; the client refreshes it silently.
const REVALIDATE_SECONDS = 30;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { status, stage } = await searchParams;

  let initialCandidates: Candidate[] | null = null;
  try {
    initialCandidates = await getCandidates({ next: { revalidate: REVALIDATE_SECONDS } });
  } catch {
    // The client component shows its loading/error states and retries on its own.
  }

  return (
    <CandidatePipeline
      initialCandidates={initialCandidates}
      initialStatus={first(status)}
      initialStage={first(stage)}
    />
  );
}
