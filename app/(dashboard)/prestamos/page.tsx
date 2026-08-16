import type { Metadata } from "next";
import { getLoans, getPeople, getPersonBalances } from "@/lib/queries-caja";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementRow } from "@/components/caja/movement-row";
import { LoanButtons } from "./loan-buttons";

export const metadata: Metadata = { title: "Préstamos" };
export const dynamic = "force-dynamic";

export default async function PrestamosPage() {
  const [loans, people, balances] = await Promise.all([getLoans(), getPeople(), getPersonBalances()]);
  const outstanding = balances.filter((b) => Math.abs(b.loan_outstanding) > 0.005).map((b) => ({ ...b, person: people.find((p) => p.id === b.person_id) }));
  const total = outstanding.reduce((s, b) => s + b.loan_outstanding, 0);
  const given = loans.filter((l) => l.movement_type === "prestamo").reduce((s, l) => s - l.amount, 0);
  const paid = loans.filter((l) => l.movement_type === "cobro_prestamo").reduce((s, l) => s + l.amount, 0);

  return (
    <>
      <PageHeader title="Préstamos y encargos" subtitle="Dinero que sale de tu caja por cuenta de terceros; no es gasto de obra ni personal">
        <LoanButtons />
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="px-5 py-4"><div className="text-[13px] font-medium text-muted-foreground">Por cobrar</div><div className="mt-2 text-[28px] font-bold leading-none tabular text-danger">{formatMXN(total)}</div><div className="mt-2 text-[12.5px] text-muted-foreground">{outstanding.length} persona{outstanding.length === 1 ? "" : "s"}</div></Card>
        <Card className="px-5 py-4"><div className="text-[13px] font-medium text-muted-foreground">Prestado (histórico)</div><div className="mt-2 text-[28px] font-bold leading-none tabular">{formatMXN(given)}</div></Card>
        <Card className="px-5 py-4 col-span-2 lg:col-span-1"><div className="text-[13px] font-medium text-muted-foreground">Cobrado (histórico)</div><div className="mt-2 text-[28px] font-bold leading-none tabular text-positive">{formatMXN(paid)}</div></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <Card>
          <CardHeader><CardTitle>Saldos por persona</CardTitle><CardDescription>Prestado − cobrado</CardDescription></CardHeader>
          <CardContent>
            {outstanding.length === 0 ? <p className="py-4 text-[14px] text-muted-foreground">Nadie te debe.</p> : (
              <ul className="divide-y divide-border">
                {outstanding.map((b) => (
                  <li key={b.person_id} className="flex items-center justify-between py-2.5">
                    <div><div className="text-[14.5px] font-medium">{b.person?.name ?? "—"}</div><div className="text-[12px] text-muted-foreground">{b.last_date ? `último mov. ${formatDate(b.last_date)}` : ""}</div></div>
                    <span className={cn("rounded-md px-2 py-0.5 text-[14px] font-semibold tabular", b.loan_outstanding > 0 ? "bg-danger/10 text-danger" : "bg-positive/15 text-positive")}>{formatMXN(b.loan_outstanding)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Historial</CardTitle><CardDescription>Préstamos otorgados y cobros</CardDescription></CardHeader>
          <CardContent>
            {loans.length === 0 ? <p className="py-4 text-[14px] text-muted-foreground">Sin préstamos registrados. Usa “Prestar” arriba o el tipo “Préstamo otorgado” al registrar.</p> : loans.map((r) => <MovementRow key={r.id} row={r} showProject={false} showDate />)}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
