/**
 * @jest-environment node
 */
// Date and money helpers (`lib/format.ts`): the contract-renewal countdown on the supplier table, the money amounts and
// the timestamps the backoffice shows. Pure functions, so no mocks: only the clock (fake timers) and the timezone.
//
// Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
// FAILURE MODES. Arrange / Act / Assert.
import { RENEWAL_WARNING_DAYS, daysUntil, formatDateTime, formatMoney, renewalState } from "@/lib/format";

// Dates are shown in the user's timezone, so the suite pins one in `jest.global-setup.mjs`: Madrid (UTC+1 in winter,
// UTC+2 in summer). This guard fails loudly if that pin is ever lost, instead of letting the date tests pass or fail by luck.
it("runs in Madrid time", () => {
  expect(new Date("2026-07-01T00:00:00Z").getTimezoneOffset()).toBe(-120);
  expect(new Date("2026-01-01T00:00:00Z").getTimezoneOffset()).toBe(-60);
});

afterEach(() => jest.useRealTimers());

/** Today, for the code under test, is this local date and time. */
const today = (year: number, month: number, day: number, hour = 10, minute = 0) =>
  jest.useFakeTimers({ now: new Date(year, month - 1, day, hour, minute, 0) });

// Intl separates the number from the currency symbol with a no-break space: compare with a normal one.
const plain = (text: string) => text.replace(/\s/g, " ");

