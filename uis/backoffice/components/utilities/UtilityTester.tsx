"use client";

import { useMemo, useState } from "react";
import {
  getUtilityHint,
  getUtilityTemplate,
  runUtilityFunction,
  stringifyUtilityResult,
  utilityFunctionNames,
  type FunctionRunnerInput,
} from "@healthcore/utility-registry";

export function UtilityTester() {
  const [functionName, setFunctionName] = useState("");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<{ kind: "info" | "success" | "error"; message: string }>({
    kind: "info",
    message: "Ready to run. Select a function and provide JSON input, or load the fixture template.",
  });

  const hint = useMemo(
    () => (functionName ? getUtilityHint(functionName, "en") : undefined),
    [functionName]
  );

  function loadTemplate() {
    if (!functionName) {
      setStatus({ kind: "error", message: "Select a utility function first." });
      return;
    }
    const template = getUtilityTemplate(functionName);
    if (!template) {
      setStatus({ kind: "error", message: "No template found for this function." });
      return;
    }
    setInputText(JSON.stringify(template, null, 2));
    setStatus({ kind: "info", message: "Fixture template loaded." });
  }

  function runTest() {
    if (!functionName) {
      setStatus({ kind: "error", message: "Select a utility function first." });
      return;
    }
    if (!inputText.trim()) {
      setStatus({ kind: "error", message: "Provide JSON input or load a template." });
      return;
    }

    try {
      const parsed = JSON.parse(inputText) as FunctionRunnerInput;
      const output = runUtilityFunction(functionName, parsed);
      setResult(stringifyUtilityResult(output));
      setStatus({ kind: "success", message: "Function executed successfully." });
    } catch (error) {
      setResult("");
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Function execution failed.",
      });
    }
  }

  function clearAll() {
    setInputText("");
    setResult("");
    setStatus({ kind: "info", message: "Ready to run." });
  }

  const statusColors = {
    info: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-teal-200 bg-teal-50 text-teal-900",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-slate-900">Utility function tester</h2>
        <p className="mt-2 text-slate-600">
          Manually execute Milestone 2 TypeScript utilities with JSON input or fixture templates from{" "}
          <code className="rounded bg-slate-100 px-1">tests/utils/fixtures.ts</code>.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="font-medium text-slate-800">Function to test</span>
            <select
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Select a function</option>
              {utilityFunctionNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          {hint ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium">Expected input:</span> {hint}
            </p>
          ) : null}

          <label className="block">
            <span className="font-medium text-slate-800">JSON input</span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              spellCheck={false}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTemplate}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Load fixture template
            </button>
            <button
              type="button"
              onClick={runTest}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Run function
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          <p className={`rounded-md border p-3 text-sm ${statusColors[status.kind]}`} role="status">
            {status.message}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900">Output</h3>
          <pre className="mt-3 max-h-[32rem] overflow-auto rounded-md bg-slate-900 p-4 text-sm text-slate-100">
            {result || "Results appear here after a successful run."}
          </pre>
        </div>
      </div>
    </div>
  );
}
