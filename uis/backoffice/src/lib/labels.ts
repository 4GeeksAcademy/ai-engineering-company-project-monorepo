export const CATEGORY_LABELS: Record<string, string> = {
  APPOINTMENT: "APPOINTMENT",
  BILLING: "BILLING",
  CLINICAL_CARE: "CLINICAL_CARE",
  ACCESSIBILITY: "ACCESSIBILITY",
  ADMINISTRATIVE: "ADMINISTRATIVE",
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  DISCARDED: "DISCARDED",
};

export const COUNTRY_LABELS: Record<string, string> = {
  US: "US",
  UK: "UK",
};

export const REASON_LABELS: Record<string, string> = {
  invalid_clinic_id: "Invalid or missing clinic_id",
  country_clinic_mismatch: "Country/clinic mismatch",
  invalid_category: "Invalid or missing category",
  empty_description: "Empty or too-short description",
  missing_patient_id: "Missing patient_id",
  closed_no_score: "Closed case, no score",
  score_out_of_range: "Satisfaction score out of range",
  invalid_status: "Invalid or missing status",
  invalid_incident_id: "Invalid or missing incident_id",
  invalid_date: "Invalid or missing date",
  invalid_country: "Invalid or missing country",
};

export const SCORE_LABELS: Record<string, string> = {
  "1": "Very dissatisfied",
  "2": "Dissatisfied",
  "3": "Neutral",
  "4": "Satisfied",
  "5": "Very satisfied",
};

export function labelFor(map: Record<string, string>, key: string): string {
  return map[key] ?? key.replaceAll("_", " ");
}
