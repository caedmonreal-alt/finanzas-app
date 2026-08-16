"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, sectionFor } from "./nav-items";

/** Sub-navigation of the current section (mobile only; desktop sidebar already shows it). */
export function SectionTabs() {
  const pathname = usePathname();
  const key = sectionFor(pathname);
  const section = NAV_SECTIONS.find((s) => s.key === key);
  if (!section || section.items.length < 2) return null;
  return (
    <div className="lg:hidden -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      {section.items.map((i) => {
        const on = pathname === i.href || pathname.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} className={cn("whitespace-nowrap rounded-xl bg-card px-3 py-2 text-[13px] font-medium text-muted-foreground shadow-card", on && "bg-accent text-white")}>
            {i.label}
          </Link>
        );
      })}
    </div>
  );
}
