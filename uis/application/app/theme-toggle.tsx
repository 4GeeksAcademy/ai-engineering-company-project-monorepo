"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "brasaland-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    apply(next);
    setTheme(next);
  }, []);

  function apply(next: "light" | "dark") {
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    apply(next);
    setTheme(next);
  }

  return (
    <button type="button" className="theme-toggle" data-theme-toggle onClick={toggle} aria-label="Toggle light or dark mode">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
