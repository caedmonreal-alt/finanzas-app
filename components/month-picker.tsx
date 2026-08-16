"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, monthLabel, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** URL-driven month selector (?mes=YYYY-MM). Cannot go past the current month. */
export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = monthKey();
  const isCurrent = value >= current;

  function go(next: string) {
    const p = new URLSearchParams(params.toString());
    if (next === current) p.delete("mes");
    else p.set("mes", next);
    router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
  }

  return (
    <div className="flex items-center rounded-2xl bg-card p-1 shadow-card">
      <button aria-label="Mes anterior" onClick={() => go(shiftMonth(value, -1))} className="grid h-10 w-10 place-items-center rounded-xl text-accent hover:bg-card-2">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[132px] text-center text-[15px] font-semibold">{monthLabel(value)}</span>
      <button
        aria-label="Mes siguiente"
        onClick={() => go(shiftMonth(value, 1))}
        disabled={isCurrent}
        className={cn("grid h-10 w-10 place-items-center rounded-xl text-accent hover:bg-card-2", isCurrent && "opacity-30 hover:bg-transparent")}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
