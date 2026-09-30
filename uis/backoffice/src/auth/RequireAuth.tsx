"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/token";
import { loginUrl } from "@/lib/returnTo";
import { useAuth } from "./AuthContext";

/**
 * Layout guard (used by app/(app)/layout.tsx): renders its children only for a logged-in user; everyone else
 * goes to /login?next=<this page>, which sends them back here afterwards. Client-side only: the token lives
 * in localStorage, which the server (and Next.js middleware) can't read. It is a UX gate, not the security
 * boundary: the API answers 401 to any call without a valid token.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status, loggedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Re-read on every navigation: the token may have been removed without going through clearToken()
  // (devtools, an extension). Read after mounting only: there is no localStorage on the server.
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(getToken() !== null);
  }, [pathname, status]);

  useEffect(() => {
    if (status === "authenticated" && hasToken === false) clearToken(); // the session state follows
  }, [status, hasToken]);

  useEffect(() => {
    if (status !== "anonymous") return;
    // After an explicit logout, whoever logs in next starts from the home page, not from this user's last view.
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.replace(loggedOut ? "/login" : loginUrl(here));
  }, [status, loggedOut, router]);

  if (status === "loading") {
    return <p className="p-10 text-sm text-slate-400">Comprobando la sesión…</p>;
  }
  // Anonymous (redirecting) or no token: never show a protected view, even for one frame.
  if (status !== "authenticated" || !hasToken) return null;
  return <>{children}</>;
}
