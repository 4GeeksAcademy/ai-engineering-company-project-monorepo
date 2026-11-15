"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CandidateForm } from "@/src/lib/candidate-form";
import { createCandidate, listCandidates } from "@/src/lib/api";
import { STAGE_LABELS, STATUS_LABELS, STAGES, STATUSES, type Candidate, type CandidatePayload } from "@/src/lib/types";

function Tracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCandidates(await listCandidates());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load candidates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setFilter(key: "status" | "stage", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return candidates.filter((candidate) =>
      (!status || candidate.status === status) && (!stage || candidate.stage === stage) &&
      (!term || candidate.name.toLocaleLowerCase().includes(term) || candidate.email.toLocaleLowerCase().includes(term)),
    );
  }, [candidates, query, stage, status]);

  async function register(payload: CandidatePayload) {
    await createCandidate(payload);
    setShowForm(false);
    setNotice("Candidate registered successfully.");
    await load();
  }

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">H</span><span>HealthCore <small>PEOPLE OPERATIONS</small></span></Link><span className="topbar-note"><span className="online-dot" /> Austin headquarters · Talent team</span></header>
    <section className="hero"><div><p className="eyebrow">HEALTHCORE DIGITAL <span>·</span> PEOPLE &amp; TALENT <span>·</span> AUSTIN</p><h1>Talent pipeline</h1><p className="hero-copy">Manage the Executive Assistant search with a clear view of every candidate and next step. Handle candidate information with discretion.</p></div><button className="button primary" onClick={() => { setNotice(""); setShowForm(true); }}>＋ <span>Register candidate</span></button></section>
    <section className="metric-row" aria-label="Pipeline summary"><article className="metric-card"><span>Total candidates</span><strong>{loading ? "—" : candidates.length}</strong><small>In this search</small></article><article className="metric-card"><span>In progress</span><strong>{loading ? "—" : candidates.filter((c) => c.status === "in_progress").length}</strong><small>Active applications</small></article><article className="metric-card"><span>Interviews</span><strong>{loading ? "—" : candidates.filter((c) => c.stage === "personal_interview" || c.stage === "technical_interview").length}</strong><small>Interview stage</small></article><article className="metric-card accent"><span>Selected</span><strong>{loading ? "—" : candidates.filter((c) => c.status === "selected").length}</strong><small>Successful candidates</small></article></section>
    {notice && <p className="feedback success" role="status">{notice}</p>}
    <section className="list-panel"><div className="list-heading"><div><p className="eyebrow">CANDIDATE DIRECTORY</p><h2>All candidates <span className="count-pill">{filtered.length}</span></h2></div><button className="button secondary compact" onClick={() => void load()} disabled={loading}>↻ <span>Refresh</span></button></div>
      <div className="filters"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search by name or email" placeholder="Search name or email…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="filter-label">Status<select aria-label="Filter by status" value={STATUSES.includes(status as (typeof STATUSES)[number]) ? status : ""} onChange={(e) => setFilter("status", e.target.value)}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label><label className="filter-label">Stage<select aria-label="Filter by stage" value={STAGES.includes(stage as (typeof STAGES)[number]) ? stage : ""} onChange={(e) => setFilter("stage", e.target.value)}><option value="">All stages</option>{STAGES.map((item) => <option key={item} value={item}>{STAGE_LABELS[item]}</option>)}</select></label></div>
      {error && <div className="feedback error" role="alert"><span>{error}</span><button className="text-button" onClick={() => void load()}>Try again</button></div>}
      {loading ? <div className="loading-state"><span className="spinner" />Loading candidate records…</div> : !error && filtered.length === 0 ? <div className="empty-state"><span className="empty-icon">⌕</span><h3>{candidates.length ? "No candidates match these filters" : "No candidates yet"}</h3><p>{candidates.length ? "Try changing your search or filters." : "Register a referred candidate to get your pipeline started."}</p>{!candidates.length && <button className="button primary" onClick={() => setShowForm(true)}>Register first candidate</button>}</div> : !error && <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Position</th><th>Status</th><th>Stage</th><th>Applied</th><th><span className="sr-only">Open details</span></th></tr></thead><tbody>{filtered.map((candidate) => <tr key={candidate.id}><td><Link className="candidate-cell" href={`/candidates/${encodeURIComponent(candidate.id)}`}><span className="avatar">{candidate.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span><strong>{candidate.name}</strong><small>{candidate.email}</small></span></Link></td><td>{candidate.position}</td><td><span className={`status-badge status-${candidate.status}`}>{STATUS_LABELS[candidate.status]}</span></td><td><span className="stage-indicator"><i />{STAGE_LABELS[candidate.stage]}</span></td><td>{candidate.application_date ? new Date(`${candidate.application_date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td><td><Link className="row-link" href={`/candidates/${encodeURIComponent(candidate.id)}`} aria-label={`View ${candidate.name}`}>→</Link></td></tr>)}</tbody></table></div>}
      <footer className="table-footer"><span>Showing {filtered.length} of {candidates.length} candidates</span><span>HealthCore · Confidential</span></footer>
    </section>
    <footer className="page-footer"><span>HealthCore Digital · People Operations</span><span>Candidate information is confidential</span></footer>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="candidate-form-title"><CandidateForm onSubmit={register} onCancel={() => setShowForm(false)} /></div></div>}
  </main>;
}

export default function Home() {
  return <Suspense fallback={<main className="shell"><div className="loading-state"><span className="spinner" />Loading talent pipeline…</div></main>}><Tracker /></Suspense>;
}
