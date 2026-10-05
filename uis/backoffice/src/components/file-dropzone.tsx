"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function FileDropzone({ disabled, onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function accept(file: File | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        accept(event.dataTransfer.files[0]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
        dragOver
          ? "border-primary bg-accent"
          : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <Upload className="mb-3 size-8 text-muted-foreground" />
      <p className="font-medium">Drop the incident CSV here</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Or click to choose a file.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
