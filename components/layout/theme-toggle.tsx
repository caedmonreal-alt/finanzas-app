"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "auto" | "light" | "dark";
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

/** Auto / Claro / Oscuro. Persists in a cookie so SSR renders the right theme without flashing. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme | null) ?? "auto";
    setTheme(current);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    if (next === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <div className="flex gap-1.5 px-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => apply(o.value)}
          className={cn(
            "flex-1 rounded-[10px] bg-card-2 py-2 text-[13px] text-muted-foreground transition-colors",
            theme === o.value && "bg-card text-foreground shadow-card"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
