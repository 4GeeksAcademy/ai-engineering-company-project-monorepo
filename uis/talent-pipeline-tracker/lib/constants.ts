import type { Stage, Status } from "@/types";

export const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "received", label: "Recibida" },
  { value: "in_progress", label: "En proceso" },
  { value: "selected", label: "Seleccionada" },
  { value: "discarded", label: "Descartada" },
];

export const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "review", label: "En revisión" },
  { value: "personal_interview", label: "Entrevista personal" },
  { value: "technical_interview", label: "Entrevista técnica" },
  { value: "offer_presented", label: "Oferta presentada" },
];

export const STATUS_LABELS: Record<Status, string> = Object.fromEntries(
  STATUS_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<Status, string>;

export const STAGE_LABELS: Record<Stage, string> = Object.fromEntries(
  STAGE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<Stage, string>;

export const STATUS_COLORS: Record<Status, string> = {
  received: "bg-sky-100 text-sky-800 border-sky-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  selected: "bg-emerald-100 text-emerald-800 border-emerald-200",
  discarded: "bg-rose-100 text-rose-800 border-rose-200",
};

export const STAGE_COLORS: Record<Stage, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-200",
  review: "bg-blue-100 text-blue-800 border-blue-200",
  personal_interview: "bg-violet-100 text-violet-800 border-violet-200",
  technical_interview: "bg-indigo-100 text-indigo-800 border-indigo-200",
  offer_presented: "bg-orange-100 text-orange-800 border-orange-200",
};

export const COMPANY_NAME = "Brasaland";
export const DEPARTMENT_NAME = "People & Talent";
