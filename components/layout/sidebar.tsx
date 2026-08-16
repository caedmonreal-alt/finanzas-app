"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { NavIcon } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-[220px] flex-col gap-1 border-r border-border bg-background px-4 py-7">
      <div className="flex items-center gap-2.5 px-2.5 pb-5 text-[17px] font-bold">
        <div className="h-7 w-7 rounded-lg bg-accent text-white grid place-items-center text-sm">$</div>
        Finanzas
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-card-2",
                active && "bg-accent-soft text-accent hover:bg-accent-soft"
              )}
            >
              <NavIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 px-1"><QuickAddButton className="w-full" /></div>
      <div className="flex-1" />
      <ThemeToggle />
      <form action="/auth/signout" method="post" className="mt-3 px-1.5">
        <p className="truncate text-[12px] text-muted-foreground" title={email}>
          {email}
        </p>
        <button className="mt-1 text-[13px] font-medium text-accent hover:underline">Cerrar sesión</button>
      </form>
    </aside>
  );
}
