"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addCandidateNote,
  createCandidate,
  deleteCandidateNote,
  fetchCandidateById,
  fetchCandidateNotes,
  fetchCandidates,
  patchCandidate,
  updateCandidate,
} from "@/lib/api";
import {
  STAGE_OPTIONS,
  STATUS_OPTIONS,
  formatDate,
  formatPosition,
  formatStage,
  formatStatus,
} from "@/lib/format";
import type {
  Candidate,
  CandidateFormValues,
  CandidateNote,
  CandidateStage,
  CandidateStatus,
} from "@/types/candidate";

const EMPTY_FORM_VALUES: CandidateFormValues = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: 0,
  status: "received",
  stage: "pending",
  applied_at: new Date().toISOString().slice(0, 10),
};

function toFormValues(
  values: Partial<CandidateFormValues> | Partial<Candidate> = {},
): CandidateFormValues {
  return {
    full_name: values.full_name ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    position: formatPosition(values.position ?? ""),
    linkedin_url: values.linkedin_url ?? "",
    cv_url: values.cv_url ?? "",
    experience_years: Number(values.experience_years ?? 0),
    status: (values.status ?? "received") as CandidateStatus,
    stage: (values.stage ?? "pending") as CandidateStage,
    applied_at: values.applied_at ?? new Date().toISOString().slice(0, 10),
  };
}

type CandidateFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<CandidateFormValues> | Partial<Candidate>;
  onSubmit: (values: CandidateFormValues) => Promise<void>;
  submitLabel?: string;
};

