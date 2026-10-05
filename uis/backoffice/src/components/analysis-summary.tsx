"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  CATEGORY_LABELS,
  COUNTRY_LABELS,
  REASON_LABELS,
  SCORE_LABELS,
  STATUS_LABELS,
  labelFor,
} from "@/lib/labels";
import type { AnalysisResult } from "@/lib/types";

type AnalysisSummaryProps = {
  result: AnalysisResult;
  exporting: boolean;
  onExport: () => void;
};

function BreakdownTable({
  title,
  description,
  data,
  labels,
  total,
}: {
  title: string;
  description: string;
  data: Record<string, number>;
  labels: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No valid records to break down.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(([key, count]) => {
              const pct = total ? Math.round((count / total) * 1000) / 10 : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{labelFor(labels, key)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalysisSummary({
  result,
  exporting,
  onExport,
}: AnalysisSummaryProps) {
  const avg =
    result.avg_satisfaction_closed === null
      ? "n/a"
      : result.avg_satisfaction_closed.toFixed(2);
  const scoreEntries = Object.entries(result.satisfaction_by_score).sort(
    ([left], [right]) => Number(left) - Number(right),
  );

  return (
    <div className="space-y-6">
      {result.invalid_count > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTitle>
            {result.invalid_count} invalid record
            {result.invalid_count === 1 ? "" : "s"}
          </AlertTitle>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Analysis summary</h2>
          <p className="text-sm text-muted-foreground">
            File processed: <span className="font-mono">{result.source_name}</span>
          </p>
        </div>
        <Button onClick={onExport} disabled={exporting} size="lg">
          <Download data-icon="inline-start" />
          {exporting ? "Preparing CSV…" : "Download results CSV"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Records processed" value={result.total_rows} hint="Valid + invalid" />
        <MetricCard label="Valid records" value={result.valid_count} hint="Used for metrics" />
        <MetricCard
          label="Invalid records"
          value={result.invalid_count}
          hint="Excluded from totals below"
        />
        <MetricCard
          label="Avg. satisfaction (closed)"
          value={avg}
          hint={`${result.satisfaction_sample_size} of ${result.closed_valid_count} closed cases scored`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="By incident category"
          description="Valid records only"
          data={result.by_category}
          labels={CATEGORY_LABELS}
          total={result.valid_count}
        />
        <BreakdownTable
          title="By status"
          description="Valid records only"
          data={result.by_status}
          labels={STATUS_LABELS}
          total={result.valid_count}
        />
        <BreakdownTable
          title="By country"
          description="Valid records only"
          data={result.by_country}
          labels={COUNTRY_LABELS}
          total={result.valid_count}
        />
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction scores</CardTitle>
            <CardDescription>Closed cases with a recorded score (1–5)</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No closed cases included a satisfaction score.
              </p>
            ) : (
              <div className="space-y-3">
                {scoreEntries.map(([score, count]) => {
                  const total = result.satisfaction_sample_size || 1;
                  const pct = Math.round((count / total) * 1000) / 10;
                  return (
                    <div key={score}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span>
                          Score {score} ({labelFor(SCORE_LABELS, score)})
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invalid records</CardTitle>
          <CardDescription>By validation rule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.invalid_count === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every row passed validation. No records were excluded.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.invalid_by_reason).map(([reason, count]) => (
                  <Badge key={reason} variant="secondary">
                    {labelFor(REASON_LABELS, reason)}: {count}
                  </Badge>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV row</TableHead>
                    <TableHead>Incident ID</TableHead>
                    <TableHead>Why it was excluded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.invalid_records.map((item) => (
                    <TableRow key={`${item.row_number}-${item.incident_id}`}>
                      <TableCell className="tabular-nums">{item.row_number}</TableCell>
                      <TableCell className="font-mono">
                        {item.incident_id || "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {item.details.join("; ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
