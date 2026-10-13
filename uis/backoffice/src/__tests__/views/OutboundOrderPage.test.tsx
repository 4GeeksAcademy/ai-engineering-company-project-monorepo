/**
 * The outbound-order form (`views/OutboundOrderPage.tsx`): it shows the stock available for the chosen asset
 * before anything is sent, warns about a quantity above it while typing, and shows the API's 400 as a readable
 * message next to the quantity field.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OutboundOrderPage from "@/views/OutboundOrderPage";
import { ApiError } from "@/lib/api";

const mockList = jest.fn();
const mockGet = jest.fn();
const mockRegister = jest.fn();
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
// The view reaches the API only through lib/inventory.ts: that is the seam.
jest.mock("@/lib/inventory", () => ({
  listAssets: (...args: unknown[]) => mockList(...args),
  getAsset: (...args: unknown[]) => mockGet(...args),
  createOutboundOrder: (...args: unknown[]) => mockRegister(...args),
}));

// Entity names follow the Hito 5 CONTEXT: "activo" (Asset), not the README's "producto".
const PAPER = { id: 5, name: "Resma de papel A4", sku: "NXV-OFF-001", category: "office_supplies", office: "Valencia", current_stock: 3 };
const LAPTOP = { id: 1, name: 'Portátil 14" Business', sku: "NXV-IT-001", category: "hardware", office: "Valencia", current_stock: 15 };

// The stock of the selected asset is read again from the API after the selection: wait for that to settle so no
// state update lands after the test (React's "not wrapped in act" warning).
const settled = () =>
  waitFor(() => {
    expect(screen.queryByLabelText("Actualizando stock")).not.toBeInTheDocument();
    expect(screen.getByTestId("available-stock")).toBeInTheDocument();
  });

const choose = async (asset: typeof PAPER) => {
  await screen.findByRole("option", { name: new RegExp(asset.sku) });
  fireEvent.change(screen.getByLabelText("Activo"), { target: { value: String(asset.id) } });
  await settled();
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Registrar salida" }));

beforeEach(() => {
  mockList.mockReset().mockResolvedValue([LAPTOP, PAPER]);
  mockGet.mockReset().mockImplementation(async (id: number) => [LAPTOP, PAPER].find((p) => p.id === id));
  mockRegister.mockReset();
});

describe("OutboundOrderPage", () => {
  describe("happy path", () => {
    it("shows the stock available for the product as soon as it is selected, before sending", async () => {
      render(<OutboundOrderPage />);
      await choose(PAPER);

      expect(await screen.findByTestId("available-stock")).toHaveTextContent("3 unidades");
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("shows the figure the API has now, when it differs from the list loaded earlier", async () => {
      mockGet.mockResolvedValue({ ...PAPER, current_stock: 1 });
      render(<OutboundOrderPage />);
      await choose(PAPER);

      await waitFor(() => expect(screen.getByTestId("available-stock")).toHaveTextContent("1 unidad"));
    });

    it("registers an allocation with the employee and the product's office", async () => {
      mockRegister.mockResolvedValue({ type: "outbound", id: 9, asset: PAPER, quantity: 2, office: "Valencia" });
      render(<OutboundOrderPage />);
      await choose(PAPER);
      fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "Ana Pérez" } });
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "2" } });

      submit();

      await waitFor(() =>
        expect(mockRegister).toHaveBeenCalledWith({
          asset_id: 5,
          quantity: 2,
          exit_type: "allocation",
          assigned_to: "Ana Pérez",
          office: "Valencia",
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent("Salida registrada");
    });

    it("registers a consumption without asking for an employee", async () => {
      mockRegister.mockResolvedValue({ type: "outbound", id: 9, asset: PAPER, quantity: 1, office: "Valencia" });
      render(<OutboundOrderPage />);
      await choose(PAPER);
      fireEvent.change(screen.getByLabelText("Tipo de salida"), { target: { value: "consumption" } });
      expect(screen.queryByLabelText("Asignado a")).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "1" } });

      submit();

      await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ exit_type: "consumption", assigned_to: null })));
    });
  });

  describe("edge cases", () => {
    it("asks for an asset before showing any figure", async () => {
      render(<OutboundOrderPage />);
      await screen.findByRole("option", { name: /NXV-OFF-001/ }); // the list has loaded
      expect(screen.getByTestId("stock-panel")).toHaveTextContent("Selecciona un activo");
    });

    it("warns, while typing and before sending, that the quantity is above the stock shown", async () => {
      render(<OutboundOrderPage />);
      await choose(PAPER);
      await screen.findByTestId("available-stock");

      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "10" } });

      expect(screen.getByTestId("quantity-warning")).toHaveTextContent("solo hay 3 unidades en stock y pides 10");
      expect(mockRegister).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "3" } });
      expect(screen.queryByTestId("quantity-warning")).not.toBeInTheDocument();
    });

    it("still sends a quantity above the stock shown: the API applies the real rule", async () => {
      mockRegister.mockRejectedValue(new ApiError("Insufficient stock for asset 'Resma de papel A4'. Available: 3, requested: 10.", 400));
      render(<OutboundOrderPage />);
      await choose(PAPER);
      await screen.findByTestId("available-stock");
      fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "Ana" } });
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "10" } });

      submit();

      await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    });

    it("clears the whole form after a successful send and confirms it", async () => {
      mockRegister.mockResolvedValue({ type: "outbound", id: 9, asset: PAPER, quantity: 1, office: "Valencia" });
      render(<OutboundOrderPage />);
      await choose(PAPER);
      fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "Ana" } });
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "1" } });

      submit();

      expect(await screen.findByRole("status")).toHaveTextContent("Salida registrada");
      expect(screen.getByLabelText("Activo")).toHaveValue("");
      expect(screen.getByLabelText("Cantidad")).toHaveValue(null);
      expect(screen.getByLabelText("Asignado a")).toHaveValue("");
    });

    it("preselects the asset of the link that opened the page", async () => {
      render(<OutboundOrderPage initialAssetId="5" />);

      expect(await screen.findByTestId("available-stock")).toHaveTextContent("3 unidades");
      expect(screen.getByLabelText("Activo")).toHaveValue("5");
      await settled();
    });

    it("starts with nothing selected when the linked asset does not exist", async () => {
      render(<OutboundOrderPage initialAssetId="999" />);

      await screen.findByRole("option", { name: /NXV-OFF-001/ });
      await waitFor(() => expect(screen.getByLabelText("Activo")).toHaveValue(""));
    });

    it("does not call the API when an allocation has no employee", async () => {
      render(<OutboundOrderPage />);
      await choose(PAPER);
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "1" } });

      submit();

      expect(await screen.findByText(/a quién se asigna/)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe("failure modes", () => {
    it("shows the API's 400 as a readable sentence next to the quantity field, never as JSON, and reads the stock again", async () => {
      // The list said 15 but someone else took them meanwhile: the client check passes, the server says 400.
      mockRegister.mockRejectedValue(
        new ApiError("Insufficient stock for asset 'Portátil 14\" Business'. Available: 2, requested: 4.", 400),
      );
      render(<OutboundOrderPage />);
      await choose(LAPTOP);
      await screen.findByTestId("available-stock");
      fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "Ana" } });
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "4" } });
      mockGet.mockResolvedValue({ ...LAPTOP, current_stock: 2 });

      submit();

      const message = await screen.findByText(/No hay stock suficiente de/);
      expect(message).toHaveTextContent("No hay stock suficiente de «Portátil 14\" Business»: disponible 2, solicitado 4.");
      expect(message.textContent).not.toMatch(/[{}]|detail/);
      // inline: it is the quantity field's own error, wired to it for screen readers
      expect(message).toHaveAttribute("id", "outbound-quantity-error");
      expect(screen.getByLabelText("Cantidad")).toHaveAttribute("aria-invalid", "true");
      await waitFor(() => expect(screen.getByTestId("available-stock")).toHaveTextContent("2 unidades"));
    });

    it("shows a message, not a silent failure, when the server cannot be reached", async () => {
      mockRegister.mockRejectedValue(new ApiError("No response from the server", 0));
      render(<OutboundOrderPage />);
      await choose(PAPER);
      fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "Ana" } });
      fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "1" } });

      submit();

      expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo conectar/);
    });

    it("shows why the products could not be loaded", async () => {
      mockList.mockRejectedValue(new ApiError("Internal Server Error", 500));
      render(<OutboundOrderPage />);

      expect(await screen.findByRole("alert")).toHaveTextContent(/problema/);
    });
  });
});
