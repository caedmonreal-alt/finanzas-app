import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances, getMonthTotals, monthStart, getTransactionsForMonth, getBudgetsForMonth, getCategoryTotalsForMonth, getCategories } from "@/lib/queries";
import { monthKey, monthRange, todayISO } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { RecentTransactions } from "./recent-transactions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();

  const key = monthKey();
  const [balances, totals, txs, budgets, catTotals, categories] = await Promise.all([
    getAccountBalances(),
    getMonthTotals(2),
    getTransactionsForMonth(key),
    getBudgetsForMonth(key),
    getCategoryTotalsForMonth(key),
    getCategories(),
  ]);

  const now = new Date();
  const thisMonth = totals.find((t) => t.month === monthStart(now)) ?? { income: 0, expense: 0, net: 0 };
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = totals.find((t) => t.month === monthStart(prev));

  const netWorth = balances.reduce((s, b) => s + b.balance, 0);
  const liquid = balances.filter((b) => b.type === "cash" || b.type === "debit").reduce((s, b) => s + b.balance, 0);
  const invested = balances.filter((b) => b.type === "investment").reduce((s, b) => s + b.balance, 0);
  const debt = balances.filter((b) => b.type === "credit" || b.type === "debt").reduce((s, b) => s + b.balance, 0);
  const rate = thisMonth.income ? ((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100 : 0;
  const { daysInMonth } = monthRange(key);
  const dayOfMonth = Number(todayISO().slice(-2));
  const dailyAvg = thisMonth.expense / dayOfMonth;
  const elapsed = dayOfMonth / daysInMonth;

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const spentBy = new Map(catTotals.filter((t) => t.kind === "expense").map((t) => [t.category_id, t.total]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const budgetRows = budgets
    .map((b) => ({ ...b, cat: catById.get(b.category_id), spent: spentBy.get(b.category_id) ?? 0 }))
    .filter((b) => b.cat)
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount)
    .slice(0, 6);

  const delta = (a: number, b: number | undefined, invert = false) => {
    if (!b) return undefined;
    const p = ((a - b) / Math.abs(b)) * 100;
    const good = invert ? p <= 0 : p >= 0;
    return { text: `${p >= 0 ? "+" : ""}${p.toFixed(0)} % vs. mes anterior`, tone: Math.abs(p) < 0.5 ? "flat" : good ? "up" : "down" } as const;
  };

  const today = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const name = profile?.display_name ?? "";
  const empty = balances.length === 0;

  return (
    <>
      <PageHeader title={`Hola${name ? `, ${name}` : ""}`} subtitle={today.charAt(0).toUpperCase() + today.slice(1)}>
        <QuickAddButton />
      </PageHeader>

      {empty && (
        <Card className="mb-4">
          <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold">Empecemos por tus cuentas</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">
                Agrega tu efectivo, tarjetas e inversiones con su saldo actual. A partir de ahí, cada gasto que registres actualiza el tablero.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/cuentas">Agregar cuentas →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          hero
          label="Patrimonio neto"
          value={formatMXN(netWorth)}
          foot={`Líquido ${formatMXN(liquid)} · Inversiones ${formatMXN(invested)} · Deudas ${formatMXN(debt)}`}
        />
        <KpiCard label="Ingresos del mes" value={formatMXN(thisMonth.income)} delta={delta(thisMonth.income, prevMonth?.income)} />
        <KpiCard
          label="Gastos del mes"
          value={formatMXN(thisMonth.expense)}
          delta={delta(thisMonth.expense, prevMonth?.expense, true)}
          foot={`${formatMXN(dailyAvg)} diarios en promedio`}
        />
        <KpiCard label="Tasa de ahorro" value={`${rate.toFixed(0)} %`} foot={<>Flujo neto <b className="text-foreground">{formatMXN(thisMonth.net)}</b></>} />
        <KpiCard
          label="Avance de presupuesto"
          value={totalBudget ? `${((thisMonth.expense / totalBudget) * 100).toFixed(0)} %` : "—"}
          foot={
            totalBudget ? (
              <>
                {formatMXN(thisMonth.expense)} de {formatMXN(totalBudget)} · {(elapsed * 100).toFixed(0)} % del mes
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2">
                  <div className={cn("h-full rounded-full", thisMonth.expense > totalBudget ? "bg-danger" : "bg-accent")} style={{ width: `${Math.min((thisMonth.expense / totalBudget) * 100, 100)}%` }} />
                </div>
              </>
            ) : (
              <Link href="/presupuestos" className="text-accent hover:underline">Definir presupuestos →</Link>
            )
          }
        />
        <KpiCard label="Movimientos del mes" value={String(txs.length)} foot={`${balances.length} cuentas activas`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos movimientos</CardTitle>
            <Link href="/transacciones" className="text-[13px] font-medium text-accent hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={txs.slice(0, 8)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos</CardTitle>
            <Link href="/presupuestos" className="text-[13px] font-medium text-accent hover:underline">Editar</Link>
          </CardHeader>
          <CardContent>
            {budgetRows.length === 0 ? (
              <p className="py-4 text-[14px] text-muted-foreground">Aún no defines presupuestos para este mes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {budgetRows.map((b) => {
                  const pct = (b.spent / b.amount) * 100;
                  const tone = pct > 100 ? "bg-danger" : pct > elapsed * 100 + 15 ? "bg-warning" : "bg-accent";
                  return (
                    <li key={b.id} className="py-2.5">
                      <div className="flex justify-between text-[14px]">
                        <span className="font-medium">{b.cat!.icon} {b.cat!.name}</span>
                        <span className="text-muted-foreground"><b className={cn("text-foreground", pct > 100 && "text-danger")}>{formatMXN(b.spent)}</b> / {formatMXN(b.amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-2">
                        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-[12.5px] text-muted-foreground">Gráficas, análisis por categoría e insights automáticos llegan en la Iteración 3.</p>
    </>
  );
}
