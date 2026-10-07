import { describe, expect, it } from "vitest";
import { FIXTURE_SALES } from "../src/lib/fixtures";
import { ILLUSTRATIVE_USD_COP } from "../src/lib/money";
import { chainTotals, normalizeCustomer, normalizeSales, summarizePoints } from "../src/lib/normalize";

describe("sales payload", () => {
  it("keeps 14 locations in both currencies and converts at the illustrative rate", () => {
    expect(FIXTURE_SALES).toHaveLength(14);
    expect(FIXTURE_SALES.filter((row) => row.currency === "COP")).toHaveLength(8);
    expect(FIXTURE_SALES.filter((row) => row.currency === "USD")).toHaveLength(6);

    const centro = FIXTURE_SALES.find((row) => row.locationId === "co-med-centro");
    expect(centro?.amountCop).toBe(38_400_000);
    expect(centro?.amountUsd).toBe(38_400_000 / ILLUSTRATIVE_USD_COP);

    const brickell = FIXTURE_SALES.find((row) => row.locationId === "us-mia-brickell");
    expect(brickell?.amountUsd).toBe(11_400);
    expect(brickell?.amountCop).toBe(11_400 * ILLUSTRATIVE_USD_COP);

    const totals = chainTotals(FIXTURE_SALES);
    expect(totals.quietLocations).toEqual([]);
    expect(totals.colombiaCop).toBeGreaterThan(0);
    expect(totals.floridaUsd).toBeGreaterThan(0);
    expect(totals.chainCop).toBeGreaterThan(totals.colombiaCop);
  });

  it("accepts a list or an overview envelope and fills conversion when only amount is sent", () => {
    const fromList = normalizeSales([
      { location_id: "co-pereira", currency: "COP", amount: 10_000, covers: 1 },
    ]);
    expect(fromList[0]).toMatchObject({
      locationId: "co-pereira",
      currency: "COP",
      amountCop: 10_000,
      amountUsd: 2.5,
    });

    const fromOverview = normalizeSales({
      locations: [{ location_id: "us-tampa", currency: "USD", amount_local: 10, covers: 0 }],
    });
    expect(fromOverview[0]?.amountCop).toBe(40_000);
    expect(fromOverview[0]?.noSalesDuringOpenHours).toBe(true);

    expect(normalizeSales([{ location_id: "co-pereira" }])).toEqual([]);
  });

  it("rolls GET /sales tickets up to one row per location", () => {
    const rows = normalizeSales([
      {
        id: "sal-co-med-centro-1",
        location_id: "co-med-centro",
        location_name: "Medellín Centro",
        country: "Colombia",
        region: "Colombia",
        currency: "COP",
        amount: 20_000_000,
        amount_cop: 20_000_000,
        amount_usd: 5_000,
        covers: 200,
        occurred_at: "2026-09-16T12:40:00-05:00",
        menu_item_id: "grilled-sirloin",
      },
      {
        id: "sal-co-med-centro-2",
        location_id: "co-med-centro",
        location_name: "Medellín Centro",
        currency: "COP",
        amount: 18_400_000,
        amount_cop: 18_400_000,
        amount_usd: 4_600,
        covers: 212,
        occurred_at: "2026-09-18T19:15:00-05:00",
        menu_item_id: "bbq-ribs",
      },
      {
        id: "sal-us-tampa-1",
        location_id: "us-tampa",
        currency: "USD",
        amount: 10,
        amount_cop: 40_000,
        amount_usd: 10,
        covers: 1,
        occurred_at: "2026-09-16T02:00:00-04:00",
        menu_item_id: "bbq-ribs",
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      locationId: "co-med-centro",
      amountLocal: 38_400_000,
      amountCop: 38_400_000,
      amountUsd: 9_600,
      covers: 412,
      noSalesDuringOpenHours: false,
    });
    expect(rows[1]).toMatchObject({
      locationId: "us-tampa",
      noSalesDuringOpenHours: true,
    });
  });
});

describe("customer payload", () => {
  it("reads the central API customer shape and refuses to invent points without spend", () => {
    const account = normalizeCustomer({
      id: "cus-003",
      name: "Valentina Gómez",
      market: "Colombia",
      preferred_location_id: "co-cali-norte",
      preferences: ["tropical-salad"],
      loyalty_program: "Brasa Points",
      order_history: [
        { menu_item_id: "tropical-salad", location_id: "co-cali-norte", ordered_on: "2026-09-12" },
      ],
    });
    expect(account?.spendKnown).toBe(false);
    expect(account?.visits[0]?.locationId).toBe("co-cali-norte");
    expect(account?.email).toBe("cus-003@guest.brasaland.example");
  });

  it("calculates points when order history includes an amount", () => {
    const account = normalizeCustomer({
      id: "cus-009",
      name: "Guest Nine",
      market: "Florida",
      currency: "USD",
      order_history: [
        { location_id: "us-orlando", ordered_on: "2026-09-01", amount_local: 25, currency: "USD" },
      ],
    });
    expect(account?.spendKnown).toBe(true);
    expect(account?.market).toBe("Florida");
  });

  it("uses brasa_points_balance from the central customers schema", () => {
    const account = normalizeCustomer({
      id: "cus-001",
      name: "Ana Morales",
      market: "Colombia",
      preferred_location_id: "co-med-centro",
      preferences: ["grilled-sirloin"],
      loyalty_program: "Brasa Points",
      loyalty_medium: "physical_stamp_card",
      uses_stamp_card: true,
      brasa_points_balance: 32,
      loyalty_tier: "silver",
      digital_loyalty: false,
      order_history: [
        { menu_item_id: "grilled-sirloin", location_id: "co-med-centro", ordered_on: "2026-09-18" },
      ],
    });
    expect(account?.balanceSource).toBe("stamp_card");
    expect(account?.usesStampCard).toBe(true);
    const summary = summarizePoints(account!);
    expect(summary.balance).toBe(32);
    expect(summary.tier).toBe("Silver");
    expect(summary.ledger[0]?.points).toBeNull();
    expect(summary.redeemablePoints).toBe(30);
  });
});
