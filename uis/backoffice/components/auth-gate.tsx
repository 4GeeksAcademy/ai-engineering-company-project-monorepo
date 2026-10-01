"use client";

import { ReactNode, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

const publicPaths = new Set(["/login", "/register"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (!publicPaths.has(path) && !getToken()) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    queueMicrotask(() => setReady(true));
  }, [router]);

  if (!ready) return null;
  return children;
}
