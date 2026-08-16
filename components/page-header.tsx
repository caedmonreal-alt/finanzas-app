import Link from "next/link";
import { Search } from "lucide-react";
import { RefreshButton } from "@/components/refresh-button";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-6 lg:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-[24px] font-bold tracking-tight sm:text-[26px] lg:text-[30px]">{title}</h1>
          <RefreshButton />
          <Link href="/buscar" aria-label="Buscar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-card-2 lg:hidden"><Search className="h-4 w-4" strokeWidth={1.8} /></Link>
        </div>
        {subtitle && <p className="mt-0.5 text-[13.5px] text-muted-foreground lg:text-[15px]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
