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
  const caja = NAV_ITEMS.filter((i) => !("section" in i));
  const personal = NAV_ITEMS.filter((i) => "section" in i);
  const Item = ({ item }: { item: (typeof NAV_ITEMS)[number] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium text-muted-foreground transition-colors hover:bg-card-2",
          active && "bg-accent-soft text-accent hover:bg-accent-soft"
        )}
      >
        <NavIcon name={item.icon} className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };
  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-[220px] flex-col gap-0.5 border-r border-border bg-background px-4 py-6 overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2.5 pb-4 text-[17px] font-bold">
        <div className="h-7 w-7 rounded-lg bg-accent text-white grid place-items-center text-sm">$</div>
        Finanzas
      </div>
      <nav className="flex flex-col gap-0.5">
        {caja.map((i) => (
          <Item key={i.href} item={i} />
        ))}
      </nav>
      <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Personal</div>
      <nav className="flex flex-col gap-0.5">
        {personal.map((i) => (
          <Item key={i.href} item={i} />
        ))}
      </nav>
      <div className="mt-3 px-1">
        <QuickAddButton className="w-full" label="Registrar" />
      </div>
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
