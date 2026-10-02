"use client";

import { useCallback, useRef, useState } from "react";

interface FileDropzoneProps {
  onFileLoaded: (content: string, filename: string) => void;
  loading?: boolean;
}

export default function FileDropzone({ onFileLoaded, loading }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a CSV file.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          onFileLoaded(text, file.name);
        }
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onClick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? "border-brasa-red bg-brasa-red/5 scale-[1.01]"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      } ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={onChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Upload icon */}
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
            isDragging ? "bg-brasa-red/10 text-brasa-red" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-500"
          }`}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {fileName ? (
          <>
            <p className="text-sm font-medium text-gray-700">
              Loaded: <span className="text-brasa-red">{fileName}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">Drop another file to re-analyze</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700">
              Drop your <span className="text-brasa-red">incidents CSV</span> here
            </p>
            <p className="mt-1 text-xs text-gray-400">
              or click to browse — supports standard Brasaland CSV format
            </p>
          </>
        )}
      </div>
    </div>
  );
}
