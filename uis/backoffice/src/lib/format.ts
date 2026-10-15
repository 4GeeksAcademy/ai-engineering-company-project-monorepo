// Display helpers for dates and money, moved out of the components so they can be tested on their own.
// Pure functions: no state, no network, no DOM.

/** A contract renewal inside this many days (today included) is flagged as coming up. */
export const RENEWAL_WARNING_DAYS = 60;

export type RenewalState = "none" | "overdue" | "soon" | "later";

/** Whole days from today (at local midnight) to `dateStr` (YYYY-MM-DD): 0 is today, negative is in the past. */
export function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** How urgent a contract renewal is, from the days left: past = "overdue", within the warning window = "soon". */
export function renewalState(days: number | null): RenewalState {
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= RENEWAL_WARNING_DAYS) return "soon";
  return "later";
}

/** An amount in the supplier's currency, Spanish formatting ("1200,50 €"). */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

/** An ISO timestamp as the backoffice shows it: Spanish date and time in the browser's timezone. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES");
}
