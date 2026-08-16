"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, sectionFor } from "./nav-items";
import { NavIcon } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const current = sectionFor(pathname);
  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-[220px] flex-col gap-0.5 border-r border-border bg-background px-4 py-6 overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2.5 pb-4 text-[17px] font-bold">
        <div className="h-7 w-7 rounded-lg bg-accent text-white grid place-items-center text-sm">$</div>
        Finanzas
      </div>
      <div className="px-1 pb-3">
        <QuickAddButton className="w-full" label="Registrar" />
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_SECTIONS.map((s) => {
          const active = current === s.key;
          return (
            <div key={s.key}>
              <Link href={s.href} className={cn("flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold text-muted-foreground transition-colors hover:bg-card-2", active && "text-foreground")}>
                <NavIcon name={s.icon} className="h-5 w-5" />
                {s.label}
              </Link>
              {active && (
                <div className="ml-6 mb-1 flex flex-col gap-0.5 border-l border-border pl-3">
                  {s.items.map((i) => {
                    const on = pathname === i.href || pathname.startsWith(i.href + "/");
                    return (
                      <Link key={i.href} href={i.href} className={cn("rounded-lg px-2 py-1.5 text-[13.5px] text-muted-foreground hover:bg-card-2", on && "bg-accent-soft font-medium text-accent hover:bg-accent-soft")}>
                        {i.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex-1" />
      <ThemeToggle />
      <form action="/auth/signout" method="post" className="mt-3 px-1.5">
        <p className="truncate text-[12px] text-muted-foreground" title={email}>{email}</p>
        <button className="mt-1 text-[13px] font-medium text-accent hover:underline">Cerrar sesión</button>
      </form>
    </aside>
  );
}
