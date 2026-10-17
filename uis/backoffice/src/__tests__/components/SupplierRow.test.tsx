/**
 * One row of the supplier table (`components/suppliers/SupplierRow.tsx`): how it shows the rate, the last update and the
 * contract-renewal warning. The rules behind them (money, dates, the 60-day window) are tested in `lib/format.test.ts`;
 * this checks the row is wired to them.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { render, screen } from "@testing-library/react";
import SupplierRow from "@/components/suppliers/SupplierRow";
import type { Supplier } from "@/types/suppliers";

const supplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 1,
  name: "Workable",
  country: "Spain",
  categories: ["ats_software"],
  monthly_rate: 1200.5,
  currency: "EUR",
  status: "active",
  contract_renewal_date: null,
  contact_email: null,
  notes: null,
  updated_at: "2026-10-06T10:02:39Z",
  ...overrides,
});

const renderRow = (overrides: Partial<Supplier> = {}) =>
  render(
    <table>
      <tbody>
        <SupplierRow supplier={supplier(overrides)} onRateChange={jest.fn()} onToggleStatus={jest.fn()} />
      </tbody>
    </table>,
  );

// "Today" is 6 October 2026 (Madrid time, pinned in jest.global-setup.mjs).
beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 6, 10, 0, 0) }));
afterEach(() => jest.useRealTimers());

describe("SupplierRow", () => {
  describe("happy path", () => {
    it("shows the monthly rate as Spanish money and the time of the last update", () => {
      renderRow();

      expect(screen.getByText(/1200,50\s€/)).toBeInTheDocument();
      expect(screen.getByText("Actualizada 6/10/2026, 12:02:39")).toBeInTheDocument();
    });

    it("warns when the contract renews within 60 days, saying how many", () => {
      renderRow({ contract_renewal_date: "2026-11-05" }); // 30 days away

      expect(screen.getByText("Renueva en 30 días")).toBeInTheDocument();
    });

    it("writes a supplier paid in dollars with the dollar symbol", () => {
      renderRow({ country: "USA", currency: "USD", monthly_rate: 850 });

      expect(screen.getByText(/850,00\sUS\$/)).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it.each([
      ["2026-10-06", "Renueva en 0 días"], // today still counts as coming up
      ["2026-12-05", "Renueva en 60 días"], // the last day of the window
    ])("renewing on %s warns: %s", (date, warning) => {
      renderRow({ contract_renewal_date: date });

      expect(screen.getByText(warning)).toBeInTheDocument();
    });

    it("a renewal 61 days away shows the date and no warning", () => {
      renderRow({ contract_renewal_date: "2026-12-06" });

      expect(screen.getByText("2026-12-06")).toBeInTheDocument();
      expect(screen.queryByText(/Renueva en/)).not.toBeInTheDocument();
      expect(screen.queryByText("Fecha vencida")).not.toBeInTheDocument();
    });
  });

  describe("failure modes", () => {
    it("a renewal date in the past says it is overdue", () => {
      renderRow({ contract_renewal_date: "2026-10-05" });

      expect(screen.getByText("Fecha vencida")).toBeInTheDocument();
      expect(screen.queryByText(/Renueva en/)).not.toBeInTheDocument();
    });

    it("a supplier with no renewal date shows a dash and no warning", () => {
      renderRow({ contract_renewal_date: null });

      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.queryByText(/Renueva en|Fecha vencida/)).not.toBeInTheDocument();
    });

    it("an unreadable renewal date shows as it came, without a false warning", () => {
      renderRow({ contract_renewal_date: "not-a-date" });

      expect(screen.getByText("not-a-date")).toBeInTheDocument();
      expect(screen.queryByText(/Renueva en|Fecha vencida/)).not.toBeInTheDocument();
    });
  });
});
