import { describe, expect, it } from "vitest";
import { FIXTURE_CUSTOMERS } from "../src/lib/fixtures";
import {
  MIN_REDEEM_POINTS,
  pointsFromSpend,
  redeemablePoints,
  redemptionValue,
  tierFor,
} from "../src/lib/loyalty";
import { summarizePoints } from "../src/lib/normalize";

describe("Brasa Points rules", () => {
  it("awards 1 point per 10,000 COP or 10 USD, dropping the remainder", () => {
    expect(pointsFromSpend(10_000, "COP")).toBe(1);
    expect(pointsFromSpend(19_999, "COP")).toBe(1);
    expect(pointsFromSpend(9_999, "COP")).toBe(0);
    expect(pointsFromSpend(10, "USD")).toBe(1);
    expect(pointsFromSpend(25, "USD")).toBe(2);
    expect(pointsFromSpend(0, "COP")).toBe(0);
  });

  it("places tiers on the current balance", () => {
    expect(tierFor(0).name).toBe("Bronze");
    expect(tierFor(19).name).toBe("Bronze");
    expect(tierFor(20).name).toBe("Silver");
    expect(tierFor(49).name).toBe("Silver");
    expect(tierFor(50).name).toBe("Gold");
  });

  it("redeems from 15 points in steps of 5", () => {
    expect(redeemablePoints(14)).toBe(0);
    expect(redeemablePoints(MIN_REDEEM_POINTS)).toBe(15);
    expect(redeemablePoints(23)).toBe(20);
    expect(redemptionValue(20, "COP")).toBe(80_000);
    expect(redemptionValue(20, "USD")).toBe(80);
    expect(redemptionValue(3, "COP")).toBe(0);
  });

  it("computes fixture guest balances from spend", () => {
    const ana = summarizePoints(FIXTURE_CUSTOMERS[0]);
    expect(ana.balance).toBe(23);
    expect(ana.tier).toBe("Silver");
    expect(ana.redeemablePoints).toBe(20);

    const carlos = summarizePoints(FIXTURE_CUSTOMERS[1]);
    expect(carlos.balance).toBe(9);
    expect(carlos.tier).toBe("Bronze");
    expect(carlos.redeemablePoints).toBe(0);

    const sofia = summarizePoints(FIXTURE_CUSTOMERS[2]);
    expect(sofia.balance).toBe(54);
    expect(sofia.tier).toBe("Gold");

    const james = summarizePoints(FIXTURE_CUSTOMERS[3]);
    expect(james.balance).toBe(21);
    expect(james.tier).toBe("Silver");
    expect(james.ledger[0]?.kind).toBe("earn");
  });
});
