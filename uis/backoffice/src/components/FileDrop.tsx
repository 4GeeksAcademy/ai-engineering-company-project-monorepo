"use client";

import { ChangeEvent, DragEvent, useState } from "react";

type Props = { disabled?: boolean; onFile: (file: File) => void };

export function FileDrop({ disabled = false, onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  function pick(file: File | undefined) {
    if (!file || disabled) return;
    setFileName(file.name);
    onFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    pick(event.target.files?.[0]);
    event.target.value = ""; // allow re-uploading the same file
  }

  return (
    <label
      htmlFor="incidents-csv"
      className={`drop${dragging ? " dragging" : ""}${disabled ? " disabled" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <strong>Arrastra aquí el CSV de incidencias</strong>
      <span>o haz clic para seleccionarlo</span>
      {fileName && <span className="muted">Último archivo: {fileName}</span>}
      <input id="incidents-csv" type="file" accept=".csv,text/csv" onChange={onChange} disabled={disabled} className="visually-hidden" />
    </label>
  );
}
