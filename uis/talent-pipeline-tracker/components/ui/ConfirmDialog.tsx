"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-full mx-auto max-w-md mt-5 rounded-xl border border-white/10 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/60"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-md border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
