"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, sectionFor } from "./nav-items";
import { NavIcon } from "./nav-icon";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

// Mobile: Caja · Clientes · (+) · Personas · Yo
export function TabBar() {
  const pathname = usePathname();
  const { openNew } = useQuickAdd();
  const current = sectionFor(pathname);
  const Tab = ({ s }: { s: (typeof NAV_SECTIONS)[number] }) => (
    <Link href={s.href} className={cn("flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground", current === s.key && "text-accent")}>
      <NavIcon name={s.icon} className="h-6 w-6" />
      {s.label === "Clientes y obras" ? "Clientes" : s.label}
    </Link>
  );
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-card/85 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-xl">
      <Tab s={NAV_SECTIONS[0]} />
      <Tab s={NAV_SECTIONS[1]} />
      <button aria-label="Registrar" onClick={() => openNew("expense")} className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_rgba(10,132,255,0.35)] active:scale-95 transition-transform">
        <Plus className="h-7 w-7" strokeWidth={2.2} />
      </button>
      <Tab s={NAV_SECTIONS[2]} />
      <Tab s={NAV_SECTIONS[3]} />
    </nav>
  );
}
