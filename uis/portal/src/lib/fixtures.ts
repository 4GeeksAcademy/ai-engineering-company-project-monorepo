import { toCop, toUsd, type Currency } from "./money";
import { LOCATIONS } from "./locations";
import type { CustomerAccount, LocationSales } from "./types";

type SaleSeed = {
  locationId: string;
  covers: number;
  amountLocal: number;
};

/** Weekly snapshot aligned with the seeded GET /sales shape (currency + location_id). */
const SALE_SEEDS: SaleSeed[] = [
  { locationId: "co-med-centro", covers: 412, amountLocal: 38_400_000 },
  { locationId: "co-med-elpoblado", covers: 388, amountLocal: 41_200_000 },
  { locationId: "co-bog-chapinero", covers: 355, amountLocal: 36_800_000 },
  { locationId: "co-bog-norte", covers: 341, amountLocal: 35_100_000 },
  { locationId: "co-cali-norte", covers: 298, amountLocal: 29_400_000 },
  { locationId: "co-barranquilla", covers: 276, amountLocal: 27_200_000 },
  { locationId: "co-cartagena", covers: 264, amountLocal: 31_600_000 },
  { locationId: "co-pereira", covers: 221, amountLocal: 22_800_000 },
  { locationId: "us-mia-brickell", covers: 402, amountLocal: 11_400 },
  { locationId: "us-mia-downtown", covers: 376, amountLocal: 10_250 },
  { locationId: "us-orlando", covers: 318, amountLocal: 8_900 },
  { locationId: "us-tampa", covers: 291, amountLocal: 8_150 },
  { locationId: "us-ftlauderdale", covers: 274, amountLocal: 7_820 },
  { locationId: "us-jacksonville", covers: 248, amountLocal: 6_940 },
];

function saleFromSeed(seed: SaleSeed): LocationSales {
  const location = LOCATIONS.find((row) => row.id === seed.locationId);
  if (!location) {
    throw new Error(`Fixture sale references unknown location ${seed.locationId}`);
  }
  const currency: Currency = location.currency;
  return {
    locationId: location.id,
    locationName: location.name,
    country: location.country,
    region: location.region,
    currency,
    covers: seed.covers,
    amountLocal: seed.amountLocal,
    amountCop: toCop(seed.amountLocal, currency),
    amountUsd: toUsd(seed.amountLocal, currency),
    openHours: "11:00-22:00 local",
    noSalesDuringOpenHours: seed.covers === 0 || seed.amountLocal === 0,
  };
}

export const FIXTURE_SALES: LocationSales[] = SALE_SEEDS.map(saleFromSeed);

export const FIXTURE_WEEK = "2026-09-14";

/**
 * Guest accounts for the Brasa Points portal.
 * Ids match the central customers seed (cus-001 …) so live lookup uses the same keys.
 * Spend amounts are portal fixtures: the parallel customers router records dishes, not pesos.
 */
export const FIXTURE_CUSTOMERS: CustomerAccount[] = [
  {
    id: "cus-001",
    name: "Ana Morales",
    email: "ana.morales@guest.brasaland.example",
    market: "Colombia",
    preferredLocationId: "co-med-centro",
    preferences: ["grilled-sirloin", "house-sauce"],
    loyaltyProgram: "Brasa Points",
    currency: "COP",
    spendKnown: true,
    balanceSource: "visits",
    stampBalance: null,
    usesStampCard: true,
    visits: [
      { id: "cus-001-v1", occurredOn: "2026-06-02", locationId: "co-med-centro", amountLocal: 120_000, currency: "COP", menuItemId: "grilled-sirloin" },
      { id: "cus-001-v2", occurredOn: "2026-07-14", locationId: "co-med-elpoblado", amountLocal: 80_000, currency: "COP", menuItemId: "corn-arepa" },
      { id: "cus-001-v3", occurredOn: "2026-08-20", locationId: "co-med-centro", amountLocal: 95_000, currency: "COP", menuItemId: "grilled-sirloin" },
      { id: "cus-001-v4", occurredOn: "2026-09-18", locationId: "co-med-centro", amountLocal: 45_000, currency: "COP", menuItemId: "grilled-sirloin" },
    ],
    redemptions: [
      { id: "cus-001-r1", occurredOn: "2026-08-28", locationId: "co-med-centro", points: 10 },
    ],
  },
  {
    id: "cus-002",
    name: "Carlos Restrepo",
    email: "carlos.restrepo@guest.brasaland.example",
    market: "Colombia",
    preferredLocationId: "co-bog-chapinero",
    preferences: ["bbq-ribs"],
    loyaltyProgram: "Brasa Points",
    currency: "COP",
    spendKnown: true,
    balanceSource: "visits",
    stampBalance: null,
    usesStampCard: true,
    visits: [
      { id: "cus-002-v1", occurredOn: "2026-09-16", locationId: "co-bog-chapinero", amountLocal: 90_000, currency: "COP", menuItemId: "bbq-ribs" },
    ],
    redemptions: [],
  },
  {
    id: "cus-005",
    name: "Sofia Alvarez",
    email: "sofia.alvarez@guest.brasaland.example",
    market: "Florida",
    preferredLocationId: "us-mia-brickell",
    preferences: ["grilled-sirloin", "tropical-salad"],
    loyaltyProgram: "Brasa Points",
    currency: "USD",
    spendKnown: true,
    balanceSource: "visits",
    stampBalance: null,
    usesStampCard: true,
    visits: [
      { id: "cus-005-v1", occurredOn: "2026-05-10", locationId: "us-mia-brickell", amountLocal: 180, currency: "USD", menuItemId: "grilled-sirloin" },
      { id: "cus-005-v2", occurredOn: "2026-06-22", locationId: "us-mia-downtown", amountLocal: 150, currency: "USD", menuItemId: "tropical-salad" },
      { id: "cus-005-v3", occurredOn: "2026-08-01", locationId: "us-mia-brickell", amountLocal: 220, currency: "USD", menuItemId: "grilled-sirloin" },
      { id: "cus-005-v4", occurredOn: "2026-09-19", locationId: "us-mia-brickell", amountLocal: 90, currency: "USD", menuItemId: "tropical-salad" },
    ],
    redemptions: [
      { id: "cus-005-r1", occurredOn: "2026-08-15", locationId: "us-mia-brickell", points: 10 },
    ],
  },
  {
    id: "cus-006",
    name: "James Walker",
    email: "james.walker@guest.brasaland.example",
    market: "Florida",
    preferredLocationId: "us-orlando",
    preferences: ["bbq-ribs"],
    loyaltyProgram: "Brasa Points",
    currency: "USD",
    spendKnown: true,
    balanceSource: "visits",
    stampBalance: null,
    usesStampCard: true,
    visits: [
      { id: "cus-006-v1", occurredOn: "2026-07-04", locationId: "us-orlando", amountLocal: 80, currency: "USD", menuItemId: "bbq-ribs" },
      { id: "cus-006-v2", occurredOn: "2026-08-12", locationId: "us-orlando", amountLocal: 70, currency: "USD", menuItemId: "bbq-ribs" },
      { id: "cus-006-v3", occurredOn: "2026-09-14", locationId: "us-orlando", amountLocal: 60, currency: "USD", menuItemId: "bbq-ribs" },
    ],
    redemptions: [],
  },
];
