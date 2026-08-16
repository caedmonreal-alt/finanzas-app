"use client";

import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { dayLabel } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import type { TransactionRow } from "@/lib/queries";

export function RecentTransactions({ transactions }: { transactions: TransactionRow[] }) {
  const { openEdit, openNew } = useQuickAdd();
  if (transactions.length === 0) {
    return (
      <p className="py-4 text-[14px] text-muted-foreground">
        Sin movimientos este mes.{" "}
        <button onClick={() => openNew("expense")} className="font-medium text-accent hover:underline">
          Registrar el primero →
        </button>
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {transactions.map((t) => {
        const positive = t.amount > 0;
        return (
          <li key={t.id}>
            <button
              onClick={() => openEdit({ id: t.id, amount: t.amount, account_id: t.account_id, category_id: t.category_id, date: t.date, note: t.note, is_recurring: t.is_recurring })}
              className="-mx-1 grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-card-2/60"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-card-2 text-[15px]">{t.category?.icon ?? (positive ? "＋" : "•")}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">{t.note || t.category?.name || "Movimiento"}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{t.category?.name ?? "Sin categoría"} · {t.account?.name ?? "—"} · {dayLabel(t.date)}</span>
              </span>
              <span className={cn("text-[14px] font-semibold tabular", positive && "text-positive")}>{positive ? "+" : ""}{formatMXN(t.amount)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
