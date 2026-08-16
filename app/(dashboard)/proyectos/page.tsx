import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getProjectTotals, getClients, getClientBalances, getClientProjectTotals } from "@/lib/queries-caja";
import { formatMXN, cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, PROJECT_KIND_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { projectColor } from "@/lib/project-colors";
import { ProjectForm } from "./project-form";
import { ClientForm } from "./client-form";

export const metadata: Metadata = { title: "Proyectos" };
export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const [projects, totals, clients, clientBalances, cpt] = await Promise.all([getProjects(), getProjectTotals(), getClients(), getClientBalances(), getClientProjectTotals()]);
  const colorOf = projectColor(projects);
  const tot = new Map(totals.map((t) => [t.project_id, t]));
  const obras = projects.filter((p) => p.kind === "obra");
  const otros = projects.filter((p) => p.kind !== "obra");
  const active = obras.filter((p) => p.status === "ejecucion");
  const totalSpent = active.reduce((s, p) => s + (tot.get(p.id)?.spent ?? 0), 0);
  const totalReceived = active.reduce((s, p) => s + (tot.get(p.id)?.received ?? 0), 0);

  const Tile = ({ p }: { p: (typeof projects)[number] }) => {
    const t = tot.get(p.id);
    const spent = t?.spent ?? 0, received = t?.received ?? 0;
    const budget = p.budget_total ?? 0, contract = p.contract_total ?? 0;
    const pctBudget = budget ? (spent / budget) * 100 : 0;
    const remainingInst = contract && p.installment_amount ? Math.max(0, Math.ceil((contract - received) / p.installment_amount)) : null;
    return (
      <Link href={`/proyectos/${p.id}`} className="block">
        <Card className="h-full px-5 py-4 transition-colors hover:bg-card-2/40">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-3 w-3 shrink-0 rounded" style={{ background: colorOf(p.id) }} />
              <div className="min-w-0">
                <div className="truncate text-[15.5px] font-semibold">{p.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {p.kind === "obra" ? PROJECT_STATUS_LABEL[p.status] : PROJECT_KIND_LABEL[p.kind]}
                  {p.client_name ? ` · ${p.client_name}` : ""}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold tabular">{formatMXN(spent)}</div>
              <div className="text-[11.5px] text-muted-foreground">gastado</div>
            </div>
          </div>
          {p.kind === "obra" && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[12px] text-muted-foreground">
                <div><div>Ministrado directo</div><div className="text-[13.5px] font-semibold text-foreground tabular">{received ? formatMXN(received) : "—"}</div></div>
                <div><div>{p.deduct_from_fee ? "Propio" : "Cliente"}</div><div className="truncate text-[13.5px] font-semibold text-foreground">{p.deduct_from_fee ? "se descuenta de mi pago" : clients.find((c) => c.id === p.client_id)?.name ?? "—"}</div></div>
                <div><div>Presupuesto</div><div className="text-[13.5px] font-semibold text-foreground tabular">{budget ? formatMXN(budget) : "—"}</div></div>
              </div>
              {budget > 0 && (
                <>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-card-2">
                    <div className={cn("h-full rounded-full", pctBudget > 100 ? "bg-danger" : pctBudget > 90 ? "bg-warning" : "bg-accent")} style={{ width: `${Math.min(pctBudget, 100)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11.5px] text-muted-foreground">
                    <span>{pctBudget.toFixed(0)} % del presupuesto</span>
                    {remainingInst !== null && <span>{remainingInst} ministraci{remainingInst === 1 ? "ón" : "ones"} por recibir</span>}
                  </div>
                </>
              )}
              {!budget && (
                <div className="mt-2 text-[11.5px] text-muted-foreground">Sin presupuesto · toca para capturarlo</div>
              )}
            </>
          )}
          {p.kind !== "obra" && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
              <div><div>Ingresos</div><div className="text-[13.5px] font-semibold text-positive tabular">{formatMXN((t?.sales ?? 0) + received)}</div></div>
              <div><div>Movimientos</div><div className="text-[13.5px] font-semibold text-foreground tabular">{t?.tx_count ?? 0}</div></div>
            </div>
          )}
        </Card>
      </Link>
    );
  };

  return (
    <>
      <PageHeader title="Proyectos" subtitle={`${active.length} obras en ejecución · gastado ${formatMXN(totalSpent)}${totalReceived ? ` de ${formatMXN(totalReceived)} recibidos` : ""}`}>
        <ClientForm clients={clients} />
        <ProjectForm clients={clients} />
      </PageHeader>

      {clients.length > 0 && (
        <>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Fondo de clientes</h2>
          <div className="mb-6 grid gap-3 lg:grid-cols-2">
            {clients.map((c) => {
              const b = clientBalances.find((x) => x.client_id === c.id);
              const received = b?.received ?? 0, applied = b?.applied ?? 0, pettyPending = b?.petty_pending ?? 0, noProj = b?.applied_no_project ?? 0, loansOut = b?.loans_out ?? 0, fees = b?.fees ?? 0;
              const available = received - applied - pettyPending - loansOut;
              const dist = cpt.filter((x) => x.client_id === c.id && x.applied > 0).map((x) => ({ ...x, project: projects.find((p) => p.id === x.project_id) })).sort((a, b2) => b2.applied - a.applied);
              return (
                <Card key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/clientes/${c.id}`} className="text-[16px] font-semibold hover:underline">{c.name} →</Link>
                      <div className="text-[12px] text-muted-foreground">{projects.filter((p) => p.client_id === c.id).length} obras · ministraciones entran aquí y se aplican por obra</div>
                    </div>
                    <ClientForm clients={clients} client={c} />
                  </div>
                  {(() => { const obras = applied - noProj - fees; const rowsS: [string, number, string?][] = [
                    ["Recibido (ministraciones)", received, "text-positive"],
                    ["− Aplicado a obras", -obras],
                    ...(noProj > 0 ? [["− Contratistas sin obra", -noProj] as [string, number]] : []),
                    ...(fees > 0 ? [["− Mi pago", -fees] as [string, number]] : []),
                    ...(pettyPending > 0 ? [["− Caja chica sin comprobar", -pettyPending] as [string, number]] : []),
                    ...(loansOut > 0 ? [["− Prestado por cobrar (autorizado)", -loansOut] as [string, number]] : []),
                  ]; return (
                    <ul className="mt-3 divide-y divide-border rounded-2xl bg-card-2 px-3">
                      {rowsS.map(([l, v, c]) => <li key={l} className="flex items-center justify-between py-1.5 text-[13.5px]"><span className="text-muted-foreground">{l}</span><span className={cn("font-medium tabular", c)}>{formatMXN(v)}</span></li>)}
                      <li className="flex items-center justify-between py-2 text-[14.5px] font-semibold"><span>= Saldo del fondo</span><span className={cn("tabular", available >= 0 ? "text-positive" : "text-danger")}>{formatMXN(available)}{available < 0 && <span className="ml-1 text-[11.5px] font-normal">(puesto de tu bolsa)</span>}</span></li>
                    </ul>
                  ); })()}
                  {received > 0 && (
                    <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-card-2">
                      {dist.map((d) => <span key={d.project_id} style={{ flex: d.applied, background: colorOf(d.project_id) }} title={`${d.project?.name}: ${formatMXN(d.applied)}`} />)}
                      {noProj > 0 && <span style={{ flex: noProj, background: "#8E8E93" }} title={`Sin obra: ${formatMXN(noProj)}`} />}
                      {loansOut > 0 && <span style={{ flex: loansOut, background: "#C7C7CC" }} title={`Prestado por cobrar: ${formatMXN(loansOut)}`} />}
                      {available > 0 && <span style={{ flex: available, background: "transparent" }} />}
                    </div>
                  )}
                  {(dist.length > 0 || noProj > 0 || loansOut > 0) && (
                    <ul className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      {dist.map((d) => (
                        <li key={d.project_id} className="flex items-center justify-between py-1 text-[13px]">
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(d.project_id) }} />{d.project?.name}</span>
                          <span className="font-semibold tabular">{formatMXN(d.applied)}<span className="ml-1 font-normal text-muted-foreground">{received ? `${((d.applied / received) * 100).toFixed(0)} %` : ""}</span></span>
                        </li>
                      ))}
                      {noProj > 0 && <li className="flex items-center justify-between py-1 text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#8E8E93]" />Sin obra (contratistas, etc.)</span><span className="font-semibold tabular">{formatMXN(noProj)}</span></li>}
                      {loansOut > 0 && <li className="flex items-center justify-between py-1 text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#C7C7CC]" />Prestado por cobrar (autorizado)</span><span className="font-semibold tabular">{formatMXN(loansOut)}</span></li>}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Obras</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {obras.filter((p) => p.status === "ejecucion").map((p) => <Tile key={p.id} p={p} />)}
      </div>
      {obras.some((p) => p.status !== "ejecucion") && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">En presupuesto, proyecto o terminadas</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {obras.filter((p) => p.status !== "ejecucion").map((p) => <Tile key={p.id} p={p} />)}
          </div>
        </>
      )}
      <h2 className="mt-6 mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Negocios y personal</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {otros.map((p) => <Tile key={p.id} p={p} />)}
      </div>
      {projects.length === 0 && (
        <Card><CardContent className="py-10 text-center text-[14px] text-muted-foreground">Aún no hay proyectos. Crea el primero con “Nuevo proyecto”.</CardContent></Card>
      )}
    </>
  );
}
