"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionCheck } from "@/components/SessionCheck";
import { clearToken, getToken, LOGIN_PATH } from "@/lib/auth";
import { abandonOpenForms, hasUnsavedForm } from "@/lib/formTelemetry";
import { currentRoute } from "@/lib/errorTelemetry";
import { track } from "@/lib/telemetry";
import { useSession } from "@/lib/useSession";

/**
 * Client-side route guard: renders its children only with a present, unexpired token.
 * Without one (or once it is cleared, e.g. after a 401 or a logout in another tab) it goes to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const status = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "anonymous") return;
    if (getToken()) {
      // A token was there but is no longer valid: the session expired on this page.
      track("session_expired", { route_template: currentRoute(), had_unsaved_form: hasUnsavedForm() });
      abandonOpenForms("session_expired");
      clearToken(); // expired or malformed
    }
    router.replace(LOGIN_PATH);
  }, [status, router]);

  return status === "authenticated" ? children : <SessionCheck />;
}
