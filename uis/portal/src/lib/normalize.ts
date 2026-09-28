import { pointsFromSpend, redeemablePoints, redemptionValue, tierFor } from "./loyalty";
import { formatMoney, isCurrency, roundMoney, toCop, toUsd, type Currency } from "./money";
import { locationName } from "./locations";
import type {
  CustomerAccount,
  LedgerEntry,
  LocationSales,
  Market,
  PointsSummary,
  Redemption,
  Visit,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asMarket(value: unknown, currency: Currency): Market {
  if (value === "Colombia" || value === "Florida") return value;
  return currency === "USD" ? "Florida" : "Colombia";
}

function readVisits(raw: Record<string, unknown>, fallbackCurrency: Currency): Visit[] {
  const source = Array.isArray(raw.visits)
    ? raw.visits
    : Array.isArray(raw.order_history)
      ? raw.order_history
      : [];
  return source.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const locationId = asString(item.location_id) ?? asString(item.locationId);
    if (!locationId) return [];
    const currency = isCurrency(item.currency) ? item.currency : fallbackCurrency;
    const amount =
      asNumber(item.amount_local) ??
      asNumber(item.amountLocal) ??
      asNumber(item.amount);
    return [
      {
        id: asString(item.id) ?? `${asString(raw.id) ?? "visit"}-${index + 1}`,
        occurredOn:
          asString(item.occurred_on) ??
          asString(item.occurredOn) ??
          asString(item.ordered_on) ??
          "",
        locationId,
        amountLocal: amount,
        currency,
        menuItemId: asString(item.menu_item_id) ?? asString(item.menuItemId),
      },
    ];
  });
}

function readRedemptions(raw: Record<string, unknown>): Redemption[] {
  if (!Array.isArray(raw.redemptions)) return [];
  return raw.redemptions.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const points = asNumber(item.points);
    const locationId = asString(item.location_id) ?? asString(item.locationId);
    if (points === null || points <= 0 || !locationId) return [];
    return [
      {
        id: asString(item.id) ?? `redeem-${index + 1}`,
        occurredOn: asString(item.occurred_on) ?? asString(item.occurredOn) ?? "",
        locationId,
        points,
      },
    ];
  });
}

/**
 * Accepts the portal fixture shape and the central API customer
 * (`id`, `name`, `market`, `order_history[].location_id`).
 */
export function normalizeCustomer(raw: unknown): CustomerAccount | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  if (!id || !name) return null;

  const explicitCurrency = isCurrency(raw.currency) ? raw.currency : undefined;
  const marketHint = raw.market === "Florida" ? "USD" : raw.market === "Colombia" ? "COP" : undefined;
  const currency: Currency = explicitCurrency ?? marketHint ?? "COP";
  const visits = readVisits(raw, currency);
  const redemptions = readRedemptions(raw);
  const amountsPresent = visits.length > 0 && visits.every((visit) => visit.amountLocal !== null);
  const stampBalance = asNumber(raw.brasa_points_balance) ?? asNumber(raw.points_balance);
  const usesStampCard =
    typeof raw.uses_stamp_card === "boolean"
      ? raw.uses_stamp_card
      : typeof raw.usesStampCard === "boolean"
        ? raw.usesStampCard
        : null;
  const balanceSource = amountsPresent
    ? "visits"
    : stampBalance !== null
      ? "stamp_card"
      : "unknown";
  const spendKnown = balanceSource !== "unknown";

  const email =
    asString(raw.email) ?? `${id}@guest.brasaland.example`;

  return {
    id,
    name,
    email,
    market: asMarket(raw.market, currency),
    preferredLocationId:
      asString(raw.preferred_location_id) ??
      asString(raw.preferredLocationId) ??
      visits[0]?.locationId ??
      "",
    preferences: Array.isArray(raw.preferences)
      ? raw.preferences.filter((item): item is string => typeof item === "string")
      : [],
    loyaltyProgram: asString(raw.loyalty_program) ?? asString(raw.loyaltyProgram) ?? "Brasa Points",
    currency,
    visits,
    redemptions,
    spendKnown,
    balanceSource,
    stampBalance,
    usesStampCard,
  };
}

