import type { CandidateFormValues, StageOption, StatusOption } from "@/types/tracker";

export const API_BASE =
  process.env.NEXT_PUBLIC_TRACKER_API_BASE ??
  "https://playground.4geeks.com/tracker/api/v1";

export const STATUS_OPTIONS: readonly StatusOption[] = [
  { value: "received", label: "Recibida" },
  { value: "in_progress", label: "En proceso" },
  { value: "selected", label: "Seleccionada" },
  { value: "discarded", label: "Descartada" },
] as const;

export const STAGE_OPTIONS: readonly StageOption[] = [
  { value: "pending", label: "Pendiente" },
  { value: "review", label: "Revisión" },
  { value: "personal_interview", label: "Entrevista personal" },
  { value: "technical_interview", label: "Entrevista técnica" },
  { value: "offer_presented", label: "Oferta presentada" },
] as const;

export const EMPTY_FORM: CandidateFormValues = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: "",
};