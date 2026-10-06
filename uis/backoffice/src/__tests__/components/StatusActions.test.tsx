/**
 * The status buttons of an incident (`components/incidents/StatusActions.tsx`): which moves are offered and how each is named.
 * The wording rule is tested in `lib/labels.test.ts`; this checks the buttons use it.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { Incident, IncidentStatus } from "@repo/shared-types";
import StatusActions from "@/components/incidents/StatusActions";

const incident = (status: IncidentStatus, allowed: IncidentStatus[]) => ({ status, allowed_transitions: allowed }) as unknown as Incident;
const renderActions = (status: IncidentStatus, allowed: IncidentStatus[]) =>
  render(<StatusActions incident={incident(status, allowed)} onChanged={jest.fn()} onConflict={jest.fn()} />);

describe("StatusActions", () => {
  describe("happy path", () => {
    it("offers one button per allowed move, named by what it does", () => {
      renderActions("open", ["in_progress", "discarded"]);

      expect(screen.getByRole("button", { name: "Poner en curso" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Descartar" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Resolver" })).not.toBeInTheDocument(); // not allowed from open
    });

    it("choosing a move asks for the confirmation, named in lower case", () => {
      renderActions("open", ["discarded"]);

      fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

      expect(screen.getByLabelText("Motivo del descarte")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmar: descartar" })).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("going back to open is 'Devolver a abierta' from in progress", () => {
      renderActions("in_progress", ["open", "resolved"]);

      expect(screen.getByRole("button", { name: "Devolver a abierta" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Resolver" })).toBeInTheDocument();
    });

    it.each(["resolved", "discarded"] as const)("going back to open from %s is 'Reabrir'", (status) => {
      renderActions(status, ["open"]);

      expect(screen.getByRole("button", { name: "Reabrir" })).toBeInTheDocument();
    });
  });

  describe("failure modes", () => {
    it("an incident with no allowed move shows nothing at all", () => {
      const { container } = renderActions("resolved", []);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
