"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/telemetry";

/** Sends `page_viewed` on every route change of the protected area. Renders nothing. */
export function PageViewTracker() {
  const pathname = usePathname();
  const previous = useRef<string | undefined>(undefined);
  const backForward = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      backForward.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const language = document.documentElement.lang;
    track("page_viewed", {
      route_template: pathname, // the path only: never the query string or the hash
      previous_route: previous.current,
      entry_type: previous.current === undefined ? "initial_load" : backForward.current ? "back_forward" : "client_navigation",
      ui_language: language === "es" || language === "en" ? language : undefined,
    });
    previous.current = pathname;
    backForward.current = false;
  }, [pathname]);

  return null;
}
