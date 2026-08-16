import type { Metadata } from "next";
import { getCashBalanceAt, getCashCounts, getMissingUsualConcepts } from "@/lib/queries-caja";
import { getAccountBalances } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CashCountForm } from "./cash-count-form";

export const metadata: Metadata = { title: "Arqueo" };
export const dynamic = "force-dynamic";

export default async function ArqueoPage() {
  const [expected, counts, accounts, hints] = await Promise.all([getCashBalanceAt(todayISO()), getCashCounts(24), getAccountBalances(), getMissingUsualConcepts()]);
  const cash = accounts.filter((a) => a.type === "cash");
  return (
    <>
      <PageHeader title="¿Cuadra la caja?" subtitle="Cuenta el efectivo y compáralo con lo que debería haber. Hazlo cada fin de semana." />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <Card>
          <CardHeader><CardTitle>Nuevo arqueo</CardTitle><CardDescription>Saldo teórico hoy: <b className="text-foreground">{formatMXN(expected)}</b></CardDescription></CardHeader>
          <CardContent>
            <CashCountForm expected={expected} cashAccounts={cash.map((a) => ({ id: a.account_id, name: a.name, balance: a.balance }))} hints={hints} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Arqueos anteriores</CardTitle></CardHeader>
          <CardContent>
            {counts.length === 0 ? <p className="py-4 text-[14px] text-muted-foreground">Todavía no registras arqueos.</p> : (
              <ul className="divide-y divide-border">
                {counts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div><div className="text-[14.5px] font-medium">{formatDate(c.date)}</div><div className="text-[12px] text-muted-foreground">Teórico {formatMXN(c.expected)} · contado {formatMXN(c.counted)}{c.note ? ` · ${c.note}` : ""}</div></div>
                    <span className={cn("rounded-md px-2 py-0.5 text-[13px] font-semibold tabular", c.difference === 0 ? "bg-positive/15 text-positive" : c.difference < 0 ? "bg-danger/10 text-danger" : "bg-warning/15 text-warning")}>{c.difference === 0 ? "Cuadró" : (c.difference > 0 ? "+" : "") + formatMXN(c.difference)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
