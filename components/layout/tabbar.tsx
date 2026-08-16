"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { NavIcon } from "./nav-icon";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { ThemeToggle } from "./theme-toggle";

// Mobile: Caja · Proyectos · (+) · Caja chica · Más
const MAIN = [NAV_ITEMS[0], NAV_ITEMS[1]];
const RIGHT = [NAV_ITEMS[3]];
const MORE = NAV_ITEMS.filter((_, i) => ![0, 1, 3].includes(i));

export function TabBar() {
  const pathname = usePathname();
  const { openNew } = useQuickAdd();
  const [more, setMore] = useState(false);
  const isMoreActive = MORE.some((i) => pathname.startsWith(i.href));
  const Tab = ({ item }: { item: (typeof NAV_ITEMS)[number] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        onClick={() => setMore(false)}
        className={cn("flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground", active && "text-accent")}
      >
        <NavIcon name={item.icon} className="h-6 w-6" />
        {item.short}
      </Link>
    );
  };
  return (
    <>
      {more && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMore(false)}>
          <div className="absolute inset-x-3 bottom-24 rounded-3xl bg-card p-3 shadow-2xl animate-in slide-in-from-bottom-3 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-4 gap-2">
              {MORE.map((i) => (
                <Link key={i.href} href={i.href} onClick={() => setMore(false)} className={cn("flex flex-col items-center gap-1 rounded-2xl bg-card-2 py-3 text-[11.5px] font-medium", pathname.startsWith(i.href) && "text-accent")}>
                  <NavIcon name={i.icon} className="h-6 w-6" />
                  {i.short}
                </Link>
              ))}
            </div>
            <div className="mt-3">
              <ThemeToggle />
            </div>
            <form action="/auth/signout" method="post" className="mt-2 text-center">
              <button className="text-[13px] font-medium text-accent">Cerrar sesión</button>
            </form>
          </div>
        </div>
      )}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-card/85 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-xl">
        {MAIN.map((i) => (
          <Tab key={i.href} item={i} />
        ))}
        <button
          aria-label="Registrar"
          onClick={() => openNew("expense")}
          className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_rgba(10,132,255,0.35)] active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" strokeWidth={2.2} />
        </button>
        {RIGHT.map((i) => (
          <Tab key={i.href} item={i} />
        ))}
        <button onClick={() => setMore((v) => !v)} className={cn("flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground", (more || isMoreActive) && "text-accent")}>
          <NavIcon name="more" className="h-6 w-6" />
          Más
        </button>
      </nav>
    </>
  );
}
