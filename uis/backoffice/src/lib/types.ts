export type InvalidRecord = {
  row_number: number;
  incident_id: string;
  reasons: string[];
  details: string[];
};

export type AnalysisResult = {
  source_name: string;
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_country: Record<string, number>;
  invalid_by_reason: Record<string, number>;
  avg_satisfaction_closed: number | null;
  satisfaction_sample_size: number;
  closed_valid_count: number;
  satisfaction_by_score: Record<string, number>;
  invalid_records: InvalidRecord[];
};

export type ApiError = {
  error: string;
  status: number;
};
