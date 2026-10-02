export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatYears(years: number): string {
  return `${Number(years).toFixed(1)}y`;
}

export function formatYearsLabel(years: number): string {
  return `${Number(years).toFixed(1)} years`;
}