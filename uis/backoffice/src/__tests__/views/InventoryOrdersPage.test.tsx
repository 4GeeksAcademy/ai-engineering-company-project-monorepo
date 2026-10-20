/**
 * The order history (`views/InventoryOrdersPage.tsx`, /inventory/orders): every entry and exit with the asset's name,
 * quantity, type, date and the `user_uuid` that created it; read-only.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import InventoryOrdersPage from "@/views/InventoryOrdersPage";

const mockOrders = jest.fn();
const mockDirectory = jest.fn();
jest.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public fieldErrors: Record<string, string> = {},
    ) {
      super(message);
    }
  }
  return { ApiError, listUserDirectory: (...args: unknown[]) => mockDirectory(...args) };
});
jest.mock("@/lib/inventory", () => ({ listOrders: (...args: unknown[]) => mockOrders(...args) }));
// The real comparator, wrapped so the tests can count how often the list is sorted.
jest.mock("@/lib/inventoryRules", () => {
  const actual = jest.requireActual("@/lib/inventoryRules");
  return { ...actual, compareOrdersNewestFirst: jest.fn(actual.compareOrdersNewestFirst) };
});

const MARTA = "6f1c2b7e-1111-4000-8000-000000000001";
const NIL = "00000000-0000-0000-0000-000000000000";
const PAPER = { id: 5, name: "Resma de papel A4", sku: "NXV-OFF-001", category: "office_supplies", office: "Valencia" };
const ORDERS = [
  { type: "inbound", id: 1, asset: PAPER, quantity: 100, office: "Valencia", created_at: "2026-10-12T08:00:00Z", user_uuid: NIL, supplier: "Office Depot Miami", exit_type: null, assigned_to: null },
  { type: "outbound", id: 1, asset: PAPER, quantity: 20, office: "Valencia", created_at: "2026-10-13T09:30:00Z", user_uuid: MARTA, supplier: null, exit_type: "allocation", assigned_to: "Ana Pérez" },
];

beforeEach(() => {
  mockOrders.mockReset().mockResolvedValue(ORDERS);
  mockDirectory.mockReset().mockResolvedValue([{ user_id: MARTA, name: "Marta Ruiz" }]);
});

describe("InventoryOrdersPage", () => {
  describe("happy path", () => {
    it("shows each order with the asset's name, quantity, type and the user_uuid that created it", async () => {
      render(<InventoryOrdersPage />);

      const rows = await screen.findAllByTestId("order-row");
      expect(rows).toHaveLength(2);
      const newest = within(rows[0]); // newest first: the exit
      expect(newest.getByText("Resma de papel A4")).toBeInTheDocument();
      expect(newest.getByText("Salida")).toBeInTheDocument();
      expect(newest.getByText("−20")).toBeInTheDocument();
      expect(newest.getByText("Marta Ruiz")).toBeInTheDocument();
      expect(newest.getByTestId("order-user-uuid")).toHaveTextContent(MARTA);
      expect(newest.getByText("Asignación a un empleado: Ana Pérez")).toBeInTheDocument();
    });

    it("tells entries and exits apart and shows the supplier of an entry", async () => {
      render(<InventoryOrdersPage />);

      const entry = within((await screen.findAllByTestId("order-row"))[1]);
      expect(entry.getByText("Entrada")).toBeInTheDocument();
      expect(entry.getByText("+100")).toBeInTheDocument();
      expect(entry.getByText("Office Depot Miami")).toBeInTheDocument();
      expect(entry.getByText("Sistema (datos iniciales)")).toBeInTheDocument();
      expect(entry.getByTestId("order-user-uuid")).toHaveTextContent(NIL);
    });

    it("is read-only: no forms, no edit or delete actions", async () => {
      const { container } = render(<InventoryOrdersPage />);
      await screen.findAllByTestId("order-row");

      expect(container.querySelector("form, input[type=number]")).toBeNull();
      expect(screen.queryByRole("button", { name: /editar|borrar|eliminar/i })).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("does not show that note when the directory works (a deactivated user is just not listed)", async () => {
      render(<InventoryOrdersPage />);
      await screen.findAllByTestId("order-row");

      expect(screen.queryByText(/No se pudieron cargar los nombres/)).not.toBeInTheDocument();
    });

    it("filters by type", async () => {
      render(<InventoryOrdersPage />);
      await screen.findAllByTestId("order-row");

      fireEvent.change(screen.getByLabelText("Filtrar por tipo"), { target: { value: "inbound" } });

      expect(screen.getAllByTestId("order-row")).toHaveLength(1);
    });

    it("sorts the orders once per load: changing a filter only filters the already sorted list (useMemo)", async () => {
      const { compareOrdersNewestFirst } = jest.requireMock("@/lib/inventoryRules");
      const many = Array.from({ length: 200 }, (_, i) => ({
        ...ORDERS[i % 2],
        id: i + 1,
        created_at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
      }));
      mockOrders.mockResolvedValue(many);
      render(<InventoryOrdersPage />);
      await screen.findAllByTestId("order-row");
      const sortComparisons = compareOrdersNewestFirst.mock.calls.length;
      expect(sortComparisons).toBeGreaterThan(0);

      fireEvent.change(screen.getByLabelText("Filtrar por tipo"), { target: { value: "inbound" } });
      fireEvent.change(screen.getByLabelText("Filtrar por oficina"), { target: { value: "Valencia" } });
      fireEvent.change(screen.getByLabelText("Filtrar por tipo"), { target: { value: "" } });

      expect(screen.getAllByTestId("order-row").length).toBeGreaterThan(0);
      expect(compareOrdersNewestFirst.mock.calls.length).toBe(sortComparisons); // no sort ran again
    });

    it("still lists the orders, with the uuid, when the user directory cannot be read", async () => {
      mockDirectory.mockRejectedValue(new Error("down"));
      render(<InventoryOrdersPage />);

      const rows = await screen.findAllByTestId("order-row");
      expect(within(rows[0]).getByText("Usuario no disponible")).toBeInTheDocument();
      expect(within(rows[0]).getByTestId("order-user-uuid")).toHaveTextContent(MARTA);
      expect(screen.getByRole("status")).toHaveTextContent(/No se pudieron cargar los nombres/);
    });
  });

  describe("failure modes", () => {
    it("shows why the history could not be loaded", async () => {
      const { ApiError } = jest.requireMock("@/lib/api");
      mockOrders.mockRejectedValue(new ApiError("Database is locked", 503));
      render(<InventoryOrdersPage />);

      expect(await screen.findByRole("alert")).toHaveTextContent(/problema.*Database is locked/);
    });
  });
});
