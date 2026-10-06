/**
 * @jest-environment node
 */
// The Spanish texts the incident screens build from the data (`lib/labels.ts`): one line of the incident history, and the
// text of the button that changes an incident's status.
//
// Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
// FAILURE MODES. Arrange / Act / Assert.
import type { HistoryEntry, IncidentStatus } from "@repo/shared-types";
import { describeHistoryEntry, statusActionLabel } from "@/lib/labels";

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  at: "2026-10-06T10:00:00Z",
  kind: "created",
  actor: "ana@example.com",
  from_status: null,
  to_status: null,
  fields: [],
  note: null,
  ...overrides,
});

describe("describeHistoryEntry", () => {
  describe("happy path (one sentence per kind of event)", () => {
    it("a new incident", () => {
      expect(describeHistoryEntry(entry({ kind: "created" }))).toBe("Incidencia creada");
    });

    it("an incident imported from the helpdesk's CSV", () => {
      expect(describeHistoryEntry(entry({ kind: "imported" }))).toBe("Importada desde el histórico CSV");
    });

    it("an edit names the fields that changed, in Spanish", () => {
      expect(describeHistoryEntry(entry({ kind: "edited", fields: ["title", "client_company", "customer_email"] }))).toBe(
        "Editada: título, empresa cliente, email del cliente",
      );
    });

    it("a status change shows where it came from and where it went", () => {
      expect(describeHistoryEntry(entry({ kind: "status_changed", from_status: "open", to_status: "resolved" }))).toBe(
        "Estado: Abierta → Resuelta",
      );
    });
  });

  describe("edge cases", () => {
    it("a note on a status change is added in brackets", () => {
      const text = describeHistoryEntry(
        entry({ kind: "status_changed", from_status: "in_progress", to_status: "discarded", note: "duplicada de NXV-000012" }),
      );

      expect(text).toBe("Estado: En curso → Descartada (duplicada de NXV-000012)");
    });

    it("an empty note adds nothing", () => {
      expect(describeHistoryEntry(entry({ kind: "status_changed", from_status: "open", to_status: "in_progress", note: "" }))).toBe(
        "Estado: Abierta → En curso",
      );
    });

    it("every field an incident can have has its own Spanish name", () => {
      const fields = ["title", "description", "category", "origin", "branch", "client_company", "agent_id", "customer_email"];

      const text = describeHistoryEntry(entry({ kind: "edited", fields }));

      expect(text).toBe("Editada: título, descripción, categoría, origen, sucursal, empresa cliente, agente, email del cliente");
    });
  });

  describe("failure modes", () => {
    it("a field the screen does not know is shown by its own name rather than hidden", () => {
      expect(describeHistoryEntry(entry({ kind: "edited", fields: ["title", "new_field_from_the_api"] }))).toBe(
        "Editada: título, new_field_from_the_api",
      );
    });

    it("a missing origin or destination is a dash, not the word null", () => {
      expect(describeHistoryEntry(entry({ kind: "status_changed", from_status: null, to_status: "open" }))).toBe("Estado: — → Abierta");
      expect(describeHistoryEntry(entry({ kind: "status_changed", from_status: "open", to_status: null }))).toBe("Estado: Abierta → —");
    });

    it("a kind of event this version does not know does not crash the history", () => {
      expect(() => describeHistoryEntry(entry({ kind: "something_new" as HistoryEntry["kind"] }))).not.toThrow();
    });
  });
});

describe("statusActionLabel", () => {
  describe("happy path (the button for each target status)", () => {
    it.each([
      ["in_progress", "Poner en curso"],
      ["resolved", "Resolver"],
      ["discarded", "Descartar"],
    ] as const)("moving an open incident to %s is %j", (target, label) => {
      expect(statusActionLabel("open", target)).toBe(label);
    });
  });

  describe("edge cases (going back to open depends on where it is)", () => {
    it("from in progress it is handing the incident back", () => {
      expect(statusActionLabel("in_progress", "open")).toBe("Devolver a abierta");
    });

    it.each(["resolved", "discarded"] as const)("from %s it is reopening it", (current) => {
      expect(statusActionLabel(current, "open")).toBe("Reabrir");
    });
  });

  describe("failure modes", () => {
    it("a target status this version does not know has no label, and does not crash the page", () => {
      const unknown = "archived" as IncidentStatus;

      expect(() => statusActionLabel("open", unknown)).not.toThrow();
      expect(statusActionLabel("open", unknown)).toBeUndefined();
    });
  });
});
