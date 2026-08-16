"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { dayLabel } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import type { Category, MovementType } from "@/lib/types";
import type { AccountBalance, TransactionRow } from "@/lib/queries";
import { iconFor } from "@/lib/icons";

interface Props {
  transactions: TransactionRow[];
  categories: Category[];
  accounts: AccountBalance[];
  isCurrentMonth: boolean;
}

export function TransactionsList({ transactions, categories, accounts, isCurrentMonth }: Props) {
  const { openEdit, openNew } = useQuickAdd();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [acct, setAcct] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return transactions.filter((t) => {
      if (cat !== "all" && (t.category_id ?? "none") !== cat) return false;
      if (acct !== "all" && t.account_id !== acct) return false;
      if (needle) {
        const hay = `${t.note ?? ""} ${t.category?.name ?? ""} ${t.account?.name ?? ""} ${Math.abs(t.amount)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [transactions, q, cat, acct]);

  const groups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    filtered.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const filtering = q || cat !== "all" || acct !== "all";
  const filteredTotal = filtered.filter((t) => !t.transfer_account_id).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nota, categoría o monto"
            className="h-11 w-full rounded-xl bg-card pl-9 pr-3 text-[14px] shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/50"
          />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-11 rounded-xl bg-card px-3 text-[14px] shadow-card outline-none" aria-label="Categoría">
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
          <option value="none">Sin categoría</option>
        </select>
        <select value={acct} onChange={(e) => setAcct(e.target.value)} className="h-11 rounded-xl bg-card px-3 text-[14px] shadow-card outline-none" aria-label="Cuenta">
          <option value="all">Todas las cuentas</option>
          {accounts.map((a) => (
            <option key={a.account_id} value={a.account_id}>
              {a.name}
            </option>
          ))}
        </select>
        {filtering && (
          <span className="text-[13px] text-muted-foreground">
            {filtered.length} resultados · neto <b className={cn("text-foreground", filteredTotal < 0 && "text-danger")}>{formatMXN(filteredTotal)}</b>
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[15px] font-medium">{filtering ? "Nada coincide con el filtro" : "Sin movimientos este mes"}</p>
            {!filtering && isCurrentMonth && (
              <button onClick={() => openNew("expense")} className="mt-2 text-[14px] font-medium text-accent hover:underline">
                Registrar el primero →
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        groups.map(([date, rows]) => {
          const dayTotal = rows.filter((t) => !t.transfer_account_id && t.amount < 0).reduce((s, t) => s + t.amount, 0);
          return (
            <section key={date}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{dayLabel(date)}</h3>
                {dayTotal !== 0 && <span className="text-[12.5px] text-muted-foreground tabular">{formatMXN(dayTotal)}</span>}
              </div>
              <Card>
                <ul className="divide-y divide-border px-3">
                  {rows.map((t) => {
                    const isTransfer = !!t.transfer_account_id;
                    const positive = t.amount > 0;
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() =>
                            openEdit({
                              id: t.id,
                              amount: t.amount,
                              account_id: t.account_id,
                              category_id: t.category_id,
                              date: t.date,
                              note: t.note,
                              is_recurring: t.is_recurring,
                              project_id: t.project_id,
                              person_id: t.person_id,
                              person_name: t.person?.name ?? null,
                              movement_type: t.movement_type as MovementType,
                            })
                          }
                          className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 py-2.5 text-left transition-colors hover:bg-card-2/60 rounded-xl px-1 -mx-1"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-card-2 text-[17px]">
                            {isTransfer ? "⇄" : iconFor(t.note, t.movement_type, t.category?.icon)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14.5px] font-medium">{t.note || t.category?.name || (isTransfer ? "Transferencia" : "Movimiento")}</span>
                            <span className="block truncate text-[12.5px] text-muted-foreground">
                              {isTransfer ? "Transferencia" : t.category?.name ?? "Sin categoría"} · {t.account?.name ?? "—"}
                              {t.is_recurring ? " · recurrente" : ""}
                            </span>
                          </span>
                          <span className={cn("text-[14.5px] font-semibold tabular", positive && !isTransfer && "text-positive")}>
                            {positive && !isTransfer ? "+" : ""}
                            {formatMXN(t.amount)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
