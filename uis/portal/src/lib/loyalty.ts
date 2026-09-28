import type { Currency } from "./money";

/**
 * Brasa Points earn and redeem rules from
 * docs/company-knowledge-base/brasaland-loyalty-program.en.md.
 * CONTEXT.md still describes today's programme as physical stamp cards;
 * this module is the calculation the digital portal uses.
 */
export const COP_PER_POINT = 10_000;
export const USD_PER_POINT = 10;
export const MIN_REDEEM_POINTS = 15;
export const REDEEM_INCREMENT = 5;
export const COP_PER_FIVE_POINTS = 20_000;
export const USD_PER_FIVE_POINTS = 20;

export type TierName = "Bronze" | "Silver" | "Gold";

export type Tier = {
  name: TierName;
  reward: string;
};

export const TIERS: readonly Tier[] = [
  { name: "Bronze", reward: "5% off drinks on Tuesdays." },
  { name: "Silver", reward: "10% off the main dish, once a month." },
  { name: "Gold", reward: "15% permanent discount and early access to the seasonal menu." },
];

export function pointsFromSpend(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const unit = currency === "COP" ? COP_PER_POINT : USD_PER_POINT;
  return Math.floor(amount / unit);
}

export function tierFor(balance: number): Tier {
  if (balance >= 50) return TIERS[2];
  if (balance >= 20) return TIERS[1];
  return TIERS[0];
}

/** Largest multiple of 5 that can be redeemed. Zero until the account reaches 15 points. */
export function redeemablePoints(balance: number): number {
  if (!Number.isFinite(balance) || balance < MIN_REDEEM_POINTS) return 0;
  return Math.floor(balance / REDEEM_INCREMENT) * REDEEM_INCREMENT;
}

export function redemptionValue(points: number, currency: Currency): number {
  if (points <= 0 || points % REDEEM_INCREMENT !== 0) return 0;
  const steps = points / REDEEM_INCREMENT;
  return currency === "COP" ? steps * COP_PER_FIVE_POINTS : steps * USD_PER_FIVE_POINTS;
}
