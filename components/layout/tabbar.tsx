"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { NavIcon } from "./nav-icon";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

// Mobile tab bar: 4 tabs + a central "+" that opens quick add.
const LEFT = NAV_ITEMS.slice(0, 2);
const RIGHT = [NAV_ITEMS[2], NAV_ITEMS[4]];

export function TabBar() {
  const pathname = usePathname();
  const { openNew } = useQuickAdd();
  const Tab = ({ item }: { item: (typeof NAV_ITEMS)[number] }) => {
    const active = pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        className={cn("flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground", active && "text-accent")}
      >
        <NavIcon name={item.icon} className="h-6 w-6" />
        {item.short}
      </Link>
    );
  };
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-card/85 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-xl">
      {LEFT.map((i) => (
        <Tab key={i.href} item={i} />
      ))}
      <button
        aria-label="Registrar gasto"
        onClick={() => openNew("expense")}
        className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_rgba(10,132,255,0.35)] active:scale-95 transition-transform"
      >
        <Plus className="h-7 w-7" strokeWidth={2.2} />
      </button>
      {RIGHT.map((i) => (
        <Tab key={i.href} item={i} />
      ))}
    </nav>
  );
}