describe("daysUntil", () => {
  describe("happy path", () => {
    it("counts the whole days from today to a future date", () => {
      today(2026, 10, 6);

      expect(daysUntil("2026-10-07")).toBe(1);
      expect(daysUntil("2026-12-05")).toBe(60);
    });

    it("is 0 for today", () => {
      today(2026, 10, 6);

      expect(daysUntil("2026-10-06")).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("is negative for a date in the past", () => {
      today(2026, 10, 6);

      expect(daysUntil("2026-10-05")).toBe(-1);
      expect(daysUntil("2025-10-06")).toBe(-365);
    });

    it.each([[0, 1], [10, 0], [23, 59]])("does not depend on the time of day (%i:%i)", (hour, minute) => {
      today(2026, 10, 6, hour, minute);

      expect(daysUntil("2026-10-07")).toBe(1);
    });

    it("counts calendar days across the autumn clock change (a 25-hour day)", () => {
      today(2026, 10, 24); // Madrid goes back to winter time on 25 October 2026

      expect(daysUntil("2026-10-26")).toBe(2);
    });

    it("counts calendar days across the spring clock change (a 23-hour day)", () => {
      today(2026, 3, 28); // Madrid goes forward to summer time on 29 March 2026

      expect(daysUntil("2026-03-30")).toBe(2);
    });

    it("knows about leap days and year ends", () => {
      today(2028, 2, 28);
      expect(daysUntil("2028-03-01")).toBe(2); // 2028 has a 29 February
      today(2026, 12, 31);
      expect(daysUntil("2027-01-01")).toBe(1);
    });
  });

  describe("failure modes", () => {
    it.each(["", "not-a-date", "2026-13-45", "06/10/2026", "2026-10-06T10:00:00", "undefined"])(
      "gives NaN, not an exception or a made-up number, for %j",
      (value) => {
        today(2026, 10, 6);

        expect(daysUntil(value)).toBeNaN();
      },
    );

    it("a NaN never reads as overdue or coming up (the table shows the plain date)", () => {
      today(2026, 10, 6);

      expect(renewalState(daysUntil("not-a-date"))).toBe("later");
    });
  });
});

describe("renewalState", () => {
  describe("happy path", () => {
    it.each([
      [30, "soon"],
      [200, "later"],
      [-10, "overdue"],
    ] as const)("%i days left is %s", (days, state) => {
      expect(renewalState(days)).toBe(state);
    });
  });

  describe("edge cases (the warning window)", () => {
    it("the window is 60 days", () => {
      expect(RENEWAL_WARNING_DAYS).toBe(60);
    });

    it.each([
      [-1, "overdue"],
      [0, "soon"], // renewing today is not overdue
      [60, "soon"],
      [61, "later"],
    ] as const)("%i days is %s", (days, state) => {
      expect(renewalState(days)).toBe(state);
    });
  });

  describe("failure modes", () => {
    it("a supplier without a renewal date has no state at all", () => {
      expect(renewalState(null)).toBe("none");
    });

    it("garbage never raises an alarm", () => {
      expect(renewalState(NaN)).toBe("later");
    });
  });
});

describe("formatMoney", () => {
  describe("happy path", () => {
    it("writes euros the Spanish way: comma for decimals, symbol after", () => {
      expect(plain(formatMoney(1200.5, "EUR"))).toBe("1200,50 €");
    });

    it("writes dollars with their own symbol", () => {
      expect(plain(formatMoney(12000, "USD"))).toBe("12.000,00 US$");
    });
  });

  describe("edge cases", () => {
    it("always shows two decimals, and rounds to them", () => {
      expect(plain(formatMoney(0, "EUR"))).toBe("0,00 €");
      expect(plain(formatMoney(19.999, "EUR"))).toBe("20,00 €");
      expect(plain(formatMoney(5, "EUR"))).toBe("5,00 €");
    });

    it("groups thousands only from five digits (Spanish rule)", () => {
      expect(plain(formatMoney(1200, "EUR"))).toBe("1200,00 €");
      expect(plain(formatMoney(12000, "EUR"))).toBe("12.000,00 €");
      expect(plain(formatMoney(1234567.891, "EUR"))).toBe("1.234.567,89 €");
    });

    it("keeps the sign of a negative amount", () => {
      expect(plain(formatMoney(-5, "EUR"))).toBe("-5,00 €");
    });
  });

  describe("failure modes", () => {
    it.each(["EURO", "eu", "", "12"])("refuses the malformed currency code %j instead of printing a made-up symbol", (code) => {
      expect(() => formatMoney(10, code)).toThrow(RangeError);
    });

    it("a missing currency is a programming error, not a silent default", () => {
      expect(() => formatMoney(10, undefined as unknown as string)).toThrow(TypeError);
    });

    it("an amount that is not a number is shown as NaN rather than hidden", () => {
      expect(plain(formatMoney(NaN, "EUR"))).toBe("NaN €");
    });
  });
});

describe("formatDateTime", () => {
  describe("happy path", () => {
    it("shows an ISO timestamp as a Spanish date and time in the user's timezone (summer)", () => {
      expect(formatDateTime("2026-10-06T10:02:39Z")).toBe("6/10/2026, 12:02:39");
    });

    it("applies the winter offset in winter", () => {
      expect(formatDateTime("2026-01-15T10:00:00Z")).toBe("15/1/2026, 11:00:00");
    });
  });

  describe("edge cases", () => {
    it("moves to the next day when the local time passes midnight", () => {
      expect(formatDateTime("2026-12-31T23:30:00Z")).toBe("1/1/2027, 0:30:00");
    });

    it("a date without a time is read as midnight UTC", () => {
      expect(formatDateTime("2026-10-06")).toBe("6/10/2026, 2:00:00");
    });
  });

  describe("failure modes", () => {
    it.each(["", "not-a-date", "2026-13-45"])("does not throw on the invalid timestamp %j", (value) => {
      expect(() => formatDateTime(value)).not.toThrow();
    });

    // Known weakness: a bad timestamp from the API is shown to the user as the English words "Invalid Date". Remove
    // `.failing` once formatDateTime returns a dash (or any other readable placeholder) for an invalid date.
    it.failing("shows a dash, not the words 'Invalid Date', for an invalid timestamp", () => {
      expect(formatDateTime("not-a-date")).toBe("—");
    });
  });
});