export function summarizePoints(account: CustomerAccount): PointsSummary {
  const balanceSource = account.balanceSource ?? (account.spendKnown ? "visits" : "unknown");

  if (balanceSource === "stamp_card" && account.stampBalance !== null) {
    const balance = account.stampBalance;
    const tier = tierFor(balance);
    const ledger: LedgerEntry[] = account.visits.map((visit) => ({
      id: visit.id,
      occurredOn: visit.occurredOn,
      locationId: visit.locationId,
      kind: "earn",
      points: null,
      detail: visit.menuItemId
        ? `Order ${visit.menuItemId.replaceAll("-", " ")} · stamp-card visit`
        : "Stamp-card visit",
    }));
    return {
      spendKnown: true,
      balanceSource: "stamp_card",
      earned: null,
      redeemed: null,
      balance,
      tier: tier.name,
      reward: tier.reward,
      redeemablePoints: redeemablePoints(balance),
      ledger,
    };
  }

  if (balanceSource !== "visits") {
    const ledger: LedgerEntry[] = account.visits.map((visit) => ({
      id: visit.id,
      occurredOn: visit.occurredOn,
      locationId: visit.locationId,
      kind: "earn",
      points: null,
      detail: visit.menuItemId
        ? `Order ${visit.menuItemId.replaceAll("-", " ")} · spend not on this record`
        : "Order recorded · spend not on this record",
    }));
    return {
      spendKnown: false,
      balanceSource: "unknown",
      earned: null,
      redeemed: null,
      balance: null,
      tier: null,
      reward: null,
      redeemablePoints: null,
      ledger,
    };
  }

  const earnEntries: LedgerEntry[] = account.visits.map((visit) => {
    const points = pointsFromSpend(visit.amountLocal ?? 0, visit.currency);
    return {
      id: visit.id,
      occurredOn: visit.occurredOn,
      locationId: visit.locationId,
      kind: "earn",
      points,
      detail: `${formatMoney(visit.amountLocal ?? 0, visit.currency)} at ${locationName(visit.locationId)}`,
    };
  });

  const redeemEntries: LedgerEntry[] = account.redemptions.map((redemption) => ({
    id: redemption.id,
    occurredOn: redemption.occurredOn,
    locationId: redemption.locationId,
    kind: "redeem",
    points: -redemption.points,
    detail: `Redeemed ${redemption.points} points · ${formatMoney(redemptionValue(redemption.points, account.currency), account.currency)} off the bill`,
  }));

  const earned = earnEntries.reduce((sum, entry) => sum + (entry.points ?? 0), 0);
  const redeemed = account.redemptions.reduce((sum, entry) => sum + entry.points, 0);
  const balance = earned - redeemed;
  const tier = tierFor(balance);

  const ledger = [...earnEntries, ...redeemEntries].sort((a, b) =>
    a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0,
  );

  return {
    spendKnown: true,
    balanceSource: "visits",
    earned,
    redeemed,
    balance,
    tier: tier.name,
    reward: tier.reward,
    redeemablePoints: redeemablePoints(balance),
    ledger,
  };
}

function regionFrom(raw: Record<string, unknown>, currency: Currency): string {
  const region = asString(raw.region);
  if (region) return region;
  const country = asString(raw.country);
  if (country === "United States") return "Florida";
  if (country === "Colombia") return "Colombia";
  return currency === "USD" ? "Florida" : "Colombia";
}

type ParsedSale = LocationSales & { ticket: boolean; occurredAt?: string };

function isTicket(item: Record<string, unknown>): boolean {
  return (
    asString(item.occurred_at) !== undefined ||
    asString(item.occurredAt) !== undefined ||
    asString(item.menu_item_id) !== undefined ||
    asString(item.menuItemId) !== undefined
  );
}

/** Opening window used by the central sales router (11:00–22:00 local). */
function duringOpenHours(occurredAt: string | undefined): boolean {
  if (!occurredAt) return true;
  const match = occurredAt.match(/T(\d{2})/);
  if (!match) return true;
  const hour = Number(match[1]);
  return hour >= 11 && hour < 22;
}

