export const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "discarded", label: "Discarded" },
] as const;

export const ORIGINS = [
  { value: "customer", label: "Customer" },
  { value: "branch", label: "Branch" },
  { value: "internal", label: "Internal" },
] as const;

export const CATEGORIES = [
  { value: "clinical_equipment", label: "Clinical equipment" },
  { value: "it_system", label: "IT system" },
  { value: "billing_error", label: "Billing error" },
  { value: "compliance_breach", label: "Compliance breach" },
  { value: "patient_experience", label: "Patient experience" },
  { value: "staff_issue", label: "Staff issue" },
  { value: "facility_issue", label: "Facility issue" },
  { value: "referral_issue", label: "Referral issue" },
  { value: "other", label: "Other" },
] as const;

export const BRANCHES = [
  { value: "central", label: "Central — Austin Main Clinic" },
  { value: "austin_north", label: "Austin — North" },
  { value: "dallas_uptown", label: "Dallas Uptown" },
  { value: "houston_med_center", label: "Houston Medical Center" },
  { value: "san_antonio_west", label: "San Antonio West" },
  { value: "miami_brickell", label: "Miami Brickell" },
  { value: "miami_doral", label: "Miami Doral" },
  { value: "orlando_east", label: "Orlando East" },
  { value: "tampa_bay", label: "Tampa Bay" },
  { value: "atlanta_midtown", label: "Atlanta Midtown" },
  { value: "savannah", label: "Savannah" },
  { value: "london_city", label: "London City" },
  { value: "london_west", label: "London West End" },
  { value: "manchester_central", label: "Manchester Central" },
] as const;

export type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
};

export type IncidentSummary = {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

export type FieldError = {
  field: string;
  message: string;
};

const FALLBACK = "The request could not be completed. Please try again.";

export function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((item) => item.value === value)?.label ?? value;
}

export function plainMessage(value: unknown, fallback = FALLBACK): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || text.length > 180) return fallback;
  if (/[<>{}]|traceback|exception|stack trace|sqlite|syntaxerror/i.test(text)) return fallback;
  return text;
}

export async function readFailure(response: Response, fallback = FALLBACK): Promise<{ message: string; errors: FieldError[] }> {
  try {
    const payload = (await response.json()) as {
      field?: unknown;
      message?: unknown;
      error?: unknown;
      errors?: unknown;
    };
    const errors: FieldError[] = [];
    if (Array.isArray(payload.errors)) {
      for (const item of payload.errors) {
        if (!item || typeof item !== "object") continue;
        const field = "field" in item ? item.field : undefined;
        const message = "message" in item ? item.message : undefined;
        if (typeof field === "string" && typeof message === "string") {
          errors.push({ field, message: plainMessage(message, fallback) });
        }
      }
    }
    if (errors.length === 0 && typeof payload.field === "string") {
      const message = plainMessage(payload.message ?? payload.error, fallback);
      errors.push({ field: payload.field, message });
    }
    const fromMessage = plainMessage(payload.message, "");
    const fromError = plainMessage(payload.error, "");
    const message = errors[0]?.message ?? (fromMessage || fromError || fallback);
    return { message, errors };
  } catch {
    return { message: fallback, errors: [] };
  }
}

export function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}
