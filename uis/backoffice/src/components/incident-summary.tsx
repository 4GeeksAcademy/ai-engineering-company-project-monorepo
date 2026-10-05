"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  labelFor,
  readFailure,
  type IncidentSummary,
} from "@/lib/incidents";

const GROUPS = [
  { key: "by_status" as const, title: "By status", options: STATUSES },
  { key: "by_category" as const, title: "By category", options: CATEGORIES },
  { key: "by_origin" as const, title: "By origin", options: ORIGINS },
  { key: "by_branch" as const, title: "By branch", options: BRANCHES },
];

export function IncidentSummaryPanel() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/incidents/summary");
        if (!response.ok) {
          const failure = await readFailure(response, "Summary metrics could not be loaded.");
          if (!cancelled) {
            setSummary(null);
            setError(failure.message);
          }
          return;
        }
        const payload = (await response.json()) as IncidentSummary;
        if (!cancelled) setSummary(payload);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setError("Summary metrics could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <Card data-testid="incident-summary">
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p role="status">Loading summary metrics…</p> : null}
        {!loading && error ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && summary ? (
          <div className="grid gap-4 md:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.key} className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-sm font-semibold">{group.title}</h3>
                <dl className="space-y-1">
                  {group.options.map((item) => (
                    <div key={item.value} className="flex items-center justify-between gap-3 text-sm">
                      <dt>{labelFor(group.options, item.value)}</dt>
                      <dd className="font-medium tabular-nums">{summary[group.key]?.[item.value] ?? 0}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
