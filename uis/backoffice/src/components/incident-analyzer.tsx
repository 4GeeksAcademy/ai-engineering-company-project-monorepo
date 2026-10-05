"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AnalysisSummary } from "@/components/analysis-summary";
import { FileDropzone } from "@/components/file-dropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeIncidents, downloadResultsCsv } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

export function IncidentAnalyzer() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    setExportError(null);
    setResult(null);
    setLoading(true);
    try {
      const next = await analyzeIncidents(file);
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      await downloadResultsCsv();
    } catch (caught) {
      setExportError(
        caught instanceof Error ? caught.message : "Could not download results.csv.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Incident analyzer</h2>
      </div>

      <FileDropzone disabled={loading} onFile={handleFile} />

      {fileName && (
        <p className="text-sm text-muted-foreground">
          Selected file: <span className="font-mono text-foreground">{fileName}</span>
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <LoaderCircle className="size-4 animate-spin" />
          Analysing file…
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>The file could not be analysed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {exportError && (
        <Alert variant="destructive">
          <AlertTitle>CSV export failed</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && !result && (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          No analysis yet. Upload a CSV to see the summary.
        </div>
      )}

      {result && (
        <AnalysisSummary result={result} exporting={exporting} onExport={handleExport} />
      )}
    </div>
  );
}
