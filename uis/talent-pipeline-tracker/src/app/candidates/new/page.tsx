'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Candidate } from '../../../types/candidate';
import { createCandidate } from '../../../services/candidates';
import CandidateForm from '../../../components/CandidateForm';

export default function NewCandidatePage() {
  const router = useRouter();

  const handleCreate = async (formData: Partial<Candidate>) => {
    const createdCandidate = await createCandidate(formData);
    if (createdCandidate && createdCandidate.id) {
      router.push(`/candidates/${createdCandidate.id}`);
    } else {
      router.push('/');
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Volver al listado
        </Link>
      </div>

      <CandidateForm
        onSubmit={handleCreate}
        isEditing={false}
        onCancel={handleCancel}
      />
    </div>
  );
}