function parseSale(item: unknown): ParsedSale | null {
  if (!isRecord(item)) return null;
  const locationId = asString(item.location_id) ?? asString(item.locationId);
  const currency = isCurrency(item.currency) ? item.currency : null;
  if (!locationId || !currency) return null;
  const amountLocal =
    asNumber(item.amount_local) ?? asNumber(item.amountLocal) ?? asNumber(item.amount) ?? 0;
  const covers = asNumber(item.covers) ?? 0;
  const amountCop = asNumber(item.amount_cop) ?? asNumber(item.amountCop) ?? toCop(amountLocal, currency);
  const amountUsd = asNumber(item.amount_usd) ?? asNumber(item.amountUsd) ?? toUsd(amountLocal, currency);
  const quietFlag = item.no_sales_during_open_hours ?? item.noSalesDuringOpenHours;
  const ticket = isTicket(item);
  return {
    locationId,
    locationName: asString(item.location_name) ?? asString(item.locationName) ?? locationName(locationId),
    country: asString(item.country) ?? (currency === "USD" ? "United States" : "Colombia"),
    region: regionFrom(item, currency),
    currency,
    covers,
    amountLocal,
    amountCop,
    amountUsd,
    openHours: asString(item.open_hours) ?? asString(item.openHours) ?? "11:00-22:00 local",
    noSalesDuringOpenHours: typeof quietFlag === "boolean" ? quietFlag : covers === 0 || amountLocal === 0,
    ticket,
    occurredAt: asString(item.occurred_at) ?? asString(item.occurredAt),
  };
}

function rollupTickets(tickets: ParsedSale[]): LocationSales[] {
  const groups = new Map<string, ParsedSale[]>();
  for (const ticket of tickets) {
    const group = groups.get(ticket.locationId) ?? [];
    group.push(ticket);
    groups.set(ticket.locationId, group);
  }
  return [...groups.values()].map((group) => {
    const first = group[0];
    const amountLocal = group.reduce((sum, row) => sum + row.amountLocal, 0);
    const amountCop = group.reduce((sum, row) => sum + row.amountCop, 0);
    const amountUsd = group.reduce((sum, row) => sum + row.amountUsd, 0);
    return {
      locationId: first.locationId,
      locationName: first.locationName,
      country: first.country,
      region: first.region,
      currency: first.currency,
      covers: group.reduce((sum, row) => sum + row.covers, 0),
      amountLocal: roundMoney(amountLocal, first.currency === "USD" ? 2 : 0),
      amountCop: roundMoney(amountCop, 2),
      amountUsd: roundMoney(amountUsd, 2),
      openHours: first.openHours,
      noSalesDuringOpenHours: !group.some((row) => duringOpenHours(row.occurredAt)),
    };
  });
}

/**
 * Accepts GET /sales (ticket list: location_id, currency, amount, occurred_at)
 * or GET /sales/overview `{ locations: [...] }` with one row per location.
 * Ticket lists are rolled up so the staff view stays one row per location.
 */
export function normalizeSales(body: unknown): LocationSales[] {
  const rows = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.locations)
      ? body.locations
      : [];
  const parsed = rows.flatMap((item) => {
    const sale = parseSale(item);
    return sale ? [sale] : [];
  });
  if (parsed.some((row) => row.ticket)) {
    return rollupTickets(parsed.filter((row) => row.ticket));
  }
  return parsed.map(({ ticket: _ticket, occurredAt: _occurredAt, ...row }) => row);
}

export function chainTotals(rows: LocationSales[]): {
  chainCop: number;
  chainUsd: number;
  colombiaCop: number;
  floridaUsd: number;
  quietLocations: string[];
} {
  const colombia = rows.filter((row) => row.region === "Colombia");
  const florida = rows.filter((row) => row.region === "Florida");
  return {
    chainCop: rows.reduce((sum, row) => sum + row.amountCop, 0),
    chainUsd: rows.reduce((sum, row) => sum + row.amountUsd, 0),
    colombiaCop: colombia.reduce((sum, row) => sum + row.amountCop, 0),
    floridaUsd: florida.reduce((sum, row) => sum + row.amountUsd, 0),
    quietLocations: rows.filter((row) => row.noSalesDuringOpenHours).map((row) => row.locationName),
  };
}
