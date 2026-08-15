"use client";

import {
  Suspense,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createNote,
  createRecord,
  deleteNote,
  fetchRecordDetail,
  fetchRecords,
  patchRecord,
  updateRecord,
} from "@/lib/tracker-api";
import { EMPTY_FORM, STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/tracker-config";
import {
  buildErrorMessage,
  buildLabel,
  buildStageSuccessMessage,
  buildStatusSuccessMessage,
  buildTrackerHref,
  formatDate,
  normalizeFormValues,
} from "@/lib/tracker-utils";
import type {
  AsyncFeedback,
  CandidateFormValues,
  FormMode,
  Note,
  RecordListItem,
  RecordSummary,
  TrackerFilters,
} from "@/types/tracker";
import { FeedbackBanner, Field, InfoBlock, PageSkeleton, PanelCard } from "@/components/tracker-ui";

export function TalentPipelineTracker({ initialRecordId }: { initialRecordId?: string | null }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TalentPipelineTrackerContent initialRecordId={initialRecordId ?? null} />
    </Suspense>
  );
}

function TalentPipelineTrackerContent({ initialRecordId }: { initialRecordId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState<TrackerFilters>({
    status: searchParams.get("status") ?? "",
    stage: searchParams.get("stage") ?? "",
    search: searchParams.get("search") ?? "",
  });
  const deferredSearch = useDeferredValue(filters.search);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(initialRecordId);
  const [selectedRecord, setSelectedRecord] = useState<RecordSummary | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeMutation, setActiveMutation] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [formValues, setFormValues] = useState<CandidateFormValues>(EMPTY_FORM);
  const [listFeedback, setListFeedback] = useState<AsyncFeedback | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<AsyncFeedback | null>(null);
  const [formFeedback, setFormFeedback] = useState<AsyncFeedback | null>(null);
  const activeRecordId = selectedRecordId ?? records[0]?.id ?? null;

  const syncRecordSnapshot = useCallback((record: RecordSummary) => {
    setSelectedRecord((current) => (current?.id === record.id ? record : current));
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? { ...item, ...record } : item)),
    );
  }, []);

  const refreshRecords = useCallback(async () => {
    setListLoading(true);
    setListFeedback({ tone: "loading", message: "Cargando candidaturas de Trackflow..." });

    try {
      const response = await fetchRecords({ ...filters, search: deferredSearch });
      setRecords(response.data);
      setTotalRecords(response.total);
      setListFeedback({
        tone: "success",
        message:
          response.data.length === 0
            ? "Listado actualizado. No hay perfiles para los filtros actuales."
            : `Listado actualizado con ${response.data.length} perfiles de Trackflow.`,
      });
    } catch (error) {
      setListFeedback({ tone: "error", message: buildErrorMessage(error) });
    } finally {
      setListLoading(false);
    }
  }, [deferredSearch, filters]);

  const refreshRecordDetail = useCallback(
    async (recordId: string) => {
      setDetailLoading(true);
      setDetailFeedback({ tone: "loading", message: "Cargando ficha del candidato..." });

      try {
        const { record, notes } = await fetchRecordDetail(recordId);
        setSelectedRecord(record);
        setSelectedNotes(notes.data);
        syncRecordSnapshot({ ...record, notes_count: notes.meta.total });
        setDetailFeedback({ tone: "success", message: `Ficha cargada para ${record.full_name}.` });
      } catch (error) {
        setDetailFeedback({ tone: "error", message: buildErrorMessage(error) });
      } finally {
        setDetailLoading(false);
      }
    },
    [syncRecordSnapshot],
  );

  useEffect(() => {
    async function loadRecords() {
      await refreshRecords();
    }

    void loadRecords();
  }, [refreshRecords]);

  useEffect(() => {
    if (listFeedback?.tone !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setListFeedback((current) => (current?.tone === "success" ? null : current));
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [listFeedback]);

  useEffect(() => {
    if (detailFeedback?.tone !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDetailFeedback((current) => (current?.tone === "success" ? null : current));
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [detailFeedback]);

  useEffect(() => {
    if (formFeedback?.tone !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFormFeedback((current) => (current?.tone === "success" ? null : current));
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [formFeedback]);

  useEffect(() => {
    const nextHref = buildTrackerHref(activeRecordId, filters);
    const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (nextHref === currentHref) {
      return;
    }

    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }, [activeRecordId, filters, pathname, router, searchParams]);

  useEffect(() => {
    if (!activeRecordId) {
      return;
    }

    async function loadRecordDetail() {
      await refreshRecordDetail(activeRecordId);
    }

    void loadRecordDetail();
  }, [activeRecordId, refreshRecordDetail]);

  async function handleQuickUpdate(field: "status" | "stage", value: string) {
    if (!selectedRecord) {
      return;
    }

    const previousRecord = selectedRecord;
    const optimisticRecord = {
      ...selectedRecord,
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    setActiveMutation(field);
    setDetailFeedback({
      tone: "loading",
      message:
        field === "status"
          ? "Actualizando estado de la candidatura..."
          : "Actualizando etapa de la candidatura...",
    });
    syncRecordSnapshot(optimisticRecord);

    try {
      const updated = await patchRecord(selectedRecord.id, { [field]: value });
      syncRecordSnapshot(updated);
      setDetailFeedback({
        tone: "success",
        message:
          field === "status"
            ? buildStatusSuccessMessage(updated.status)
            : buildStageSuccessMessage(updated.stage),
      });
    } catch (error) {
      syncRecordSnapshot(previousRecord);
      setDetailFeedback({ tone: "error", message: buildErrorMessage(error) });
    } finally {
      setActiveMutation(null);
    }
  }

  async function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveMutation(formMode?.type === "edit" ? "saving-edit" : "saving-create");
    setFormFeedback({
      tone: "loading",
      message:
        formMode?.type === "edit"
          ? "Guardando cambios de la candidatura..."
          : "Creando nueva candidatura...",
    });

    try {
      const payload = {
        full_name: formValues.full_name.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim(),
        position: formValues.position.trim(),
        linkedin_url: formValues.linkedin_url.trim() || null,
        cv_url: formValues.cv_url.trim() || null,
        experience_years: Number(formValues.experience_years),
      };

      if (Number.isNaN(payload.experience_years)) {
        throw new Error("Indica los años de experiencia con un valor numérico.");
      }

      const result =
        formMode?.type === "edit"
          ? await updateRecord(formMode.recordId, payload)
          : await createRecord(payload);

      setFormMode(null);
      setFormValues(EMPTY_FORM);
      setFormFeedback(null);
      setSelectedRecordId(result.id);
      await refreshRecords();
      await refreshRecordDetail(result.id);
      setDetailFeedback({
        tone: "success",
        message:
          formMode?.type === "edit"
            ? "Candidatura actualizada correctamente."
            : "Candidatura creada correctamente.",
      });
    } catch (error) {
      setFormFeedback({ tone: "error", message: buildErrorMessage(error) });
    } finally {
      setActiveMutation(null);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRecord || !noteDraft.trim()) {
      return;
    }

    setActiveMutation("adding-note");
    setDetailFeedback({ tone: "loading", message: "Guardando nota interna..." });

    try {
      await createNote(selectedRecord.id, noteDraft.trim());
      setNoteDraft("");
      await refreshRecordDetail(selectedRecord.id);
      await refreshRecords();
      setDetailFeedback({ tone: "success", message: "Nota interna añadida correctamente." });
    } catch (error) {
      setDetailFeedback({ tone: "error", message: buildErrorMessage(error) });
    } finally {
      setActiveMutation(null);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!selectedRecord) {
      return;
    }

    setActiveMutation(`deleting-note-${noteId}`);
    setDetailFeedback({ tone: "loading", message: "Eliminando nota interna..." });

    try {
      await deleteNote(selectedRecord.id, noteId);
      await refreshRecordDetail(selectedRecord.id);
      await refreshRecords();
      setDetailFeedback({ tone: "success", message: "Nota interna eliminada correctamente." });
    } catch (error) {
      setDetailFeedback({ tone: "error", message: buildErrorMessage(error) });
    } finally {
      setActiveMutation(null);
    }
  }

  function openCreateForm() {
    setFormFeedback(null);
    setFormMode({ type: "create" });
    setFormValues(EMPTY_FORM);
  }

  function openEditForm() {
    if (!selectedRecord) {
      return;
    }

    setFormFeedback(null);
    setFormMode({ type: "edit", recordId: selectedRecord.id });
    setFormValues(normalizeFormValues(selectedRecord));
  }

  function handleSelectRecord(recordId: string) {
    setSelectedRecordId(recordId);
    startTransition(() => {
      router.push(buildTrackerHref(recordId, filters), { scroll: false });
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-surface-strong shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 border-b border-border bg-[linear-gradient(135deg,rgba(255,250,243,0.95),rgba(236,253,245,0.92))] px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent shadow-sm">
                Trackflow Talent Ops
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Trackflow Hiring Pipeline
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
                  Gestiona perfiles para las operaciones de Trackflow y entra al detalle por ruta dinámica sin perder el contexto del listado.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Perfiles</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalRecords}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Filtro activo</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {filters.status || filters.stage || filters.search ? "Sí" : "No"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Ruta actual</p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">{pathname}</p>
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                className="rounded-2xl bg-accent px-5 py-3 text-left text-white shadow-[0_14px_30px_rgba(15,118,110,0.28)] hover:bg-accent-strong"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-50/90">Acción rápida</p>
                <p className="mt-2 text-base font-semibold">Nueva candidatura</p>
              </button>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <section className="border-b border-border xl:border-r xl:border-b-0">
              <div className="border-b border-border px-6 py-5 lg:px-8">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.8fr))_auto]">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Buscar
                    </span>
                    <input
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      placeholder="Nombre o email"
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Estado
                    </span>
                    <select
                      value={filters.status}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, status: event.target.value }))
                      }
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Etapa
                    </span>
                    <select
                      value={filters.stage}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, stage: event.target.value }))
                      }
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Todas</option>
                      {STAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilters({ status: "", stage: "", search: "" })}
                    className="rounded-2xl border bg-surface px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Limpiar
                  </button>
                </div>

                {listFeedback ? <FeedbackBanner feedback={listFeedback} className="mt-4" /> : null}
              </div>

              <div className="max-h-[72vh] overflow-y-auto">
                {listLoading ? (
                  <div className="space-y-3 px-6 py-6 lg:px-8">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-3xl border bg-white/70" />
                    ))}
                  </div>
                ) : records.length === 0 ? (
                  <div className="px-6 py-12 text-center lg:px-8">
                    <p className="text-lg font-medium text-slate-900">No hay resultados para estos filtros.</p>
                    <p className="mt-2 text-sm text-muted">
                      Ajusta la búsqueda, el estado o la etapa para volver a cargar candidaturas.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3 px-6 py-6 lg:px-8">
                    {records.map((record) => {
                      const isSelected = record.id === activeRecordId;

                      return (
                        <li key={record.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectRecord(record.id)}
                            className={`w-full rounded-[1.6rem] border px-5 py-4 text-left shadow-sm ${
                              isSelected
                                ? "border-accent bg-emerald-50/80 shadow-[0_16px_40px_rgba(15,118,110,0.12)]"
                                : "bg-white/90 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-lg font-semibold text-slate-900">{record.full_name}</p>
                                  <p className="text-sm text-muted">{record.email}</p>
                                </div>
                                <p className="text-sm font-medium text-slate-700">{record.position}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                  {buildLabel(record.status, STATUS_OPTIONS)}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                  {buildLabel(record.stage, STAGE_OPTIONS)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em] text-muted">
                              <span>{record.notes_count} notas</span>
                              <span>{record.experience_years} años exp.</span>
                              <span>Actualizada {formatDate(record.updated_at)}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,250,243,0.96))]">
              {detailLoading && !selectedRecord ? (
                <div className="space-y-4 px-6 py-8 lg:px-8">
                  <div className="h-10 animate-pulse rounded-2xl bg-white" />
                  <div className="h-48 animate-pulse rounded-3xl bg-white" />
                  <div className="h-56 animate-pulse rounded-3xl bg-white" />
                </div>
              ) : selectedRecord ? (
                <div className="space-y-6 px-6 py-6 lg:px-8">
                  <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                        Ficha de candidatura
                      </p>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                          {selectedRecord.full_name}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{selectedRecord.position}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openEditForm}
                      className="rounded-2xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Editar candidatura
                    </button>
                  </div>

                  {detailFeedback ? <FeedbackBanner feedback={detailFeedback} /> : null}

                  <div className="grid gap-4 rounded-[1.8rem] border bg-white/90 p-5 sm:grid-cols-2">
                    <InfoBlock label="Email" value={selectedRecord.email} />
                    <InfoBlock label="Teléfono" value={selectedRecord.phone} />
                    <InfoBlock label="LinkedIn" value={selectedRecord.linkedin_url || "No disponible"} />
                    <InfoBlock label="CV" value={selectedRecord.cv_url || "No disponible"} />
                    <InfoBlock label="Experiencia" value={`${selectedRecord.experience_years} años`} />
                    <InfoBlock label="Aplicó" value={formatDate(selectedRecord.applied_at)} />
                  </div>

                  <div className="grid gap-4 rounded-[1.8rem] border bg-white/90 p-5 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Estado
                      </span>
                      <select
                        value={selectedRecord.status}
                        disabled={activeMutation === "status"}
                        onChange={(event) => void handleQuickUpdate("status", event.target.value)}
                        className="w-full rounded-2xl border bg-surface px-4 py-3 text-sm outline-none disabled:cursor-wait disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Etapa
                      </span>
                      <select
                        value={selectedRecord.stage}
                        disabled={activeMutation === "stage"}
                        onChange={(event) => void handleQuickUpdate("stage", event.target.value)}
                        className="w-full rounded-2xl border bg-surface px-4 py-3 text-sm outline-none disabled:cursor-wait disabled:opacity-60"
                      >
                        {STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <InfoBlock label="Última actualización" value={formatDate(selectedRecord.updated_at)} />
                    <InfoBlock label="Notas" value={String(selectedNotes.length)} />
                  </div>

                  <PanelCard>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Notas internas</h3>
                        <p className="text-sm text-muted">
                          Añade contexto para el equipo y elimina lo que ya no aporte valor.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleAddNote} className="mt-4 space-y-3">
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Escribe una nota útil para el siguiente paso del proceso"
                        rows={4}
                        className="w-full rounded-3xl border bg-surface px-4 py-3 text-sm outline-none placeholder:text-slate-400"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={activeMutation === "adding-note" || !noteDraft.trim()}
                          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeMutation === "adding-note" ? "Guardando nota..." : "Añadir nota"}
                        </button>
                      </div>
                    </form>

                    <div className="mt-5 space-y-3">
                      {selectedNotes.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-surface px-4 py-6 text-sm text-muted">
                          Esta candidatura aún no tiene notas internas.
                        </div>
                      ) : (
                        selectedNotes.map((note) => (
                          <article key={note.id} className="rounded-3xl border bg-surface p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm leading-6 text-slate-700">{note.content}</p>
                                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted">
                                  {formatDate(note.created_at)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleDeleteNote(note.id)}
                                disabled={activeMutation === `deleting-note-${note.id}`}
                                className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-danger hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                              >
                                Eliminar
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </PanelCard>
                </div>
              ) : (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center lg:px-8">
                  <div className="max-w-sm space-y-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      Selecciona una candidatura
                    </h2>
                    <p className="text-sm leading-6 text-muted">
                      El detalle se abrirá aquí manteniendo visible el contexto del listado y sus filtros.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {formMode ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {formMode.type === "create" ? "Nueva candidatura" : "Editar candidatura"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {formMode.type === "create"
                    ? "Registrar nuevo perfil"
                    : "Corregir datos del candidato"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="rounded-2xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre completo"
                  value={formValues.full_name}
                  onChange={(value) => setFormValues((current) => ({ ...current, full_name: value }))}
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={formValues.email}
                  onChange={(value) => setFormValues((current) => ({ ...current, email: value }))}
                  required
                />
                <Field
                  label="Teléfono"
                  value={formValues.phone}
                  onChange={(value) => setFormValues((current) => ({ ...current, phone: value }))}
                  required
                />
                <Field
                  label="Puesto"
                  value={formValues.position}
                  onChange={(value) => setFormValues((current) => ({ ...current, position: value }))}
                  required
                />
                <Field
                  label="LinkedIn"
                  value={formValues.linkedin_url}
                  onChange={(value) => setFormValues((current) => ({ ...current, linkedin_url: value }))}
                />
                <Field
                  label="CV"
                  value={formValues.cv_url}
                  onChange={(value) => setFormValues((current) => ({ ...current, cv_url: value }))}
                />
                <Field
                  label="Años de experiencia"
                  type="number"
                  step="0.5"
                  value={formValues.experience_years}
                  onChange={(value) =>
                    setFormValues((current) => ({ ...current, experience_years: value }))
                  }
                  required
                />
              </div>

              {formFeedback ? <FeedbackBanner feedback={formFeedback} /> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="rounded-2xl border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activeMutation === "saving-edit" || activeMutation === "saving-create"}
                  className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
                >
                  {activeMutation === "saving-edit" || activeMutation === "saving-create"
                    ? "Guardando..."
                    : formMode.type === "create"
                      ? "Crear candidatura"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}