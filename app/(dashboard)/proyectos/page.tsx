import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getProjectTotals } from "@/lib/queries-caja";
import { formatMXN, cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, PROJECT_KIND_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { projectColor } from "@/lib/project-colors";
import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "Proyectos" };
export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const [projects, totals] = await Promise.all([getProjects(), getProjectTotals()]);
  const colorOf = projectColor(projects);
  const tot = new Map(totals.map((t) => [t.project_id, t]));
  const obras = projects.filter((p) => p.kind === "obra");
  const otros = projects.filter((p) => p.kind !== "obra");
  const active = obras.filter((p) => p.status === "ejecucion");
  const totalSpent = active.reduce((s, p) => s + (tot.get(p.id)?.spent ?? 0), 0);
  const totalReceived = active.reduce((s, p) => s + (tot.get(p.id)?.received ?? 0), 0);

  const Tile = ({ p }: { p: (typeof projects)[number] }) => {
    const t = tot.get(p.id);
    const spent = t?.spent ?? 0, received = t?.received ?? 0, petty = t?.petty_given ?? 0;
    const budget = p.budget_total ?? 0, contract = p.contract_total ?? 0;
    const pctBudget = budget ? (spent / budget) * 100 : 0;
    const remainingInst = contract && p.installment_amount ? Math.max(0, Math.ceil((contract - received) / p.installment_amount)) : null;
    const available = received - spent - petty;
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
                <div><div>Recibido</div><div className="text-[13.5px] font-semibold text-foreground tabular">{formatMXN(received)}</div></div>
                <div><div>{available >= 0 ? "Disponible" : "De mi bolsa"}</div><div className={cn("text-[13.5px] font-semibold tabular", available >= 0 ? "text-positive" : "text-danger")}>{formatMXN(Math.abs(available))}</div></div>
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
      <PageHeader title="Proyectos" subtitle={`${active.length} obras en ejecución · gastado ${formatMXN(totalSpent)} de ${formatMXN(totalReceived)} recibidos`}>
        <ProjectForm />
      </PageHeader>
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
