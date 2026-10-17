import { Suspense } from "react";
import { CandidateListPage } from "@/components/talent-pipeline";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 p-10 text-slate-700">Loading candidates...</div>}>
      <CandidateListPage />
    </Suspense>
  );
}
