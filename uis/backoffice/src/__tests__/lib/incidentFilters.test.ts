/**
 * @jest-environment node
 */
// The query the incident list sends for its filters (`filtersQuery` in `lib/api.ts`). What matters is which filters are sent
// and which are left out; not how the bytes are encoded.
//
// Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
import { EMPTY_FILTERS, type IncidentFilters } from "@repo/shared-types";
import { filtersQuery } from "@/lib/api";

const filters = (overrides: Partial<IncidentFilters>): IncidentFilters => ({ ...EMPTY_FILTERS, ...overrides });

describe("filtersQuery", () => {
  describe("happy path", () => {
    it("sends every filter that has a value, and a multiple choice as repeated values", () => {
      const query = filtersQuery(
        filters({ status: ["open", "in_progress"], category: ["BILLING"], origin: ["customer"], branch: "Valencia", q: "vpn" }),
      );

      expect(query.getAll("status")).toEqual(["open", "in_progress"]);
      expect(query.getAll("category")).toEqual(["BILLING"]);
      expect(query.getAll("origin")).toEqual(["customer"]);
      expect([query.get("branch"), query.get("q")]).toEqual(["Valencia", "vpn"]);
    });

    it("sends the date range and the people and company filters too", () => {
      const query = filtersQuery(filters({ date_from: "2026-01-01", date_to: "2026-01-31", agent_id: "AGT-07", client_company: "FinServ Group" }));

      expect([query.get("date_from"), query.get("date_to"), query.get("agent_id"), query.get("client_company")]).toEqual([
        "2026-01-01",
        "2026-01-31",
        "AGT-07",
        "FinServ Group",
      ]);
    });
  });

  describe("edge cases", () => {
    it("trims the text filters before sending them", () => {
      const query = filtersQuery(filters({ branch: "  Valencia ", q: "\tvpn  caída\n" }));

      expect([query.get("branch"), query.get("q")]).toEqual(["Valencia", "vpn  caída"]);
    });

    it("leaves out a text filter that is empty or only spaces, so it does not narrow the list", () => {
      const query = filtersQuery(filters({ branch: "", q: "   ", agent_id: "\t", client_company: "" }));

      expect(query.toString()).toBe("");
    });

    it("keeps a value that merely looks like another parameter as one value", () => {
      const query = filtersQuery(filters({ q: "a&status=open" }));

      expect(query.get("q")).toBe("a&status=open");
      expect(query.has("status")).toBe(false);
    });

    it("does not change the filters it is given", () => {
      const input = filters({ branch: "  Valencia ", status: ["open"] });

      filtersQuery(input);

      expect(input).toEqual(filters({ branch: "  Valencia ", status: ["open"] }));
    });
  });

  describe("failure modes", () => {
    it("no filters at all is an empty query, which means the whole list", () => {
      expect(filtersQuery(EMPTY_FILTERS).toString()).toBe("");
    });

    it("an empty multiple choice sends nothing rather than an empty value", () => {
      const query = filtersQuery(filters({ status: [], category: [], origin: [], branch: "Valencia" }));

      expect([...query.keys()]).toEqual(["branch"]);
    });
  });
});
