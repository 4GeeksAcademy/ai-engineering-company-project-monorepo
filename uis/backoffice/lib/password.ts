import { AuthRequestError } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

interface ErrorPayload {
  detail?: string | ValidationIssue[];
  message?: string;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const response = await authenticatedFetch("/api/proxy/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as ErrorPayload;

  if (response.ok) return;

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(payload.detail)) {
    for (const issue of payload.detail) {
      const field = issue.loc?.at(-1);
      if (typeof field === "string" && issue.msg) {
        fieldErrors[field] = issue.msg.replace(/^Value error,\s*/i, "");
      }
    }
  }

  const message =
    typeof payload.detail === "string"
      ? payload.detail
      : payload.message ?? "Unable to change your password.";

  if (Object.keys(fieldErrors).length === 0) {
    fieldErrors.current_password = message;
  }
  throw new AuthRequestError(message, fieldErrors);
}