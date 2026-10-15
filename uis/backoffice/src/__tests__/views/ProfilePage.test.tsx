/**
 * The profile page (`views/ProfilePage.tsx`): how it fills the form from the session's user and sends only what changed. The
 * two rules (`toProfileForm`, `profileChanges`) are tested in `lib/profileFields.test.ts`; this checks the page uses them.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { TextEncoder } from "util";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "@/views/ProfilePage";
import type { Me } from "@/types/auth";

// jsdom has no TextEncoder, which the sign-up validator imported by the page's module graph may use; every browser has it.
Object.assign(globalThis, { TextEncoder });

const mockSaveProfile = jest.fn();
const mockRefreshUser = jest.fn();
let mockUser: Me;
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefreshUser, saveProfile: mockSaveProfile }),
}));

const me = (profile: Partial<Me["profile"]> = {}): Me => ({
  id: "u1",
  email: "ana@example.com",
  role: "user",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  profile: { id: "p1", user_id: "u1", name: "Ana", contact_email: null, phone: null, address: null, ...profile },
});

const field = (label: string) => screen.findByLabelText(label) as Promise<HTMLInputElement>;
const type = async (label: string, value: string) => fireEvent.change(await field(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

beforeEach(() => {
  mockSaveProfile.mockReset().mockResolvedValue(undefined);
  mockRefreshUser.mockReset().mockResolvedValue(undefined);
  mockUser = me({ phone: "600000000", address: "Calle 1" });
});

describe("ProfilePage", () => {
  describe("happy path", () => {
    it("shows the user's data in the form, with the email read-only", async () => {
      render(<ProfilePage />);

      expect((await field("Nombre")).value).toBe("Ana");
      expect((await field("Teléfono")).value).toBe("600000000");
      expect((await field("Dirección")).value).toBe("Calle 1");
      expect((await field("Email")).value).toBe("ana@example.com");
      expect(await field("Email")).toHaveAttribute("readonly");
    });

    it("saves only the field that changed", async () => {
      render(<ProfilePage />);
      await type("Nombre", "Ana María");

      save();

      await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
      expect(mockSaveProfile).toHaveBeenCalledWith({ name: "Ana María" });
      expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("an unset phone and address are empty inputs, not the word null", async () => {
      mockUser = me({ phone: null, address: null });

      render(<ProfilePage />);

      expect((await field("Teléfono")).value).toBe("");
      expect((await field("Dirección")).value).toBe("");
    });

    it("with nothing changed the save button is off", async () => {
      render(<ProfilePage />);
      await field("Nombre");

      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    });

    it("an emptied optional field is sent as null so the API clears it", async () => {
      render(<ProfilePage />);
      await type("Teléfono", "   ");

      save();

      await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledWith({ phone: null }));
    });
  });

  describe("failure modes", () => {
    it("an invalid phone is shown next to its field and nothing is sent", async () => {
      render(<ProfilePage />);
      await type("Teléfono", "abc");

      save();

      expect(await screen.findByText(/teléfono no es válido/i)).toBeInTheDocument();
      expect(mockSaveProfile).not.toHaveBeenCalled();
    });

    it("an emptied name is refused by the form before it can reach the API", async () => {
      render(<ProfilePage />);
      await type("Nombre", "   ");

      save();

      expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
      expect(mockSaveProfile).not.toHaveBeenCalled();
    });

    it("if the profile cannot be loaded it says so instead of showing an empty form", async () => {
      mockRefreshUser.mockRejectedValue(new Error("network"));

      render(<ProfilePage />);

      expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar tu perfil");
      expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    });
  });
});
