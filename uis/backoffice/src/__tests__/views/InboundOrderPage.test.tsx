/**
 * The entry form (`views/InboundOrderPage.tsx`, /inventory/orders/inbound): an asset picked by name, the data the
 * API needs, the form cleared with a confirmation after a send, and a visible message when the API fails.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InboundOrderPage from "@/views/InboundOrderPage";

const mockList = jest.fn();
const mockGet = jest.fn();
const mockCreate = jest.fn();
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a> }));
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
jest.mock("@/lib/inventory", () => ({
  listAssets: (...args: unknown[]) => mockList(...args),
  getAsset: (...args: unknown[]) => mockGet(...args),
  createInboundOrder: (...args: unknown[]) => mockCreate(...args),
}));

const HUB = { id: 4, name: "Hub USB-C", sku: "NXV-PER-002", category: "peripherals", office: "Miami", current_stock: 25 };

const settled = () =>
  waitFor(() => {
    expect(screen.queryByLabelText("Actualizando stock")).not.toBeInTheDocument();
    expect(screen.getByTestId("available-stock")).toBeInTheDocument();
  });
const choose = async () => {
  await screen.findByRole("option", { name: /NXV-PER-002/ });
  fireEvent.change(screen.getByLabelText("Activo"), { target: { value: "4" } });
  await settled();
};
const fillAndSend = () => {
  fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "Office Depot Miami" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
};

beforeEach(() => {
  mockList.mockReset().mockResolvedValue([HUB]);
  mockGet.mockReset().mockResolvedValue(HUB);
  mockCreate.mockReset();
});

describe("InboundOrderPage", () => {
  describe("happy path", () => {
    it("lists the assets by name (never asks for a raw id) and sends the entry with the asset's office", async () => {
      mockCreate.mockResolvedValue({ type: "inbound", id: 7, asset: HUB, quantity: 10, office: "Miami" });
      render(<InboundOrderPage />);
      await choose();

      fillAndSend();

      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({ asset_id: 4, quantity: 10, supplier: "Office Depot Miami", office: "Miami" }),
      );
      expect(screen.getByRole("option", { name: "Hub USB-C · NXV-PER-002 · Miami" })).toBeInTheDocument();
    });

    it("clears the form and confirms after a successful send", async () => {
      mockCreate.mockResolvedValue({ type: "inbound", id: 7, asset: HUB, quantity: 10, office: "Miami" });
      render(<InboundOrderPage />);
      await choose();

      fillAndSend();

      expect(await screen.findByRole("status")).toHaveTextContent("Entrada registrada: 10 unidades de «Hub USB-C» (Miami)");
      expect(screen.getByLabelText("Activo")).toHaveValue("");
      expect(screen.getByLabelText("Cantidad")).toHaveValue(null);
      expect(screen.getByLabelText("Proveedor")).toHaveValue("");
    });
  });

  describe("edge cases", () => {
    it("asks for every missing field and does not call the API", async () => {
      render(<InboundOrderPage />);
      await screen.findByRole("option", { name: /NXV-PER-002/ });

      fireEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));

      expect(await screen.findByText("Selecciona el activo recibido.")).toBeInTheDocument();
      expect(screen.getByText("Indica el proveedor.")).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("failure modes", () => {
    it("shows the API's message in a visible element on a 400", async () => {
      const { ApiError } = jest.requireMock("@/lib/api");
      mockCreate.mockRejectedValue(new ApiError("Asset 'Hub USB-C' belongs to the Miami office: an order for it cannot be registered in Valencia.", 422));
      render(<InboundOrderPage />);
      await choose();

      fillAndSend();

      expect(await screen.findByRole("alert")).toHaveTextContent(/pertenece a la oficina de Miami/);
      expect(screen.getByLabelText("Cantidad")).toHaveValue(10); // the form is kept so nothing has to be retyped
    });

    it("shows a visible message on a 500, not only in the console", async () => {
      const { ApiError } = jest.requireMock("@/lib/api");
      mockCreate.mockRejectedValue(new ApiError("Internal Server Error", 500));
      render(<InboundOrderPage />);
      await choose();

      fillAndSend();

      expect(await screen.findByRole("alert")).toHaveTextContent(/problema \(error 500\)/);
    });
  });
});
