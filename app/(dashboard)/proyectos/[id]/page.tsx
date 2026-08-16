import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjectTotals, getProjectLedger, getProofs, getMonthlyProjectTotals, getProjects } from "@/lib/queries-caja";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, PROJECT_KIND_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementRow } from "@/components/caja/movement-row";
import { projectColor } from "@/lib/project-colors";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Proyecto" };
export const dynamic = "force-dynamic";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const [totals, ledger, proofs, monthly, projects] = await Promise.all([getProjectTotals(), getProjectLedger(project.id), getProofs({ projectId: project.id }), getMonthlyProjectTotals(project.id, 6), getProjects()]);
  const color = projectColor(projects)(project.id);
  ledger.forEach((r) => { if (r.project) r.project.color = color; });
  const t = totals.find((x) => x.project_id === project.id);
  const spent = t?.spent ?? 0, received = t?.received ?? 0, petty = t?.petty_given ?? 0, sales = t?.sales ?? 0;
  const proved = proofs.reduce((s, p) => s + p.amount, 0);
  const budget = project.budget_total ?? 0, contract = project.contract_total ?? 0;
  const pctBudget = budget ? (spent / budget) * 100 : 0;
  const pctContract = contract ? (received / contract) * 100 : 0;
  const remainingInst = contract && project.installment_amount ? Math.max(0, Math.ceil((contract - received) / project.installment_amount)) : null;
  const available = received - spent - petty;
  const maxMonth = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense)));

  // spend breakdown by concept (top notes)
  const byConcept = new Map<string, number>();
  ledger.filter((r) => r.amount < 0 && ["gasto", "pago"].includes(r.movement_type)).forEach((r) => {
    const k = (r.note || "Sin concepto").trim();
    byConcept.set(k, (byConcept.get(k) ?? 0) - r.amount);
  });
  proofs.forEach((p) => { const k = (p.note || "Comprobación caja chica").trim(); byConcept.set(k, (byConcept.get(k) ?? 0) + p.amount); });
  const topConcepts = Array.from(byConcept.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.kind === "obra" ? PROJECT_STATUS_LABEL[project.status] : PROJECT_KIND_LABEL[project.kind]}${project.client_name ? ` · ${project.client_name}` : ""}`}
      >
        <Link href="/proyectos" className="text-[14px] font-medium text-accent hover:underline">← Proyectos</Link>
        <ProjectForm project={project} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <K label="Gastado" value={formatMXN(spent)} foot={`directo ${formatMXN(spent - proved)} · comprobado ${formatMXN(proved)}`} />
        {project.kind === "obra" ? (
          <>
            <K label="Recibido del cliente" value={formatMXN(received)} foot={contract ? `${pctContract.toFixed(0)} % de ${formatMXN(contract)}` : "Sin monto contratado"} />
            <K label={available >= 0 ? "Disponible" : "Puesto de mi bolsa"} value={formatMXN(Math.abs(available))} foot={`recibido − gastado − caja chica sin comprobar (${formatMXN(petty - proved)})`} cls={available >= 0 ? "text-positive" : "text-danger"} />
            <K label="Ministraciones por recibir" value={remainingInst === null ? "—" : String(remainingInst)} foot={project.installment_amount ? `de ${formatMXN(project.installment_amount)} · faltan ${formatMXN(Math.max(0, contract - received))}` : "Captura monto contratado y ministración típica"} />
          </>
        ) : (
          <>
            <K label="Ingresos" value={formatMXN(sales + received)} />
            <K label="Neto" value={formatMXN(sales + received - spent)} cls={sales + received - spent >= 0 ? "text-positive" : "text-danger"} />
            <K label="Movimientos" value={String(t?.tx_count ?? 0)} foot={t?.last_date ? `último ${formatDate(t.last_date)}` : ""} />
          </>
        )}
      </div>

      {project.kind === "obra" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Avance financiero</CardTitle>
            <CardDescription>{budget ? `${pctBudget.toFixed(0)} % del presupuesto ejercido` : "Captura el presupuesto de obra en “Editar” para ver el avance"}</CardDescription>
          </CardHeader>
          <CardContent>
            {budget > 0 && (
              <div className="space-y-3">
                <Bar label="Gastado vs. presupuesto" value={spent} total={budget} tone={pctBudget > 100 ? "bg-danger" : pctBudget > 90 ? "bg-warning" : "bg-accent"} />
                {contract > 0 && <Bar label="Recibido vs. contratado" value={received} total={contract} tone="bg-positive" />}
                <p className="text-[13px] text-muted-foreground">
                  {spent <= budget ? `Vas ${formatMXN(budget - spent)} por debajo del presupuesto.` : `Vas ${formatMXN(spent - budget)} por encima del presupuesto.`}
                  {contract > 0 && received < contract && ` Te faltan ${formatMXN(contract - received)} por cobrar${remainingInst !== null ? ` (≈ ${remainingInst} ministraciones)` : ""}.`}
                  {contract > 0 && spent > 0 && ` Margen actual: ${formatMXN(contract - spent)} (${(((contract - spent) / contract) * 100).toFixed(0)} % del contrato).`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <CardHeader><CardTitle>Movimientos</CardTitle><CardDescription>{ledger.length} registrados</CardDescription></CardHeader>
          <CardContent>
            {ledger.length === 0 ? <p className="py-6 text-center text-[14px] text-muted-foreground">Sin movimientos todavía.</p> : ledger.map((r) => <MovementRow key={r.id} row={r} showProject={false} showDate />)}
            {proofs.length > 0 && (
              <>
                <h3 className="mt-5 mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Comprobaciones de caja chica</h3>
                <ul className="divide-y divide-border">
                  {proofs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 text-[14px]">
                      <span>{p.note || "Comprobación"} <span className="text-muted-foreground">· {p.person?.name} · {formatDate(p.date)}</span></span>
                      <span className="font-semibold tabular">{formatMXN(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Últimos 6 meses</CardTitle><CardDescription>Entradas y salidas</CardDescription></CardHeader>
            <CardContent>
              {monthly.length === 0 ? <p className="text-[14px] text-muted-foreground">Sin datos.</p> : (
                <div className="flex h-32 items-end gap-2">
                  {monthly.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 100 }}>
                        <div className="w-2/5 rounded-t bg-positive/70" style={{ height: `${(m.income / maxMonth) * 100}%` }} title={`Entradas ${formatMXN(m.income)}`} />
                        <div className="w-2/5 rounded-t bg-accent" style={{ height: `${(m.expense / maxMonth) * 100}%` }} title={`Salidas ${formatMXN(m.expense)}`} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{new Date(m.month + "T12:00:00").toLocaleDateString("es-MX", { month: "short" }).replace(".", "")}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-3 text-[12px] text-muted-foreground"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-positive/70" />Entradas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-accent" />Salidas</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Mayores conceptos</CardTitle></CardHeader>
            <CardContent>
              {topConcepts.length === 0 ? <p className="text-[14px] text-muted-foreground">—</p> : (
                <ul className="divide-y divide-border">
                  {topConcepts.map(([name, v]) => (
                    <li key={name} className="flex items-center justify-between py-2 text-[14px]"><span className="truncate pr-3">{name}</span><span className="font-semibold tabular">{formatMXN(v)}</span></li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function K({ label, value, foot, cls }: { label: string; value: string; foot?: string; cls?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-[26px] font-bold leading-none tracking-tight tabular", cls)}>{value}</div>
      {foot && <div className="mt-2 text-[12px] text-muted-foreground">{foot}</div>}
    </Card>
  );
}
function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[13.5px]"><span className="font-medium">{label}</span><span className="text-muted-foreground"><b className="text-foreground tabular">{formatMXN(value)}</b> / {formatMXN(total)} · {pct.toFixed(0)} %</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-card-2"><div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
    </div>
  );
}
