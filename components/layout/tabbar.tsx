"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { NavIcon } from "./nav-icon";

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card/85 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-xl">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground",
              active && "text-accent"
            )}
          >
            <NavIcon name={item.icon} className="h-6 w-6" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
