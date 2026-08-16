import type { Metadata } from "next";
import { getLoans, getPeople, getPersonBalances, getClients, getClientBalances } from "@/lib/queries-caja";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementRow } from "@/components/caja/movement-row";
import { LoanButtons } from "./loan-buttons";

export const metadata: Metadata = { title: "Préstamos" };
export const dynamic = "force-dynamic";

export default async function PrestamosPage() {
  const [loans, people, balances, clients, clientBalances] = await Promise.all([getLoans(), getPeople(), getPersonBalances(), getClients(), getClientBalances()]);
  const withPerson = balances.map((b) => ({ ...b, person: people.find((p) => p.id === b.person_id) }));
  const clientLoans = withPerson.filter((b) => Math.abs(b.loan_client_outstanding) > 0.005);
  const ownLoans = withPerson.filter((b) => Math.abs(b.loan_own_outstanding) > 0.005);
  const totalClient = clientLoans.reduce((s, b) => s + b.loan_client_outstanding, 0);
  const totalOwn = ownLoans.reduce((s, b) => s + b.loan_own_outstanding, 0);
  const historyClient = loans.filter((l) => l.client_id);
  const historyOwn = loans.filter((l) => !l.client_id);

  const Section = ({ title, desc, rows, total, history, field }: { title: string; desc: string; rows: typeof withPerson; total: number; history: typeof loans; field: "loan_client_outstanding" | "loan_own_outstanding" }) => (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-[15px] font-bold tabular", total > 0 ? "bg-danger/10 text-danger" : "bg-positive/15 text-positive")}>{formatMXN(total)}</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-2 text-[14px] text-muted-foreground">Nada por cobrar.</p> : (
          <ul className="divide-y divide-border">
            {rows.map((b) => (
              <li key={b.person_id} className="flex items-center justify-between py-2.5">
                <div><div className="text-[14.5px] font-medium">{b.person?.name ?? "—"}</div><div className="text-[12px] text-muted-foreground">{b.last_date ? `último mov. ${formatDate(b.last_date)}` : ""}</div></div>
                <span className={cn("rounded-md px-2 py-0.5 text-[14px] font-semibold tabular", b[field] > 0 ? "bg-danger/10 text-danger" : "bg-positive/15 text-positive")}>{formatMXN(b[field])}</span>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <>
            <h3 className="mt-4 mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Historial</h3>
            {history.map((r) => <MovementRow key={r.id} row={r} showProject={false} showDate />)}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="Préstamos y encargos" subtitle="Dinero que sale de tu caja y te tienen que regresar">
        <LoanButtons />
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Section
          title={`Autorizados por ${clients.map((c) => c.name).join(" / ") || "el cliente"}`}
          desc="Salen del fondo del cliente; bajan su disponible y se muestran como “prestado por cobrar”. Al cobrarlos regresan al fondo."
          rows={clientLoans}
          total={totalClient}
          history={historyClient}
          field="loan_client_outstanding"
        />
        <Section
          title="Propios a trabajadores y contratistas"
          desc="Salen de tu caja; no tocan el fondo del cliente. Se llevan por persona."
          rows={ownLoans}
          total={totalOwn}
          history={historyOwn}
          field="loan_own_outstanding"
        />
      </div>
      {clientBalances.some((b) => b.loans_out > 0) && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {clients.map((c) => { const b = clientBalances.find((x) => x.client_id === c.id); return b && b.loans_out > 0 ? `${c.name}: ${formatMXN(b.loans_out)} prestado por cobrar dentro de su fondo` : null; }).filter(Boolean).join(" · ")}
        </p>
      )}
    </>
  );
}
