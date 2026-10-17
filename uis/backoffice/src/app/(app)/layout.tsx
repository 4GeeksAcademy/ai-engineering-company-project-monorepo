"use client";

import type { ReactNode } from "react";
import RequireAuth from "@/auth/RequireAuth";
import Layout from "@/components/Layout";

// Layout guard for every route in the (app) group: /, /incidents, /suppliers and /account/profile.
// Client-side on purpose: the token is in localStorage, which Next.js middleware (server) can't read.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}
