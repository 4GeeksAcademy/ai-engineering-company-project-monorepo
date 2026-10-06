/** Illustrative reporting rate shared with the central sales snapshot. Not a live FX feed. */
export const ILLUSTRATIVE_USD_COP = 4000;

export type Currency = "COP" | "USD";

export function isCurrency(value: unknown): value is Currency {
  return value === "COP" || value === "USD";
}

export function roundMoney(amount: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function toCop(amount: number, currency: Currency): number {
  if (currency === "COP") return roundMoney(amount, 0);
  return roundMoney(amount * ILLUSTRATIVE_USD_COP, 0);
}

export function toUsd(amount: number, currency: Currency): number {
  if (currency === "USD") return roundMoney(amount, 2);
  return roundMoney(amount / ILLUSTRATIVE_USD_COP, 2);
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(amount);
}
