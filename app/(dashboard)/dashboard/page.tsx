import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances, getMonthTotals, monthStart } from "@/lib/queries";
import { formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();

  const [balances, totals] = await Promise.all([getAccountBalances(), getMonthTotals(2)]);

  const now = new Date();
  const thisMonth = totals.find((t) => t.month === monthStart(now)) ?? { income: 0, expense: 0, net: 0 };
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = totals.find((t) => t.month === monthStart(prev));

  const netWorth = balances.reduce((s, b) => s + b.balance, 0);
  const liquid = balances.filter((b) => b.type === "cash" || b.type === "debit").reduce((s, b) => s + b.balance, 0);
  const invested = balances.filter((b) => b.type === "investment").reduce((s, b) => s + b.balance, 0);
  const debt = balances.filter((b) => b.type === "credit" || b.type === "debt").reduce((s, b) => s + b.balance, 0);
  const rate = thisMonth.income ? ((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100 : 0;

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
        <Button asChild>
          <Link href="/transacciones?nuevo=1">
            <span className="text-xl leading-none">+</span> Registrar gasto
          </Link>
        </Button>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          hero
          label="Patrimonio neto"
          value={formatMXN(netWorth)}
          foot={`Líquido ${formatMXN(liquid)} · Inversiones ${formatMXN(invested)} · Deudas ${formatMXN(debt)}`}
        />
        <KpiCard label="Ingresos del mes" value={formatMXN(thisMonth.income)} delta={delta(thisMonth.income, prevMonth?.income)} />
        <KpiCard label="Gastos del mes" value={formatMXN(thisMonth.expense)} delta={delta(thisMonth.expense, prevMonth?.expense, true)} />
        <KpiCard label="Tasa de ahorro" value={`${rate.toFixed(0)} %`} foot={<>Flujo neto <b className="text-foreground">{formatMXN(thisMonth.net)}</b></>} />
        <KpiCard label="Cuentas" value={String(balances.length)} foot="Activas" />
      </div>

      <p className="mt-8 text-[13px] text-muted-foreground">
        Iteración 1: base técnica. Las gráficas, presupuestos e insights del prototipo llegan en las iteraciones 2 y 3.
      </p>
    </>
  );
}
