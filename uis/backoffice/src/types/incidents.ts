// Mirrors services/api/incidents/schemas.py — keep in sync manually until
// the OpenAPI-generated client mentioned in docs/ARCHITECTURE_PROPOSAL.md
// (section 4.2) exists.

export interface InvalidBreakdown {
  missing_client_company: number;
  invalid_or_missing_category: number;
  invalid_description: number;
  invalid_or_missing_agent_id: number;
  invalid_or_missing_email: number;
  closed_without_score: number;
  score_out_of_range: number;
}

export interface Satisfaction {
  scored: number;
  closed: number;
  average: number | null;
  distribution: Record<string, number>;
}

export interface AnalyzeResponse {
  source_name: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: InvalidBreakdown;
  category_counts: Record<string, number>;
  category_percentages: Record<string, number>;
  status_counts: Record<string, number>;
  status_percentages: Record<string, number>;
  satisfaction: Satisfaction;
}

export const INVALID_RULE_LABELS: Record<keyof InvalidBreakdown, string> = {
  missing_client_company: "Missing client_company",
  invalid_or_missing_category: "Invalid or missing category",
  invalid_description: "Invalid or missing description",
  invalid_or_missing_agent_id: "Invalid or missing agent_id",
  invalid_or_missing_email: "Invalid or missing email",
  closed_without_score: "Closed ticket, no score",
  score_out_of_range: "Satisfaction score out of range",
};
