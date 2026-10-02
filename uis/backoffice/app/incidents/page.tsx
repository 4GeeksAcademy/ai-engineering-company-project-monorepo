"use client";

import { useState } from "react";
import FileDropzone from "../../components/FileDropzone";
import {
  parseCSV,
  analyzeIncidents,
  type AnalysisResults,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_ICONS,
  SCORE_LABELS,
  SCORE_COLORS,
} from "../../lib/incidents";

export default function IncidentsPage() {
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileLoaded = (content: string, name: string) => {
    setFileName(name);
    const rows = parseCSV(content);
    const analysis = analyzeIncidents(rows);
    setResults(analysis);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incidents Analysis</h1>
        <p className="text-sm text-gray-500">
          Upload a CSV to analyze operational incidents across all locations
        </p>
      </div>

      {/* Upload Zone */}
      <FileDropzone onFileLoaded={handleFileLoaded} />

      {/* Results */}
      {results && (
        <>
          {/* Source File Banner */}
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg">📄</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{fileName}</p>
                <p className="text-xs text-gray-400">
                  {results.totalRows.toLocaleString()} records analyzed
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards — General Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Records</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {results.totalRows.toLocaleString()}
                  </p>
                </div>
                <span className="text-2xl">📊</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valid Records</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {results.validCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {((results.validCount / results.totalRows) * 100).toFixed(1)}% of total
                  </p>
                </div>
                <span className="text-2xl">✅</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Invalid Records</p>
                  <p className="mt-2 text-3xl font-bold text-red-500">
                    {results.invalidCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {((results.invalidCount / results.totalRows) * 100).toFixed(1)}% of total
                  </p>
                </div>
                <span className="text-2xl">⚠️</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Satisfaction</p>
                  <p className="mt-2 text-3xl font-bold text-brasa-brown">
                    {results.avgScore.toFixed(2)}
                    <span className="text-lg text-gray-400"> / 5</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {results.totalScored} scored of {results.totalClosed} closed
                  </p>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">Status Breakdown</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(["OPEN", "CLOSED", "DISCARDED"] as const).map((status) => {
                const count = results.statusCounts[status] || 0;
                const pct = results.validCount > 0 ? (count / results.validCount) * 100 : 0;
                return (
                  <div
                    key={status}
                    className={`rounded-xl border p-5 ${STATUS_COLORS[status]}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{STATUS_ICONS[status]}</span>
                        <span className="text-sm font-semibold">{status}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-current opacity-30"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs opacity-60">{pct.toFixed(1)}% of valid records</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">Category Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(results.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => {
                  const pct = results.validCount > 0 ? (count / results.validCount) * 100 : 0;
                  const maxCount = Math.max(...Object.values(results.categoryCounts));
                  const barWidth = (count / maxCount) * 100;
                  return (
                    <div
                      key={category}
                      className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <span className="text-xl">
                        {CATEGORY_ICONS[category] || "📌"}
                      </span>
                      <div className="min-w-[140px]">
                        <p className="text-sm font-semibold text-gray-800">
                          {CATEGORY_LABELS[category] || category}
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-brasa-red transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="min-w-[60px] text-right">
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                        <span className="ml-1 text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Invalid Records Breakdown */}
          {results.invalidReasons.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold text-gray-900">
                Invalid Records
                <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  {results.invalidCount}
                </span>
              </h3>
              <div className="space-y-2">
                {results.invalidReasons.map((reason) => (
                  <div
                    key={reason.rule}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-sm text-gray-700">{reason.label}</span>
                    </div>
                    <span className="text-sm font-bold text-red-500">{reason.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Satisfaction Index */}
          {results.totalScored > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold text-gray-900">
                Satisfaction Index
                <span className="ml-2 text-sm font-normal text-gray-400">
                  Closed cases only
                </span>
              </h3>

              {/* Average Score Banner */}
              <div className="mb-6 flex items-center gap-4 rounded-xl bg-brasa-brown/5 px-6 py-4">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="text-3xl font-bold text-brasa-brown">
                    {results.avgScore.toFixed(2)}
                    <span className="text-base font-normal text-gray-400"> / 5.00</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Based on {results.totalScored} scored records
                  </p>
                </div>
              </div>

              {/* Score Distribution */}
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((score) => {
                  const count = results.scoreCounts[score] || 0;
                  const pct = results.totalScored > 0 ? (count / results.totalScored) * 100 : 0;
                  const maxCount = Math.max(...Object.values(results.scoreCounts), 1);
                  const barWidth = (count / maxCount) * 100;
                  return (
                    <div key={score} className="flex items-center gap-4">
                      <div className="flex w-28 items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{score}</span>
                        <span className="text-xs text-gray-400 truncate">
                          {SCORE_LABELS[score]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${SCORE_COLORS[score]}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="min-w-[50px] text-right">
                        <span className="text-sm font-semibold text-gray-700">{count}</span>
                        <span className="ml-1 text-xs text-gray-400">
                          ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state if no valid records */}
          {results.validCount === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="mt-4 text-sm font-medium text-gray-500">
                No valid records found. Please check the CSV format.
              </p>
            </div>
          )}
        </>
      )}

      {/* Pre-upload state */}
      {!results && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-4 text-sm font-medium text-gray-500">
            Upload an incidents CSV to see the analysis dashboard
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Expected columns: incident_id, date, location_id, category, description, status, customer_id, satisfaction_score, reporter_id
          </p>
        </div>
      )}
    </div>
  );
}
