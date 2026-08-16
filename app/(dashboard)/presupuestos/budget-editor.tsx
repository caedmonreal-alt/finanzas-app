"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBudget, copyBudgetsFromPreviousMonth } from "@/lib/actions/budgets";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatMXN } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  icon: string | null;
  budget: number;
  spent: number;
}

export function BudgetEditor({ monthKey, rows, elapsed }: { monthKey: string; rows: Row[]; elapsed: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const hasAny = rows.some((r) => r.budget > 0);

  function commit(id: string) {
    const raw = drafts[id];
    if (raw === undefined) return;
    const value = Number(raw.replace(/[^0-9.]/g, "")) || 0;
    const row = rows.find((r) => r.id === id);
    if (row && value === row.budget) return;
    start(async () => {
      const res = await setBudget(id, monthKey, value);
      if (res.error) setNotice(res.error);
      setDrafts((d) => {
        const n = { ...d };
        delete n[id];
        return n;
      });
      router.refresh();
    });
  }

  function copyPrev() {
    start(async () => {
      const res = await copyBudgetsFromPreviousMonth(monthKey);
      setNotice(res.error ? res.error : res.copied ? `Se copiaron ${res.copied} presupuestos del mes anterior.` : "El mes anterior no tenía presupuestos nuevos que copiar.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Por categoría</CardTitle>
          <CardDescription>Escribe el límite mensual; la barra muestra lo gastado.</CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={copyPrev} disabled={pending}>
          Copiar mes anterior
        </Button>
      </CardHeader>
      <CardContent>
        {notice && <p className="mb-3 text-[13px] text-muted-foreground">{notice}</p>}
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const pct = r.budget ? (r.spent / r.budget) * 100 : 0;
            const tone = !r.budget ? "" : pct > 100 ? "bg-danger" : pct > elapsed * 100 + 15 ? "bg-warning" : "bg-accent";
            const value = drafts[r.id] ?? (r.budget ? String(r.budget) : "");
            return (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14.5px] font-medium">
                    {r.icon && <span className="mr-1.5">{r.icon}</span>}
                    {r.name}
                  </div>
                  <div className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                    <span className={cn("tabular", pct > 100 && "text-danger font-semibold")}>{formatMXN(r.spent)}</span>
                    <span>/</span>
                    <label className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        inputMode="numeric"
                        value={value}
                        placeholder="—"
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        onBlur={() => commit(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="h-9 w-[104px] rounded-lg bg-card-2 pl-6 pr-2 text-right text-[14px] font-semibold text-foreground tabular outline-none focus:ring-2 focus:ring-accent/50"
                        aria-label={`Presupuesto de ${r.name}`}
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2">
                  <div className={cn("h-full rounded-full transition-[width] duration-300", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        {!hasAny && (
          <p className="mt-4 text-[13px] text-muted-foreground">
            Consejo: empieza con 4 o 5 categorías donde más gastas. El tablero avisará cuando vayas adelantado respecto al mes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
