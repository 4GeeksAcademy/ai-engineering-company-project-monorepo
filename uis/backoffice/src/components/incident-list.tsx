"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  formatWhen,
  labelFor,
  readFailure,
  type Incident,
} from "@/lib/incidents";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function IncidentList() {
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [branch, setBranch] = useState("");
  const [rows, setRows] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (origin) params.set("origin", origin);
      if (branch) params.set("branch", branch);
      const query = params.toString();
      try {
        const response = await fetch(query ? `/api/incidents?${query}` : "/api/incidents");
        if (!response.ok) {
          const failure = await readFailure(response, "The incident list could not be loaded.");
          if (!cancelled) {
            setRows([]);
            setError(failure.message);
          }
          return;
        }
        const payload = (await response.json()) as Incident[];
        if (!cancelled) setRows(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError("The incident list could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status, origin, branch, reloadKey]);

  async function changeStatus(incident: Incident, next: string) {
    const previous = incident.status;
    if (next === previous) return;
    setStatusMessage("");
    setSavingId(incident.id);
    setRows((current) => current.map((row) => (row.id === incident.id ? { ...row, status: next } : row)));
    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const failure = await readFailure(
          response,
          "The status could not be changed. The incident was returned to the previous status.",
        );
        setRows((current) => current.map((row) => (row.id === incident.id ? { ...row, status: previous } : row)));
        setStatusMessage(`${failure.message} The incident was returned to the previous status.`);
        return;
      }
      const updated = (await response.json()) as Incident;
      setRows((current) => current.map((row) => (row.id === incident.id ? updated : row)));
    } catch {
      setRows((current) => current.map((row) => (row.id === incident.id ? { ...row, status: previous } : row)));
      setStatusMessage("The status could not be changed. The incident was returned to the previous status.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = Boolean(status || origin || branch);
  const emptyMessage = filtered
    ? "No incidents match the selected filters."
    : "No incidents have been registered yet.";

  return (
    <Card data-testid="incident-list">
      <CardHeader>
        <CardTitle>Incident list</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Filter label="Status" value={status} options={STATUSES} allLabel="All statuses" onChange={setStatus} />
          <Filter label="Origin" value={origin} options={ORIGINS} allLabel="All origins" onChange={setOrigin} />
          <Filter label="Branch" value={branch} options={BRANCHES} allLabel="All clinics" onChange={setBranch} />
        </div>

        {statusMessage ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {statusMessage}
          </p>
        ) : null}
        {loading ? <p role="status">Loading incidents…</p> : null}
        {!loading && error ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && rows.length === 0 ? <p>{emptyMessage}</p> : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      <p className="font-medium">{incident.title}</p>
                      <p className="mt-1 text-muted-foreground">{incident.description}</p>
                    </TableCell>
                    <TableCell>{labelFor(CATEGORIES, incident.category)}</TableCell>
                    <TableCell>{labelFor(ORIGINS, incident.origin)}</TableCell>
                    <TableCell>{labelFor(BRANCHES, incident.branch)}</TableCell>
                    <TableCell>{formatWhen(incident.created_at)}</TableCell>
                    <TableCell>
                      <select
                        className={selectClass}
                        aria-label={`Status for ${incident.title}`}
                        value={incident.status}
                        disabled={savingId === incident.id}
                        onChange={(event) => void changeStatus(incident, event.target.value)}
                      >
                        {STATUSES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Filter({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <select className={`${selectClass} w-full`} value={value} aria-label={`Filter by ${label.toLowerCase()}`} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
