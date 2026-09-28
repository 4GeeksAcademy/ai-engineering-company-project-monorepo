import type { Currency } from "./money";
import type { TierName } from "./loyalty";

export type Market = "Colombia" | "Florida";

export type Visit = {
  id: string;
  occurredOn: string;
  locationId: string;
  amountLocal: number | null;
  currency: Currency;
  menuItemId?: string;
};

export type Redemption = {
  id: string;
  occurredOn: string;
  locationId: string;
  points: number;
};

export type CustomerAccount = {
  id: string;
  name: string;
  email: string;
  market: Market;
  preferredLocationId: string;
  preferences: string[];
  loyaltyProgram: string;
  currency: Currency;
  visits: Visit[];
  redemptions: Redemption[];
  /** False when the API recorded orders but not spend or a stamp-card balance. */
  spendKnown: boolean;
  /**
   * `visits` — balance from spend on each visit (portal fixtures).
   * `stamp_card` — `brasa_points_balance` from the central customers API.
   */
  balanceSource: "visits" | "stamp_card" | "unknown";
  stampBalance: number | null;
  usesStampCard: boolean | null;
};

export type LedgerKind = "earn" | "redeem";

export type LedgerEntry = {
  id: string;
  occurredOn: string;
  locationId: string;
  kind: LedgerKind;
  points: number | null;
  detail: string;
};

export type PointsSummary = {
  spendKnown: boolean;
  balanceSource: "visits" | "stamp_card" | "unknown";
  earned: number | null;
  redeemed: number | null;
  balance: number | null;
  tier: TierName | null;
  reward: string | null;
  redeemablePoints: number | null;
  ledger: LedgerEntry[];
};

export type LocationSales = {
  locationId: string;
  locationName: string;
  country: string;
  region: string;
  currency: Currency;
  covers: number;
  amountLocal: number;
  amountCop: number;
  amountUsd: number;
  openHours: string;
  noSalesDuringOpenHours: boolean;
};

export type DataSource = "live" | "mock";

export type LoadResult<T> = {
  data: T;
  source: DataSource;
  notice?: string;
};
