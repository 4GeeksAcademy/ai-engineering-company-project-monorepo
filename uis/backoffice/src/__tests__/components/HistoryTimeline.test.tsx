/**
 * The incident history list (`components/incidents/HistoryTimeline.tsx`): the sentence for each event and its time. The
 * sentences are tested in `lib/labels.test.ts` and the time format in `lib/format.test.ts`; this checks the list uses them.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { render, screen, within } from "@testing-library/react";
import type { HistoryEntry } from "@repo/shared-types";
import HistoryTimeline from "@/components/incidents/HistoryTimeline";

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

describe("HistoryTimeline", () => {
  describe("happy path", () => {
    it("shows what happened, when and who did it", () => {
      render(<HistoryTimeline history={[entry({ kind: "status_changed", from_status: "open", to_status: "resolved" })]} />);

      const item = screen.getByRole("listitem");
      expect(within(item).getByText("Estado: Abierta → Resuelta")).toBeInTheDocument();
      expect(within(item).getByText("6/10/2026, 12:00:00")).toHaveAttribute("datetime", "2026-10-06T10:00:00Z");
      expect(item).toHaveTextContent("ana@example.com");
    });
  });

  describe("edge cases", () => {
    it("lists the newest event first, without changing the order of the data it was given", () => {
      const history = [
        entry({ at: "2026-10-01T09:00:00Z", kind: "created" }),
        entry({ at: "2026-10-02T09:00:00Z", kind: "edited", fields: ["title"] }),
        entry({ at: "2026-10-03T09:00:00Z", kind: "status_changed", from_status: "open", to_status: "in_progress" }),
      ];

      render(<HistoryTimeline history={history} />);

      expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        expect.stringContaining("Estado: Abierta → En curso"),
        expect.stringContaining("Editada: título"),
        expect.stringContaining("Incidencia creada"),
      ]);
      expect(history.map((e) => e.kind)).toEqual(["created", "edited", "status_changed"]);
    });
  });

  describe("failure modes", () => {
    it("an incident with no history shows the heading and an empty list, not an error", () => {
      render(<HistoryTimeline history={[]} />);

      expect(screen.getByRole("heading", { name: "Historial" })).toBeInTheDocument();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });

    it("an event with an invalid time still shows the rest of the entry", () => {
      render(<HistoryTimeline history={[entry({ at: "not-a-date", kind: "imported" })]} />);

      expect(screen.getByText("Importada desde el histórico CSV")).toBeInTheDocument();
    });
  });
});
