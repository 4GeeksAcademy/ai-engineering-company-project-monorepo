import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface CsvUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function CsvUploader({ onFileSelected, disabled }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Subir archivo CSV de incidentes"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
        disabled
          ? "cursor-not-allowed border-slate-800 opacity-50"
          : isDragging
            ? "border-cyan-400 bg-cyan-400/10"
            : "border-slate-700 bg-slate-900 hover:border-slate-500"
      }`}
    >
      <UploadCloud className="text-cyan-400" size={36} />
      <p className="mt-4 text-lg font-semibold text-white">
        Arrastra el CSV de incidentes aquí
      </p>
      <p className="mt-1 text-sm text-slate-400">o haz clic para seleccionar un archivo</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
