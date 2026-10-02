// Incidents Analysis - Types and CSV Parser

// --- Constants (mirrors analyze.py) ---

export const VALID_LOCATIONS = new Set([
  ...Array.from({ length: 10 }, (_, i) => `COL-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 4 }, (_, i) => `FLA-${String(i + 1).padStart(2, "0")}`),
]);

export const VALID_CATEGORIES = new Set([
  "CUSTOMER_COMPLAINT",
  "EQUIPMENT",
  "SUPPLY",
  "FOOD_QUALITY",
  "STAFF",
]);

export const VALID_STATUSES = new Set(["OPEN", "CLOSED", "DISCARDED"]);

export const CATEGORY_LABELS: Record<string, string> = {
  CUSTOMER_COMPLAINT: "Customer Complaint",
  EQUIPMENT: "Equipment",
  SUPPLY: "Supply",
  FOOD_QUALITY: "Food Quality",
  STAFF: "Staff",
};

export const CATEGORY_ICONS: Record<string, string> = {
  CUSTOMER_COMPLAINT: "💬",
  EQUIPMENT: "🔧",
  SUPPLY: "📦",
  FOOD_QUALITY: "🍽️",
  STAFF: "👥",
};

export const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  CLOSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISCARDED: "bg-gray-50 text-gray-500 border-gray-200",
};

export const STATUS_ICONS: Record<string, string> = {
  OPEN: "🟡",
  CLOSED: "✅",
  DISCARDED: "⚪",
};

export const SCORE_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

export const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-lime-400",
  5: "bg-green-400",
};

// --- Types ---

export interface IncidentRow {
  incident_id: string;
  date: string;
  location_id: string;
  category: string;
  description: string;
  status: string;
  customer_id: string;
  satisfaction_score: string;
  reporter_id: string;
}

export interface InvalidReason {
  rule: string;
  label: string;
  count: number;
}

export interface AnalysisResults {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  invalidReasons: InvalidReason[];
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalClosed: number;
  totalScored: number;
  scoreCounts: Record<number, number>;
  avgScore: number;
}

// --- CSV Parser ---

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): IncidentRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: IncidentRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row as unknown as IncidentRow);
  }

  return rows;
}

function validateRecord(row: IncidentRow): string[] {
  const errors: string[] = [];

  const location = (row.location_id || "").trim();
  if (!VALID_LOCATIONS.has(location)) {
    errors.push("missing_location_id");
  }

  const category = (row.category || "").trim();
  if (!VALID_CATEGORIES.has(category)) {
    errors.push("invalid_category");
  }

  const description = (row.description || "").trim();
  if (description.length < 5) {
    errors.push("empty_description");
  }

  const reporter = (row.reporter_id || "").trim();
  if (!reporter) {
    errors.push("missing_reporter_id");
  }

  const status = (row.status || "").trim().toUpperCase();
  const scoreRaw = (row.satisfaction_score || "").trim();

  if (status === "CLOSED" && !scoreRaw) {
    errors.push("closed_no_score");
  } else if (scoreRaw) {
    const score = parseInt(scoreRaw, 10);
    if (isNaN(score) || score < 1 || score > 5) {
      errors.push("score_out_of_range");
    }
  }

  return errors;
}

export function analyzeIncidents(rows: IncidentRow[]): AnalysisResults {
  const invalidReasons: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const scoreCounts: Record<number, number> = {};

  let validCount = 0;
  let invalidCount = 0;
  let totalClosed = 0;
  let totalScored = 0;

  for (const row of rows) {
    const errors = validateRecord(row);
    if (errors.length > 0) {
      invalidCount++;
      for (const e of errors) {
        invalidReasons[e] = (invalidReasons[e] || 0) + 1;
      }
    } else {
      validCount++;
      const cat = row.category.trim();
      const status = row.status.trim().toUpperCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === "CLOSED") {
        totalClosed++;
        const scoreRaw = (row.satisfaction_score || "").trim();
        if (scoreRaw) {
          const score = parseInt(scoreRaw, 10);
          if (score >= 1 && score <= 5) {
            scoreCounts[score] = (scoreCounts[score] || 0) + 1;
            totalScored++;
          }
        }
      }
    }
  }

  let sumScore = 0;
  for (const [s, c] of Object.entries(scoreCounts)) {
    sumScore += Number(s) * c;
  }
  const avgScore = totalScored > 0 ? sumScore / totalScored : 0;

  const reasonLabels: Record<string, string> = {
    missing_location_id: "Missing location_id",
    invalid_category: "Invalid or missing category",
    empty_description: "Empty description",
    missing_reporter_id: "Missing reporter_id",
    closed_no_score: "Closed case, no score",
    score_out_of_range: "Score out of range (1–5)",
  };

  const invalidReasonsList: InvalidReason[] = Object.entries(invalidReasons)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({
      rule,
      label: reasonLabels[rule] || rule,
      count,
    }));

  return {
    totalRows: rows.length,
    validCount,
    invalidCount,
    invalidReasons: invalidReasonsList,
    categoryCounts,
    statusCounts,
    totalClosed,
    totalScored,
    scoreCounts,
    avgScore,
  };
}
