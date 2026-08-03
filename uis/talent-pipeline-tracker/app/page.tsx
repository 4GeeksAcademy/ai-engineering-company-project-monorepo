import { Suspense } from "react";
import { CandidateListPage } from "@/components/CandidateListPage";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading candidate pipeline...</div>
        </main>
      }
    >
      <CandidateListPage />
    </Suspense>
  );
}
