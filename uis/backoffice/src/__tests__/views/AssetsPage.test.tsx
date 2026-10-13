/**
 * The stock page (`views/AssetsPage.tsx`, /inventory/products): the assets with `current_stock`, the colour-coded
 * level, and a labelled link per row to register an entry or an exit for that asset.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import AssetsPage from "@/views/AssetsPage";

const mockList = jest.fn();
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...rest }: { href: string; children: unknown }) => <a href={href} {...rest}>{children as never}</a> }));
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
  return { ApiError };
});
jest.mock("@/lib/inventory", () => ({ listAssets: (...args: unknown[]) => mockList(...args) }));

const asset = (id: number, name: string, sku: string, stock: number, office = "Valencia") => ({
  id,
  name,
  sku,
  category: "hardware",
  office,
  current_stock: stock,
});
const ASSETS = [
  asset(1, 'Portátil 14" Business', "NXV-IT-001", 12),
  asset(2, 'Portátil 14" Business', "NXV-IT-002", 5, "Miami"),
  asset(3, "Hub USB-C", "NXV-PER-002", 0, "Miami"),
];

beforeEach(() => mockList.mockReset().mockResolvedValue(ASSETS));

describe("AssetsPage", () => {
  describe("happy path", () => {
    it("lists every asset with its SKU, office and current_stock", async () => {
      render(<AssetsPage />);

      const rows = await screen.findAllByTestId("asset-row");
      expect(rows).toHaveLength(3);
      const first = within(rows[0]);
      expect(first.getByText("Hub USB-C")).toBeInTheDocument();
      expect(first.getByText("NXV-PER-002")).toBeInTheDocument();
      expect(first.getByText("Miami")).toBeInTheDocument();
    });

    it("tells the levels apart by colour and by text: no stock, low, fine", async () => {
      render(<AssetsPage />);

      const rows = await screen.findAllByTestId("asset-row");
      // lowest first: the asset with no stock, then the low one, then the healthy one
      expect(rows.map((r) => r.querySelector("[data-level]")?.getAttribute("data-level"))).toEqual(["empty", "low", "ok"]);
      expect(within(rows[0]).getByText("Sin stock")).toBeInTheDocument();
      expect(within(rows[1]).getByText("Stock bajo")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Stock correcto")).toBeInTheDocument();
    });

    it("has, in every row, a clearly labelled link to register an entry and an exit for that asset", async () => {
      render(<AssetsPage />);

      const rows = await screen.findAllByTestId("asset-row");
      const row = within(rows[2]); // NXV-IT-001, id 1
      expect(row.getByRole("link", { name: /Registrar entrada de «Portátil 14" Business» \(NXV-IT-001\)/ })).toHaveAttribute(
        "href",
        "/inventory/orders/inbound?asset=1",
      );
      expect(row.getByRole("link", { name: /Registrar salida de «Portátil 14" Business» \(NXV-IT-001\)/ })).toHaveAttribute(
        "href",
        "/inventory/orders/outbound?asset=1",
      );
    });
  });

  describe("edge cases", () => {
    it("filters by level when a summary tile is pressed", async () => {
      render(<AssetsPage />);
      await screen.findAllByTestId("asset-row");

      fireEvent.click(screen.getByRole("button", { name: /Stock bajo/ }));

      expect(screen.getAllByTestId("asset-row")).toHaveLength(1);
      expect(screen.getByText("NXV-IT-002")).toBeInTheDocument();
    });

    it("says so when there are no assets at all", async () => {
      mockList.mockResolvedValue([]);
      render(<AssetsPage />);

      expect(await screen.findByText("Todavía no hay activos registrados.")).toBeInTheDocument();
    });
  });

  describe("failure modes", () => {
    it("shows why the list could not be loaded, with a way to try again", async () => {
      const { ApiError } = jest.requireMock("@/lib/api");
      mockList.mockRejectedValueOnce(new ApiError("Boom", 0));
      render(<AssetsPage />);

      expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo conectar/);
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(await screen.findAllByTestId("asset-row")).toHaveLength(3);
    });

    it("shows that it is loading while retrying, never an empty list that says there are no assets", async () => {
      const { ApiError } = jest.requireMock("@/lib/api");
      let finish: (assets: unknown[]) => void = () => undefined;
      mockList.mockRejectedValueOnce(new ApiError("Boom", 0)).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
      render(<AssetsPage />);
      await screen.findByRole("alert");

      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

      expect(await screen.findByText("Cargando inventario…")).toBeInTheDocument();
      expect(screen.queryByText("Todavía no hay activos registrados.")).not.toBeInTheDocument();
      finish(ASSETS);
      expect(await screen.findAllByTestId("asset-row")).toHaveLength(3);
    });
  });
});