function CandidateForm({
  mode,
  initialValues,
  onSubmit,
  submitLabel,
}: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(() =>
    toFormValues(initialValues ?? EMPTY_FORM_VALUES),
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    field: keyof CandidateFormValues,
    rawValue: string | number,
  ) => {
    setValues((current) => ({
      ...current,
      [field]: rawValue,
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const validateRequiredFields = () => {
    const requiredFields = [
      values.full_name.trim(),
      values.email.trim(),
      values.phone.trim(),
      values.position.trim(),
      values.status,
      values.stage,
      values.applied_at,
    ];

    if (requiredFields.some((field) => !field || field === "0")) {
      return "Please complete all required fields before submitting.";
    }

    if (Number(values.experience_years) < 0) {
      return "Experience years cannot be negative.";
    }

    if (!/\S+@\S+\.\S+/.test(values.email)) {
      return "Please enter a valid email address.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateRequiredFields();

    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: CandidateFormValues = {
        ...values,
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        position: values.position.trim(),
        linkedin_url: values.linkedin_url.trim(),
        cv_url: values.cv_url.trim(),
        experience_years: Number(values.experience_years),
      };

      await onSubmit(payload);
      setSuccessMessage(
        mode === "create"
          ? "Candidate registered successfully."
          : "Candidate details saved successfully.",
      );
      if (mode === "create") {
        setValues(toFormValues(EMPTY_FORM_VALUES));
      }
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong while saving the candidate.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Full name *</span>
          <input
            type="text"
            value={values.full_name}
            onChange={(event) => handleChange("full_name", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Email *</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Phone *</span>
          <input
            type="text"
            value={values.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Position *</span>
          <input
            type="text"
            value={values.position}
            onChange={(event) => handleChange("position", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            placeholder="e.g. Executive Assistant"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>LinkedIn URL</span>
          <input
            type="url"
            value={values.linkedin_url}
            onChange={(event) => handleChange("linkedin_url", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>CV URL</span>
          <input
            type="url"
            value={values.cv_url}
            onChange={(event) => handleChange("cv_url", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Years of experience *</span>
          <input
            type="number"
            min="0"
            value={values.experience_years}
            onChange={(event) => handleChange("experience_years", Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Application date *</span>
          <input
            type="date"
            value={values.applied_at.slice(0, 10)}
            onChange={(event) => handleChange("applied_at", `${event.target.value}T00:00:00.000Z`)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Status *</span>
          <select
            value={values.status}
            onChange={(event) => handleChange("status", event.target.value as CandidateStatus)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Stage *</span>
          <select
            value={values.stage}
            onChange={(event) => handleChange("stage", event.target.value as CandidateStage)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
            required
          >
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : submitLabel ?? (mode === "create" ? "Register candidate" : "Save changes")}
      </button>
    </form>
  );
}

export function CandidateListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const stageFilter = searchParams.get("stage") ?? "all";

  const [records, setRecords] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const refreshToken = searchParams.get("refresh") ?? "";

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchCandidates();
      setRecords(response.data ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load candidates right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates, refreshToken]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateFilter = (filterName: "status" | "stage", value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") {
      params.delete(filterName);
    } else {
      params.set(filterName, value);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : "/");
  };

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return [...records]
      .filter((candidate) => {
        const matchesStatus =
          statusFilter === "all" || candidate.status === statusFilter;
        const matchesStage =
          stageFilter === "all" || candidate.stage === stageFilter;
        const matchesSearch =
          !normalizedQuery ||
          candidate.full_name.toLowerCase().includes(normalizedQuery) ||
          candidate.email.toLowerCase().includes(normalizedQuery);

        return matchesStatus && matchesStage && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.applied_at).getTime();
        const dateB = new Date(b.applied_at).getTime();
        return dateB - dateA;
      });
  }, [records, searchTerm, stageFilter, statusFilter]);

  const handleCreate = async (values: CandidateFormValues) => {
    const createdCandidate = await createCandidate(values);
    setRecords((current) => [createdCandidate, ...current]);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-2xl bg-sky-700 px-6 py-8 text-white shadow-lg shadow-sky-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-100">HealthCore</p>
              <h1 className="mt-2 text-3xl font-bold">Talent Pipeline Tracker</h1>
            </div>
            <div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm">
              {records.length} candidates
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Register a new candidate</h2>
          </div>
          <CandidateForm mode="create" onSubmit={handleCreate} submitLabel="Register candidate" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Candidate list</h2>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => updateFilter("status", event.target.value)}
                  className="min-w-[180px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by stage</label>
                <select
                  value={stageFilter}
                  onChange={(event) => updateFilter("stage", event.target.value)}
                  className="min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  <option value="all">All stages</option>
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or email"
                  className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-6 text-sm text-sky-700">
              Loading candidates...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Position</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Stage</th>
                    <th className="px-4 py-3 font-semibold">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No candidates match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <Link
                            href={`/candidates/${candidate.id}`}
                            className="font-semibold text-sky-700 hover:text-sky-900"
                          >
                            {candidate.full_name}
                          </Link>
                          <div className="mt-1 text-xs text-slate-500">{candidate.email}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatPosition(candidate.position)}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {formatStatus(candidate.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                            {formatStage(candidate.stage)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDate(candidate.applied_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const candidateId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<CandidateStatus>("received");
  const [formStage, setFormStage] = useState<CandidateStage>("pending");
  const [patchError, setPatchError] = useState<string | null>(null);
  const [patchSuccess, setPatchSuccess] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  const loadCandidate = useCallback(async () => {
    if (!candidateId) return;

    setDetailLoading(true);
    setDetailError(null);

    try {
      const data = await fetchCandidateById(candidateId);
      setCandidate(data);
      setFormStatus(data.status);
      setFormStage(data.stage);
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the selected candidate.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, [candidateId]);

  const loadNotes = useCallback(async () => {
    if (!candidateId) return;

    setNotesLoading(true);
    setNotesError(null);

    try {
      const response = await fetchCandidateNotes(candidateId);
      setNotes(response.data ?? []);
    } catch (loadError) {
      setNotesError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the notes for this candidate.",
      );
    } finally {
      setNotesLoading(false);
    }
  }, [candidateId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadCandidate();
    void loadNotes();
  }, [loadCandidate, loadNotes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePatchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!candidateId) return;

    setPatchError(null);
    setPatchSuccess(null);

    try {
      const updatedCandidate = await patchCandidate(candidateId, {
        status: formStatus,
        stage: formStage,
      });

      setCandidate((current) => (current ? { ...current, ...updatedCandidate } : updatedCandidate));
      setPatchSuccess("Status and stage updated successfully.");
    } catch (patchErrorValue) {
      setPatchError(
        patchErrorValue instanceof Error
          ? patchErrorValue.message
          : "Unable to update status and stage.",
      );
    }
  };

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!candidateId || !newNote.trim()) {
      setNoteError("A note requires content before submission.");
      setNoteSuccess(null);
      return;
    }

    try {
      const createdNote = await addCandidateNote(candidateId, newNote.trim());
      setNotes((current) => [createdNote, ...current]);
      setNewNote("");
      setNoteError(null);
      setNoteSuccess("Note added successfully.");
    } catch (noteErrorValue) {
      setNoteError(
        noteErrorValue instanceof Error
          ? noteErrorValue.message
          : "Unable to add the note.",
      );
      setNoteSuccess(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!candidateId) return;

    try {
      await deleteCandidateNote(candidateId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      setNoteError(null);
      setNoteSuccess("Note removed successfully.");
    } catch (noteErrorValue) {
      setNoteError(
        noteErrorValue instanceof Error
          ? noteErrorValue.message
          : "Unable to delete the note.",
      );
      setNoteSuccess(null);
    }
  };

  const handleUpdateCandidate = async (values: CandidateFormValues) => {
    if (!candidateId) {
      throw new Error("Candidate ID is not available.");
    }

    const updatedCandidate = await updateCandidate(candidateId, values);
    setCandidate(updatedCandidate);
    setFormStatus(updatedCandidate.status);
    setFormStage(updatedCandidate.stage);
  };

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-xl border border-sky-200 bg-sky-50 px-4 py-8 text-sm text-sky-700">
          Loading candidate details...
        </div>
      </div>
    );
  }

  if (detailError || !candidate) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-sm text-red-700">
          {detailError ?? "Candidate not found."}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/?refresh=${Date.now()}`)}
            className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            ← Back to candidates
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Candidate profile</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{candidate.full_name}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-700">
                {formatStatus(candidate.status)}
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
                {formatStage(candidate.stage)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-2 text-sm text-slate-800">{candidate.email}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
              <p className="mt-2 text-sm text-slate-800">{candidate.phone}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</p>
              <p className="mt-2 text-sm text-slate-800">{formatPosition(candidate.position)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LinkedIn</p>
              <p className="mt-2 text-sm text-slate-800">
                {candidate.linkedin_url ? (
                  <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                    Open profile
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CV link</p>
              <p className="mt-2 text-sm text-slate-800">
                {candidate.cv_url ? (
                  <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                    Open CV
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Years of experience</p>
              <p className="mt-2 text-sm text-slate-800">{candidate.experience_years}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application date</p>
              <p className="mt-2 text-sm text-slate-800">{formatDate(candidate.applied_at)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</p>
              <p className="mt-2 text-sm text-slate-800">{formatDate(candidate.updated_at ?? candidate.applied_at)}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Update candidate</h2>
            </div>
            <CandidateForm
              mode="edit"
              initialValues={candidate}
              onSubmit={handleUpdateCandidate}
              submitLabel="Save changes"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Update status and stage</h2>
            </div>

            <form onSubmit={handlePatchSubmit} className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Status</span>
                <select
                  value={formStatus}
                  onChange={(event) => setFormStatus(event.target.value as CandidateStatus)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Stage</span>
                <select
                  value={formStage}
                  onChange={(event) => setFormStage(event.target.value as CandidateStage)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {patchError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {patchError}
                </div>
              ) : null}

              {patchSuccess ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {patchSuccess}
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Update status and stage
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Notes</h2>
          </div>

          {notesLoading ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-700">
              Loading notes...
            </div>
          ) : notesError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {notesError}
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No notes have been added for this candidate yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteNote(note.id)}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddNote} className="mt-6 space-y-3">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Add note</span>
              <textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                rows={4}
                placeholder="Add a new note about this candidate"
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
              />
            </label>

            {noteError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {noteError}
              </div>
            ) : null}

            {noteSuccess ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {noteSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add note
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
