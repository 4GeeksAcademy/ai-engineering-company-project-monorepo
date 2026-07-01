"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CandidateForm from "@/components/CandidateForm";
import { createRecord } from "@/lib/api";
import type { RecordCreate } from "@/types";

export default function NewCandidatePage() {
  const router = useRouter();

  const handleSubmit = async (data: RecordCreate) => {
    const created = await createRecord(data);
    router.push(`/candidates/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-orange-700 hover:text-orange-600"
        >
          ← Volver al listado
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-stone-900">
          Nueva candidatura
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Registra un nuevo candidato en el pipeline de People & Talent de
          Brasaland.
        </p>
      </div>

      <CandidateForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
