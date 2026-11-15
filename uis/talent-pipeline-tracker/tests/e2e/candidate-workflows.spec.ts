import { expect, test, type Page, type Route } from "@playwright/test";

const apiPattern = "**/tracker/api/v1/**";

function candidateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "candidate-1",
    full_name: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "+1 512 555 0180",
    position: "Executive Assistant",
    linkedin_url: "https://linkedin.com/in/jordan-lee",
    cv_url: "https://example.com/jordan-cv.pdf",
    experience_years: 6,
    status: "in_progress",
    stage: "review",
    applied_at: "2026-01-15",
    ...overrides,
  };
}

type ApiState = {
  candidate: ReturnType<typeof candidateRecord>;
  createdCandidate?: ReturnType<typeof candidateRecord>;
  notes: Array<{ id: string; content: string; created_at: string }>;
  createFails?: boolean;
};

async function mockApi(page: Page, state: ApiState) {
  await page.route(apiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const recordsIndex = url.pathname.indexOf("/records");
    if (recordsIndex < 0) return route.continue();
    const path = url.pathname.slice(recordsIndex);
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (path === "/records" && method === "GET") {
      return json({ total: 1, page: 1, limit: 100, data: [state.candidate] });
    }
    if (path === "/records" && method === "POST") {
      if (state.createFails) return json({ detail: "Registration is temporarily unavailable." }, 503);
      const payload = request.postDataJSON();
      state.createdCandidate = candidateRecord({ ...payload, id: "candidate-created" });
      return json(state.createdCandidate, 201);
    }
    if (path === "/records/candidate-1" && method === "GET") return json(state.candidate);
    if (path === "/records/candidate-1" && method === "PUT") {
      state.candidate = candidateRecord({ ...request.postDataJSON(), id: "candidate-1" });
      return json(state.candidate);
    }
    if (path === "/records/candidate-1" && method === "PATCH") {
      state.candidate = { ...state.candidate, ...request.postDataJSON() } as typeof state.candidate;
      return json(state.candidate);
    }
    if (path === "/records/candidate-1/notes" && method === "GET") return json({ data: state.notes, meta: {} });
    if (path === "/records/candidate-1/notes" && method === "POST") {
      const note = { id: `note-${state.notes.length + 1}`, content: request.postDataJSON().content, created_at: "2026-02-01" };
      state.notes.unshift(note);
      return json(note, 201);
    }
    if (path.startsWith("/records/candidate-1/notes/") && method === "DELETE") {
      state.notes = state.notes.filter((note) => `/records/candidate-1/notes/${note.id}` !== path);
      return route.fulfill({ status: 204 });
    }
    return json({ detail: `Unhandled mock request: ${method} ${path}` }, 404);
  });
}

test.describe("candidate workflows", () => {
  test("registers, edits, moves, and records an internal note", async ({ page }) => {
    const state: ApiState = { candidate: candidateRecord(), notes: [] };
    await mockApi(page, state);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Talent pipeline" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Jordan Lee/ })).toBeVisible();

    await page.getByRole("button", { name: /Register candidate/ }).click();
    const registration = page.getByRole("dialog");
    await registration.getByLabel("Full name *").fill("Taylor Morgan");
    await registration.getByLabel("Email address *").fill("taylor.morgan@example.com");
    await registration.getByLabel("Position *").fill("Executive Assistant");
    await registration.getByRole("button", { name: "Register candidate" }).click();
    await expect(page.getByRole("status")).toContainText("Candidate registered successfully.");
    expect(state.createdCandidate?.full_name).toBe("Taylor Morgan");
    expect(state.createdCandidate?.email).toBe("taylor.morgan@example.com");

    // Continue on a known record so the detail API endpoints are deterministic.
    await page.goto("/candidates/candidate-1");
    await expect(page.getByRole("heading", { name: "Jordan Lee" })).toBeVisible();
    await page.getByRole("button", { name: "Edit details" }).click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel("Full name *").fill("Jordan Lee Updated");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Jordan Lee Updated" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Candidate details saved successfully.");
    expect(state.candidate.full_name).toBe("Jordan Lee Updated");

    await page.getByLabel("Status").selectOption("selected");
    await expect(page.locator(".status-badge")).toContainText("Selected");
    await page.getByLabel("Stage").selectOption("technical_interview");
    await expect(page.getByText("Technical interview", { exact: true })).toBeVisible();
    expect(state.candidate.status).toBe("selected");
    expect(state.candidate.stage).toBe("technical_interview");

    await page.getByLabel("Add an internal note").fill("Strong communication in screening.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Strong communication in screening.")).toBeVisible();
    expect(state.notes).toHaveLength(1);
  });

  test("keeps registration open and explains API failures", async ({ page }) => {
    const state: ApiState = { candidate: candidateRecord(), notes: [], createFails: true };
    await mockApi(page, state);

    await page.goto("/");
    await page.getByRole("button", { name: /Register candidate/ }).click();
    const registration = page.getByRole("dialog");
    await registration.getByLabel("Full name *").fill("Casey Example");
    await registration.getByLabel("Email address *").fill("casey@example.com");
    await registration.getByLabel("Position *").fill("Executive Assistant");
    await registration.getByRole("button", { name: "Register candidate" }).click();

    await expect(registration.getByRole("alert")).toContainText("Registration is temporarily unavailable.");
    await expect(registration).toBeVisible();
  });
});
