/**
 * The sign-up page (`views/RegisterPage.tsx`): how the form uses the rules in `lib/signUpForm.ts` (validation before
 * sending, the API's rejections turned into messages next to the right field) and hands the result to the session
 * context. The rules themselves are tested in `lib/signUpForm.test.ts`; this checks they are wired in.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { TextEncoder } from "util";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterPage from "@/views/RegisterPage";
import { ApiError } from "@/lib/api";

// jsdom has no TextEncoder, which the validator uses to count password bytes; every real browser has it.
Object.assign(globalThis, { TextEncoder });

const mockRegister = jest.fn();
const mockReplace = jest.fn();
let mockStatus = "anonymous";
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ status: mockStatus, register: mockRegister }) }));
jest.mock("next/navigation", () => {
  const router = { replace: (...args: unknown[]) => mockReplace(...args) };
  return { useRouter: () => router };
});
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

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
const fillValidForm = () => {
  fill("Email", "ana@example.com"); // a type="email" input already strips the spaces around it
  fill("Contraseña", "s3cret-pass");
  fill("Repite la contraseña", "s3cret-pass");
};

beforeEach(() => {
  mockRegister.mockReset();
  mockReplace.mockReset();
  mockStatus = "anonymous";
});

describe("RegisterPage", () => {
  describe("happy path", () => {
    it("sends the credentials, leaving out the optional profile fields that were not filled", async () => {
      mockRegister.mockResolvedValue("authenticated");
      render(<RegisterPage />);
      fillValidForm();

      submit();

      await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
      expect(mockRegister).toHaveBeenCalledWith({
        email: "ana@example.com",
        password: "s3cret-pass",
        name: undefined,
        phone: undefined,
        address: undefined,
      });
    });

    it("sends the optional profile fields, trimmed, when they are filled", async () => {
      mockRegister.mockResolvedValue("authenticated");
      render(<RegisterPage />);
      fillValidForm();
      fill("Nombre", "  Ana García ");
      fill("Teléfono", "+34 600 000 000");
      fill("Dirección", " Calle Mayor 1 ");

      submit();

      await waitFor(() => expect(mockRegister).toHaveBeenCalled());
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ana García", phone: "+34 600 000 000", address: "Calle Mayor 1" }),
      );
    });
  });

  describe("edge cases", () => {
    it("shows each rule's message next to its field and clears it as soon as the user edits that field", () => {
      render(<RegisterPage />);

      submit();
      expect(screen.getByText("El email es obligatorio.")).toBeInTheDocument();
      fill("Email", "ana@example.com");

      expect(screen.queryByText("El email es obligatorio.")).not.toBeInTheDocument();
      expect(screen.getByText("La contraseña es obligatoria.")).toBeInTheDocument(); // the other field is untouched
    });

    it("an account created but not logged in shows a message and a link to the login page", async () => {
      mockRegister.mockResolvedValue("created");
      render(<RegisterPage />);
      fillValidForm();

      submit();

      expect(await screen.findByText(/Cuenta creada, pero no se pudo iniciar sesión/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toHaveAttribute("href", "/login");
    });

    it("an already logged-in user is sent to the app and sees no form", () => {
      mockStatus = "authenticated";

      const { container } = render(<RegisterPage />);

      expect(container).toBeEmptyDOMElement();
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  describe("failure modes", () => {
    it("an invalid form is never sent, and every problem is reported at once", () => {
      render(<RegisterPage />);
      fill("Email", "not-an-email");
      fill("Contraseña", "short");
      fill("Repite la contraseña", "different");

      submit();

      expect(screen.getByText("El email no es válido.")).toBeInTheDocument();
      expect(screen.getByText(/al menos 8 caracteres/)).toBeInTheDocument();
      expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("a duplicate email (409) is reported under the email field", async () => {
      mockRegister.mockRejectedValue(new ApiError("already exists", 409));
      render(<RegisterPage />);
      fillValidForm();

      submit();

      expect(await screen.findByText("Ya existe una cuenta con ese email.")).toBeInTheDocument();
    });

    it("a 422 puts the server's message next to the field it names", async () => {
      mockRegister.mockRejectedValue(new ApiError("...", 422, { password: "String should have at least 8 characters" }));
      render(<RegisterPage />);
      fillValidForm();

      submit();

      expect(await screen.findByText("String should have at least 8 characters")).toBeInTheDocument();
    });

    it("an error that is not the API's shows a generic message and never its own text", async () => {
      mockRegister.mockRejectedValue(new Error("secret internal detail"));
      render(<RegisterPage />);
      fillValidForm();

      submit();

      expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo crear la cuenta. Comprueba tu conexión");
      expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    });
  });
});
