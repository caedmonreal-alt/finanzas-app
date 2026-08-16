import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getClients, getClientBalances, getProjects, getProjectTotals, getClientLedger, getMonthlyClientReceived, getMonthlySpendForProjects, getPersonBalances, getPeople } from "@/lib/queries-caja";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementRow } from "@/components/caja/movement-row";
import { projectColor } from "@/lib/project-colors";
import { ClientForm } from "../../proyectos/client-form";
import { AssignProjects } from "./assign-projects";
import { PdfButton } from "@/components/reportes/pdf-button";

export const metadata: Metadata = { title: "Cliente" };
export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();
  const [clients, balances, projects, totals, people, personBalances] = await Promise.all([getClients(), getClientBalances(), getProjects(true), getProjectTotals(), getPeople(), getPersonBalances()]);
  const mine = projects.filter((p) => p.client_id === client.id && !p.is_archived);
  const [ledger, received, spend] = await Promise.all([getClientLedger(client.id, mine.map((p) => p.id)), getMonthlyClientReceived(client.id, 12), getMonthlySpendForProjects(mine.map((p) => p.id), 12)]);
  const colorOf = projectColor(projects);
  ledger.forEach((r) => { if (r.project && r.project_id) r.project.color = colorOf(r.project_id); });
  const b = balances.find((x) => x.client_id === client.id);
  const rec = b?.received ?? 0, applied = b?.applied ?? 0, petty = b?.petty_pending ?? 0, loans = b?.loans_out ?? 0, fees = b?.fees ?? 0, noProj = b?.applied_no_project ?? 0;
  const available = rec - applied - petty - loans;
  const tot = new Map(totals.map((t) => [t.project_id, t]));

  // monthly chart data
  const months = new Map<string, { received: number; spent: number }>();
  received.forEach((r) => months.set(r.month, { received: r.received, spent: 0 }));
  spend.forEach((r) => { const cur = months.get(r.month) ?? { received: 0, spent: 0 }; cur.spent += r.spent; months.set(r.month, cur); });
  const series = Array.from(months.entries()).sort(([a], [b2]) => (a < b2 ? -1 : 1)).slice(-12);
  const maxM = Math.max(1, ...series.map(([, v]) => Math.max(v.received, v.spent)));
  const ministraciones = ledger.filter((r) => r.movement_type === "ministracion");
  const clientLoans = personBalances.filter((pb) => pb.loan_client_outstanding > 0.005).map((pb) => ({ ...pb, person: people.find((p) => p.id === pb.person_id) }));

  return (
    <>
      <PageHeader title={client.name} subtitle={`${mine.length} obras · ${ministraciones.length} ministraciones`}>
        <Link href="/proyectos" className="text-[14px] font-medium text-accent hover:underline">← Proyectos</Link>
        <PdfButton href={`/api/reportes/cliente?id=${client.id}`} label="Estado de cuenta PDF" title={`Estado de cuenta ${client.name}`} back={`/clientes/${client.id}`} />
        <ClientForm clients={clients} client={client} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <K label="Recibido" value={formatMXN(rec)} foot={`${ministraciones.length} ministraciones`} />
        <K label="Aplicado a obras" value={formatMXN(applied - noProj - fees + petty)} foot={petty > 0 ? `incl. ${formatMXN(petty)} caja chica sin comprobar` : "gastos + comprobaciones"} />
        <K label="Contratistas sin obra" value={formatMXN(noProj)} foot="pagos sin obra asignada" />
        <K label="Mi pago" value={formatMXN(fees)} foot={rec ? `${((fees / rec) * 100).toFixed(0)} % de lo recibido` : ""} />
        <K label="Saldo del fondo" value={formatMXN(available)} foot={available >= 0 ? `recibido − aplicado − mi pago${loans > 0 ? ` − ${formatMXN(loans)} prestado` : ""}` : "negativo: puesto de tu bolsa"} cls={available >= 0 ? "text-positive" : "text-danger"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div><CardTitle>Obras de {client.name}</CardTitle><CardDescription>Aplicado a cada obra y avance contra presupuesto</CardDescription></div>
            </CardHeader>
            <CardContent>
              {mine.length === 0 ? <p className="py-4 text-[14px] text-muted-foreground">Sin obras asignadas todavía.</p> : (
                <ul className="divide-y divide-border">
                  {mine.map((p) => {
                    const t = tot.get(p.id); const spent = t?.spent ?? 0; const budget = p.budget_total ?? 0; const pct = budget ? (spent / budget) * 100 : 0;
                    return (
                      <li key={p.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/proyectos/${p.id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                            <span className="h-3 w-3 shrink-0 rounded" style={{ background: colorOf(p.id) }} />
                            <span className="truncate text-[14.5px] font-medium">{p.name}</span>
                            <span className="text-[12px] text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}</span>
                          </Link>
                          <span className="text-[14.5px] font-semibold tabular">{formatMXN(spent)}<span className="ml-1 text-[12px] font-normal text-muted-foreground">{rec ? `${((spent / rec) * 100).toFixed(0)} %` : ""}</span></span>
                        </div>
                        {budget > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-2"><div className={cn("h-full rounded-full", pct > 100 ? "bg-danger" : pct > 90 ? "bg-warning" : "bg-accent")} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                            <span className="text-[11.5px] text-muted-foreground tabular">{pct.toFixed(0)} % de {formatMXN(budget)}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <AssignProjects clientId={client.id} projects={projects.filter((p) => !p.is_archived && p.kind === "obra")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Movimientos del fondo</CardTitle><CardDescription>Ministraciones, gastos de sus obras, préstamos autorizados y mi pago</CardDescription></CardHeader>
            <CardContent>
              {ledger.length === 0 ? <p className="py-4 text-[14px] text-muted-foreground">Sin movimientos.</p> : ledger.slice(0, 150).map((r) => <MovementRow key={r.id} row={r} showDate />)}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recibido vs. aplicado</CardTitle><CardDescription>Últimos 12 meses</CardDescription></CardHeader>
            <CardContent>
              {series.length === 0 ? <p className="text-[14px] text-muted-foreground">Sin datos.</p> : (
                <div className="flex h-36 items-end gap-1.5">
                  {series.map(([m, v]) => (
                    <div key={m} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 110 }}>
                        <div className="w-2/5 rounded-t bg-positive/70" style={{ height: `${(v.received / maxM) * 100}%` }} title={`Recibido ${formatMXN(v.received)}`} />
                        <div className="w-2/5 rounded-t bg-accent" style={{ height: `${(v.spent / maxM) * 100}%` }} title={`Aplicado ${formatMXN(v.spent)}`} />
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">{new Date(m + "T12:00:00").toLocaleDateString("es-MX", { month: "short" }).replace(".", "")}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-3 text-[12px] text-muted-foreground"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-positive/70" />Recibido</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-accent" />Aplicado a obras</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ministraciones</CardTitle><CardDescription>{formatMXN(rec)} en total</CardDescription></CardHeader>
            <CardContent>
              {ministraciones.length === 0 ? <p className="text-[14px] text-muted-foreground">Ninguna registrada. Regístrala como Entrada → Ministración → {client.name}.</p> : (
                <ul className="divide-y divide-border">
                  {ministraciones.map((r) => <li key={r.id} className="flex items-center justify-between py-2 text-[14px]"><span>{formatDate(r.date)} <span className="text-muted-foreground">· {r.note ?? "Ministración"}</span></span><span className="font-semibold text-positive tabular">+{formatMXN(r.amount)}</span></li>)}
                </ul>
              )}
            </CardContent>
          </Card>
          {clientLoans.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Prestado por cobrar</CardTitle><CardDescription>Autorizado por {client.name}</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {clientLoans.map((l) => <li key={l.person_id} className="flex items-center justify-between py-2 text-[14px]"><span>{l.person?.name}</span><span className="font-semibold text-danger tabular">{formatMXN(l.loan_client_outstanding)}</span></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function K({ label, value, foot, cls }: { label: string; value: string; foot?: string; cls?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-[22px] font-bold leading-none tracking-tight tabular", cls)}>{value}</div>
      {foot && <div className="mt-2 text-[12px] text-muted-foreground">{foot}</div>}
    </Card>
  );
}
