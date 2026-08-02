export type Id = string;
export type CountryCode = "CO" | "US";
export type CurrencyCode = "COP" | "USD";

export interface BaseEntity {
  id: Id;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreSale {
  storeId: Id;
  storeName: string;
  country: CountryCode;
  currency: CurrencyCode;
  orders: number;
  revenue: number;
  averageTicket: number;
}

export interface InventoryRisk {
  storeId: Id;
  storeName: string;
  ingredient: string;
  availableUnits: number;
  estimatedWeeklyDemand: number;
}

export interface SupplierTrend {
  supplierName: string;
  category: string;
  priceChangePct: number;
}

export interface HrKpi {
  country: CountryCode;
  turnoverPct: number;
  absenteeismPct: number;
  daysToFillVacancy: number;
}

export interface BrasalandBusinessInput {
  weekLabel: string;
  sales: StoreSale[];
  inventory: InventoryRisk[];
  suppliers: SupplierTrend[];
  hr: HrKpi[];
}

export interface MarketSummary {
  country: CountryCode;
  currency: CurrencyCode;
  revenue: number;
  orders: number;
  averageTicket: number;
}

export interface BrasalandBusinessOutput {
  weekLabel: string;
  marketSummary: MarketSummary[];
  topTicketStore: {
    storeName: string;
    averageTicket: number;
    currency: CurrencyCode;
  } | null;
  stockRiskAlerts: string[];
  supplierAlerts: string[];
  hrAlerts: string[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function byCountry(input: BrasalandBusinessInput, country: CountryCode): StoreSale[] {
  return input.sales.filter((sale) => sale.country === country);
}

function marketSummary(input: BrasalandBusinessInput): MarketSummary[] {
  const countries: CountryCode[] = ["CO", "US"];

  return countries
    .map((country) => {
      const rows = byCountry(input, country);
      if (rows.length === 0) {
        return null;
      }

      const revenue = rows.reduce((acc, row) => acc + row.revenue, 0);
      const orders = rows.reduce((acc, row) => acc + row.orders, 0);
      const currency: CurrencyCode = country === "CO" ? "COP" : "USD";

      return {
        country,
        currency,
        revenue: round(revenue),
        orders,
        averageTicket: orders > 0 ? round(revenue / orders) : 0,
      };
    })
    .filter((row): row is MarketSummary => row !== null);
}

function stockRiskAlerts(input: BrasalandBusinessInput): string[] {
  return input.inventory
    .filter((item) => item.availableUnits < item.estimatedWeeklyDemand)
    .map((item) => {
      const delta = item.estimatedWeeklyDemand - item.availableUnits;
      return `${item.storeName}: riesgo de rotura en ${item.ingredient} (faltan ${delta} unidades estimadas).`;
    });
}

function supplierAlerts(input: BrasalandBusinessInput): string[] {
  return input.suppliers
    .filter((row) => row.priceChangePct >= 7)
    .map(
      (row) =>
        `${row.supplierName} subio ${row.priceChangePct}% en ${row.category}; revisar negociacion centralizada.`
    );
}

function hrAlerts(input: BrasalandBusinessInput): string[] {
  const alerts: string[] = [];

  for (const metric of input.hr) {
    if (metric.turnoverPct > 18) {
      alerts.push(`Rotacion alta en ${metric.country}: ${metric.turnoverPct}%.`);
    }
    if (metric.absenteeismPct > 7) {
      alerts.push(`Absentismo alto en ${metric.country}: ${metric.absenteeismPct}%.`);
    }
    if (metric.daysToFillVacancy > 40) {
      alerts.push(
        `Cobertura lenta de vacantes en ${metric.country}: ${metric.daysToFillVacancy} dias promedio.`
      );
    }
  }

  return alerts;
}

/**
 * Canonical business-logic module reused across apps.
 * Backoffice imports this directly from its original monorepo location.
 */
export function buildBrasalandSnapshot(
  input: BrasalandBusinessInput
): BrasalandBusinessOutput {
  const top = input.sales
    .slice()
    .sort((a, b) => b.averageTicket - a.averageTicket)[0] ?? null;

  return {
    weekLabel: input.weekLabel,
    marketSummary: marketSummary(input),
    topTicketStore: top
      ? {
          storeName: top.storeName,
          averageTicket: top.averageTicket,
          currency: top.currency,
        }
      : null,
    stockRiskAlerts: stockRiskAlerts(input),
    supplierAlerts: supplierAlerts(input),
    hrAlerts: hrAlerts(input),
  };
}
