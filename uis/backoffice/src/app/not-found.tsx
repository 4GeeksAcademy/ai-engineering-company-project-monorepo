"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Unknown URLs go to the home page, which is protected: without a session the guard then sends to /login.
export default function NotFound() {
  const router = useRouter();
  useEffect(() => router.replace("/"), [router]);
  return null;
}
