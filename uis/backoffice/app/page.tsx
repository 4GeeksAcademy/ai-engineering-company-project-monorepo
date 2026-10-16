"use client";

import { useMemo, useState } from "react";

type AppOption = {
  id: string;
  label: string;
  description: string;
  path: string;
};

const APP_OPTIONS: AppOption[] = [
  {
    id: "suppliers",
    label: "Supplier Directory",
    description: "Manage TrackFlow suppliers, rates, and suspension status.",
    path: "/suppliers",
  },
  {
    id: "incident-file-analyzer",
    label: "Incident File Analyzer",
    description: "Upload incidents CSV and review quality and CX metrics.",
    path: "/incident-file-analyzer",
  },
  {
    id: "website",
    label: "Website",
    description: "Open the public company website route.",
    path: "/website",
  },
  {
    id: "talent-pipeline-tracker",
    label: "Talent Pipeline Tracker",
    description: "Open the hiring tracker route.",
    path: "/talent-pipeline-tracker",
  },
];

export default function Page() {
  const [selectedId, setSelectedId] = useState<string>(APP_OPTIONS[0].id);
  const selected = useMemo(
    () => APP_OPTIONS.find((option) => option.id === selectedId) ?? APP_OPTIONS[0],
    [selectedId],
  );

  return (
    <main>
      <h1>TrackFlow Backoffice</h1>
      <p>
        Operations Home for internal application routing. Choose an app and continue
        from the launcher.
      </p>

      <section className="panel">
        <h2>Application Launcher</h2>
        <label htmlFor="appSelector">Choose app</label>
        <select
          id="appSelector"
          className="selector"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {APP_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="launcher-note">{selected.description}</p>

        <div className="actions">
          <a href={selected.path} className="launcher-link">
            Open {selected.label}
          </a>
        </div>
      </section>
    </main>
  );
}
