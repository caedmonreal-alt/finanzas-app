import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCashLedger, getCashOpening, getProjects, getPersonBalances, getPeople, getCashCounts, getClients, getClientBalances, getUncoveredDrawsTotal, getMonthlyFee } from "@/lib/queries-caja";
import { monthKey, parseMonthKey, monthLabel, dayLabel, todayISO } from "@/lib/dates";
import { cn, formatMXN, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementRow } from "@/components/caja/movement-row";
import { projectColor } from "@/lib/project-colors";

export const metadata: Metadata = { title: "Caja del mes" };
export const dynamic = "force-dynamic";

export default async function CajaPage({ searchParams }: { searchParams: { mes?: string } }) {
  const { year, month } = parseMonthKey(searchParams.mes);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const [rows, opening, projects, balances, people, counts, clients, clientBalances, uncoveredDraws, feeRows] = await Promise.all([
    getCashLedger(key),
    getCashOpening(key),
    getProjects(),
    getPersonBalances(),
    getPeople(),
    getCashCounts(1),
    getClients(),
    getClientBalances(),
    getUncoveredDrawsTotal(),
    getMonthlyFee(1),
  ]);
  const fundOf = (id: string) => { const b = clientBalances.find((x) => x.client_id === id); return b ? b.received - b.applied - b.petty_pending - b.loans_out : 0; };
  const fundsTotal = clients.reduce((s, c) => s + fundOf(c.id), 0);
  const agreedFee = clients.reduce((s, c) => s + (c.monthly_fee ?? 0), 0);
  const curFee = feeRows.find((r) => r.month === `${key}-01`) ?? { fee: 0, covered: 0, uncovered: 0 };
  const feePending = agreedFee ? Math.max(0, agreedFee - curFee.fee - curFee.uncovered) : null;
  const colorOf = projectColor(projects);
  rows.forEach((r) => {
    if (r.project && r.project_id) r.project.color = colorOf(r.project_id);
  });

  const isCash = (r: (typeof rows)[number]) => r.account?.type === "cash";
  // Cash-affecting amount of each row (transfers to/from cash accounts count)
  const cashDelta = (r: (typeof rows)[number]) => (isCash(r) ? r.amount : r.transfer_account_id ? -r.amount : 0);
  const tIn = rows.reduce((s, r) => s + Math.max(cashDelta(r), 0), 0);
  const tOut = rows.reduce((s, r) => s + Math.max(-cashDelta(r), 0), 0);
  const closing = opening + tIn - tOut;

  // by project (outflows)
  const byProject = new Map<string, { name: string; color: string; total: number; count: number }>();
  rows.forEach((r) => {
    const d = cashDelta(r);
    if (d >= 0 || r.movement_type === "transferencia" || r.transfer_account_id) return;
    const id = r.project_id ?? "none";
    const cur = byProject.get(id) ?? { name: r.project?.name ?? "Sin proyecto", color: r.project?.color ?? "#8E8E93", total: 0, count: 0 };
    cur.total += -d;
    cur.count += 1;
    byProject.set(id, cur);
  });
  const projRows = Array.from(byProject.values()).sort((a, b) => b.total - a.total);

  // by day
  const days = new Map<string, typeof rows>();
  rows.forEach((r) => {
    if (!days.has(r.date)) days.set(r.date, []);
    days.get(r.date)!.push(r);
  });
  let running = opening;

  const pending = balances.map((b) => ({ ...b, person: people.find((p) => p.id === b.person_id) })).filter((b) => b.petty_given - b.petty_proved > 0.005);
  const loans = balances.filter((b) => b.loan_outstanding > 0.005);
  const totalPending = pending.reduce((s, b) => s + (b.petty_given - b.petty_proved), 0);
  const totalLoans = loans.reduce((s, b) => s + b.loan_outstanding, 0);
  const lastCount = counts[0];
  const isCurrent = key === monthKey();
  const daysElapsed = isCurrent ? Number(todayISO().slice(-2)) : new Date(year, month, 0).getDate();

  return (
    <>
      <PageHeader title="Caja del mes" subtitle={`${rows.length} movimientos en ${monthLabel(key).toLowerCase()}`}>
        <Suspense>
          <MonthPicker value={key} />
        </Suspense>
        <QuickAddButton className="hidden sm:flex" label="Registrar" />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="col-span-2 px-6 py-5">
          <div className="text-[13px] font-medium text-muted-foreground">Efectivo en caja (teórico)</div>
          <div className="mt-2 text-[40px] font-bold leading-none tracking-tight tabular lg:text-[44px]">{formatMXN(closing)}</div>
          <div className="mt-3 text-[12.5px] text-muted-foreground">
            Inicio {formatMXN(opening)} + entradas {formatMXN(tIn)} − salidas {formatMXN(tOut)}
            {lastCount && (
              <>
                {" "}· último arqueo {formatDate(lastCount.date)}{" "}
                <span className={cn("rounded-md px-1.5 py-px text-[11px] font-semibold", lastCount.difference === 0 ? "bg-positive/15 text-positive" : "bg-danger/10 text-danger")}>
                  {lastCount.difference === 0 ? "cuadró" : (lastCount.difference > 0 ? "+" : "") + formatMXN(lastCount.difference)}
                </span>
              </>
            )}
          </div>
        </Card>
        <Kpi label="Salidas del mes" value={formatMXN(tOut)} foot={`${rows.filter((r) => cashDelta(r) < 0).length} mov. · ${formatMXN(tOut / Math.max(daysElapsed, 1))} por día`} />
        <Kpi label="Entradas del mes" value={formatMXN(tIn)} foot={`${rows.filter((r) => cashDelta(r) > 0).length} movimientos`} />
        <Kpi label="Por comprobar" value={formatMXN(totalPending)} foot={pending.length ? `${pending.length} persona${pending.length > 1 ? "s" : ""} con caja chica` : "Nada pendiente"} href="/personas" />
        <Kpi label="Préstamos por cobrar" value={formatMXN(totalLoans)} foot={loans.length ? `${loans.length} préstamo${loans.length > 1 ? "s" : ""} activos` : "Ninguno"} href="/prestamos" />
        <Kpi label="Gasto de obras" value={formatMXN(projRows.filter((p) => projects.find((x) => x.name === p.name)?.kind === "obra").reduce((s, p) => s + p.total, 0))} foot="Salidas del mes en obras" href="/proyectos" />
        <Kpi label="Mi pago · pendiente de retirar" value={feePending === null ? formatMXN(curFee.fee - curFee.covered) : formatMXN(feePending)} foot={feePending === null ? "retirado este mes · captura el acordado en el cliente" : `acordado ${formatMXN(agreedFee)} · adelantos por descontar ${formatMXN(curFee.uncovered)}`} href="/mi-pago" />
      </div>

      {clients.length > 0 && (
        <Card className="mt-4 px-6 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold">¿De quién es el efectivo?</h2>
            <span className="text-[12.5px] text-muted-foreground">El efectivo en caja no es igual al saldo de un cliente: junta varios fondos y descuenta tus adelantos.</span>
          </div>
          <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {clients.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-[13.5px]"><Link href={`/clientes/${c.id}`} className="text-muted-foreground hover:underline">Fondo de {c.name}</Link><span className={cn("font-medium tabular", fundOf(c.id) < 0 && "text-danger")}>{formatMXN(fundOf(c.id))}</span></li>
            ))}
            {uncoveredDraws > 0 && <li className="flex items-center justify-between text-[13.5px]"><Link href="/mi-pago" className="text-muted-foreground hover:underline">− Adelantos de mi pago sin descontar</Link><span className="font-medium tabular text-warning">−{formatMXN(uncoveredDraws)}</span></li>}
            <li className="flex items-center justify-between text-[13.5px]"><span className="text-muted-foreground">Tuyo / otros (resto)</span><span className="font-medium tabular">{formatMXN(closing - fundsTotal + uncoveredDraws)}</span></li>
            <li className="flex items-center justify-between border-t border-border pt-1 text-[14px] font-semibold sm:col-span-2"><span>= Efectivo en caja</span><span className="tabular">{formatMXN(closing)}</span></li>
          </ul>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Ledger */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas y salidas · {monthLabel(key).split(" ")[0].toLowerCase()}</CardTitle>
            <CardDescription>Toca un movimiento para editarlo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Tot label="Saldo inicial" value={formatMXN(opening)} />
              <Tot label="Entradas" value={"+" + formatMXN(tIn)} cls="text-positive" />
              <Tot label="Salidas" value={"−" + formatMXN(tOut)} cls="text-danger" />
              <Tot label="Saldo final" value={formatMXN(closing)} />
            </div>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-muted-foreground">Sin movimientos de efectivo este mes.</p>
            ) : (
              Array.from(days.entries()).map(([date, list]) => {
                const dIn = list.reduce((s, r) => s + Math.max(cashDelta(r), 0), 0);
                const dOut = list.reduce((s, r) => s + Math.max(-cashDelta(r), 0), 0);
                return (
                  <section key={date} className="border-t border-border pt-2.5 pb-1 first:border-t-0 first:pt-0">
                    <div className="mb-1 flex items-baseline justify-between">
                      <h3 className="text-[15px] font-bold">
                        {date.slice(-2)} <span className="text-[13px] font-medium text-muted-foreground">{dayLabel(date)}</span>
                      </h3>
                      <span className="text-[12.5px] text-muted-foreground tabular">
                        {dIn ? `+${formatMXN(dIn)} · ` : ""}
                        {dOut ? `−${formatMXN(dOut)}` : ""}
                      </span>
                    </div>
                    {list.map((r) => {
                      running += cashDelta(r);
                      return <MovementRow key={r.id} row={r} running={running} />;
                    })}
                  </section>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salidas por proyecto</CardTitle>
              <CardDescription>{formatMXN(tOut)}</CardDescription>
            </CardHeader>
            <CardContent>
              {projRows.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">Sin salidas.</p>
              ) : (
                <>
                  <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                    {projRows.map((p) => (
                      <span key={p.name} style={{ flex: p.total, background: p.color }} />
                    ))}
                  </div>
                  <ul className="divide-y divide-border">
                    {projRows.map((p) => (
                      <li key={p.name} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded" style={{ background: p.color }} />
                          <div>
                            <div className="text-[14.5px] font-medium">{p.name}</div>
                            <div className="text-[12px] text-muted-foreground">{p.count} mov. · {tOut ? ((p.total / tOut) * 100).toFixed(0) : 0} %</div>
                          </div>
                        </div>
                        <div className="text-[14.5px] font-semibold tabular">{formatMXN(p.total)}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por comprobar</CardTitle>
              <Link href="/personas" className="text-[13px] font-medium text-accent hover:underline">Ver caja chica</Link>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">Nadie te debe comprobaciones.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map((b) => (
                    <li key={b.person_id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-[14.5px] font-medium">{b.person?.name ?? "—"}</div>
                        <div className="text-[12px] text-muted-foreground">Entregado {formatMXN(b.petty_given)} · comprobado {formatMXN(b.petty_proved)}</div>
                      </div>
                      <div className="text-[14.5px] font-semibold text-warning tabular">{formatMXN(b.petty_given - b.petty_proved)}</div>
                    </li>
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

function Kpi({ label, value, foot, href }: { label: string; value: string; foot?: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-[26px] font-bold leading-none tracking-tight tabular">{value}</div>
      {foot && <div className="mt-2 text-[12.5px] text-muted-foreground">{foot}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="block">
      <Card className="h-full px-5 py-4 transition-colors hover:bg-card-2/50">{inner}</Card>
    </Link>
  ) : (
    <Card className="px-5 py-4">{inner}</Card>
  );
}
function Tot({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-2xl bg-card-2 px-3 py-2.5">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-[17px] font-bold tabular", cls)}>{value}</div>
    </div>
  );
}
