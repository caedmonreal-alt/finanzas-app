import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { getProjects, getYearProjectSpend, getClientBalances, getClients } from "@/lib/queries-caja";
import { formatMXN, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { projectColor } from "@/lib/project-colors";

export const metadata: Metadata = { title: "Resumen anual" };
export const dynamic = "force-dynamic";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function ResumenPage({ searchParams }: { searchParams: { anio?: string; cliente?: string } }) {
  const year = Number(searchParams.anio) || new Date().getFullYear();
  const clientFilter = searchParams.cliente ?? "";
  const [allProjects, spend, clients, clientBalances] = await Promise.all([getProjects(true), getYearProjectSpend(year), getClients(), getClientBalances()]);
  const projects = clientFilter ? allProjects.filter((p) => p.client_id === clientFilter) : allProjects;
  const colorOf = projectColor(allProjects);
  const now = new Date();
  const lastMonth = year === now.getFullYear() ? now.getMonth() : year < now.getFullYear() ? 11 : -1;

  const cell = new Map<string, number>(); // `${project}-${m}`
  spend.forEach((r) => { const m = Number(r.month.slice(5, 7)) - 1; cell.set(`${r.project_id}-${m}`, (cell.get(`${r.project_id}-${m}`) ?? 0) + r.spent); });
  const rowTotal = (pid: string) => MONTHS.reduce((s, _, m) => s + (cell.get(`${pid}-${m}`) ?? 0), 0);
  const colTotal = (m: number, list: typeof projects) => list.reduce((s, p) => s + (cell.get(`${p.id}-${m}`) ?? 0), 0);

  const groups: { title: string; list: typeof projects }[] = [
    { title: "Obras", list: projects.filter((p) => p.kind === "obra" && rowTotal(p.id) > 0) },
    { title: "Negocios", list: projects.filter((p) => p.kind === "negocio" && rowTotal(p.id) > 0) },
    { title: "Personal", list: projects.filter((p) => p.kind === "personal" && rowTotal(p.id) > 0) },
  ].filter((g) => g.list.length);
  const all = groups.flatMap((g) => g.list);
  const grand = all.reduce((s, p) => s + rowTotal(p.id), 0);
  const obrasTotal = groups.find((g) => g.title === "Obras")?.list.reduce((s, p) => s + rowTotal(p.id), 0) ?? 0;
  const monthsElapsed = lastMonth + 1;
  const receivedYear = clientBalances.filter((b) => !clientFilter || b.client_id === clientFilter).reduce((s, b) => s + b.received, 0);

  return (
    <>
      <PageHeader title="Resumen anual" subtitle={`Gasto acumulado ${year} · obras ${formatMXN(obrasTotal)} · total ${formatMXN(grand)}`}>
        {clients.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/resumen?anio=${year}`} className={cn("h-10 rounded-xl bg-card px-3 text-[13.5px] font-medium leading-10 shadow-card", !clientFilter && "bg-accent text-white")}>Todos</Link>
            {clients.map((c) => <Link key={c.id} href={`/resumen?anio=${year}&cliente=${c.id}`} className={cn("h-10 rounded-xl bg-card px-3 text-[13.5px] font-medium leading-10 shadow-card", clientFilter === c.id && "bg-accent text-white")}>{c.name}</Link>)}
          </div>
        )}
        <div className="flex items-center rounded-2xl bg-card p-1 shadow-card">
          <Link href={`/resumen?anio=${year - 1}${clientFilter ? `&cliente=${clientFilter}` : ""}`} className="grid h-10 w-10 place-items-center rounded-xl text-accent hover:bg-card-2">‹</Link>
          <span className="min-w-[80px] text-center text-[15px] font-semibold">{year}</span>
          <Link href={`/resumen?anio=${year + 1}${clientFilter ? `&cliente=${clientFilter}` : ""}`} className={cn("grid h-10 w-10 place-items-center rounded-xl text-accent hover:bg-card-2", year >= now.getFullYear() && "pointer-events-none opacity-30")}>›</Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <K label={`Gasto en obras ${year}`} value={formatMXN(obrasTotal)} foot={monthsElapsed > 0 ? `${formatMXN(obrasTotal / monthsElapsed)} por mes en promedio` : ""} />
        <K label={`Gasto total ${year}`} value={formatMXN(grand)} foot="obras + negocios + personal" />
        <K label="Recibido de clientes (histórico)" value={formatMXN(receivedYear)} foot={clients.map((c) => c.name).join(", ")} />
        <K label="Mes más alto" value={(() => { let best = -1, bv = 0; MONTHS.forEach((_, m) => { const v = colTotal(m, all); if (v > bv) { bv = v; best = m; } }); return best >= 0 ? `${MONTHS[best]} · ${formatMXN(bv)}` : "—"; })()} />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Mes por mes</CardTitle><CardDescription>Salidas aplicadas a cada proyecto (incluye comprobaciones de caja chica y tu pago repartido)</CardDescription></CardHeader>
        <CardContent>
          {all.length === 0 ? <p className="py-6 text-center text-[14px] text-muted-foreground">Sin movimientos en {year}.</p> : (
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead>
                  <tr className="text-[11.5px] text-muted-foreground">
                    <th className="sticky left-0 bg-card py-1.5 pr-2 text-left font-semibold">Proyecto</th>
                    {MONTHS.map((m, i) => <th key={m} className={cn("px-1.5 py-1.5 text-right font-semibold", i > lastMonth && "opacity-40")}>{m}</th>)}
                    <th className="px-2 py-1.5 text-right font-semibold">Total {year}</th>
                    <th className="px-2 py-1.5 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <Fragment key={g.title}>
                      <tr><td colSpan={15} className="pt-3 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</td></tr>
                      {g.list.map((p) => {
                        const tot = rowTotal(p.id);
                        return (
                          <tr key={p.id} className="border-t border-border">
                            <td className="sticky left-0 bg-card py-2 pr-2"><Link href={`/proyectos/${p.id}`} className="flex items-center gap-2 font-medium hover:underline"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(p.id) }} />{p.name}</Link></td>
                            {MONTHS.map((_, m) => { const v = cell.get(`${p.id}-${m}`) ?? 0; return <td key={m} className={cn("px-1.5 py-2 text-right tabular", !v && "text-muted-foreground/50")}>{v ? formatMXN(v).replace("$", "") : "·"}</td>; })}
                            <td className="px-2 py-2 text-right font-semibold tabular">{formatMXN(tot)}</td>
                            <td className="px-2 py-2 text-right text-muted-foreground tabular">{grand ? ((tot / grand) * 100).toFixed(0) : 0} %</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="sticky left-0 bg-card py-2 pr-2">Total</td>
                    {MONTHS.map((_, m) => <td key={m} className="px-1.5 py-2 text-right tabular">{colTotal(m, all) ? formatMXN(colTotal(m, all)).replace("$", "") : "·"}</td>)}
                    <td className="px-2 py-2 text-right tabular">{formatMXN(grand)}</td>
                    <td className="px-2 py-2 text-right">100 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {all.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Acumulado del año por mes</CardTitle><CardDescription>Todas las salidas</CardDescription></CardHeader>
          <CardContent>
            {(() => { const max = Math.max(1, ...MONTHS.map((_, m) => colTotal(m, all))); return (
              <div className="flex h-36 items-end gap-2">
                {MONTHS.map((name, m) => { const v = colTotal(m, all); return (
                  <div key={name} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-end justify-center" style={{ height: 110 }}><div className={cn("w-3/5 rounded-t", m > lastMonth ? "bg-card-2" : "bg-accent")} style={{ height: `${(v / max) * 100}%` }} title={formatMXN(v)} /></div>
                    <span className="text-[11px] text-muted-foreground">{name}</span>
                  </div>
                ); })}
              </div>
            ); })()}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function K({ label, value, foot }: { label: string; value: string; foot?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-[22px] font-bold leading-none tracking-tight tabular lg:text-[24px]">{value}</div>
      {foot && <div className="mt-2 text-[12px] text-muted-foreground">{foot}</div>}
    </Card>
  );
}
