"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authenticatedFetch,
  AuthenticationRequiredError,
} from "@/lib/authenticated-fetch";

type AuthStatus = "checking" | "authenticated" | "unavailable";

interface AuthState {
  pathname: string;
  status: AuthStatus;
}

export function useAuthGuard(pathname: string, isPublicRoute: boolean) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AuthState>({
    pathname,
    status: isPublicRoute ? "authenticated" : "checking",
  });

  useEffect(() => {
    if (isPublicRoute) {
      setState({ pathname, status: "authenticated" });
      return;
    }

    const controller = new AbortController();
    setState({ pathname, status: "checking" });

    authenticatedFetch("/api/proxy/auth/me", {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          setState({ pathname, status: "authenticated" });
          return;
        }

        if (response.status === 403) {
          router.replace("/login");
          return;
        }

        setState({ pathname, status: "unavailable" });
      })
      .catch((error: unknown) => {
        if (error instanceof AuthenticationRequiredError) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ pathname, status: "unavailable" });
      });

    return () => controller.abort();
  }, [attempt, isPublicRoute, pathname, router]);

  const status =
    state.pathname === pathname ? state.status : ("checking" as const);

  return {
    status,
    retry: () => setAttempt((currentAttempt) => currentAttempt + 1),
  };
}