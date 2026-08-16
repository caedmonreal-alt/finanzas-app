import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCashLedger, getCashOpening, getProjects, getPersonBalances, getPeople, getCashCounts, getClients, getClientBalances, getUncoveredDrawsTotal, getMonthlyFee } from "@/lib/queries-caja";
import { monthKey, parseMonthKey, monthLabel, todayISO } from "@/lib/dates";
import { cn, formatMXN, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { PdfButton } from "@/components/reportes/pdf-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Ledger } from "@/components/caja/ledger";
import { UndoButton } from "@/components/caja/undo-button";
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
  // Fee compensations (split_group + positive) are not real inflows: they net against personal draws already taken.
  const isCompensation = (r: (typeof rows)[number]) => !!r.split_group && r.amount > 0;
  const tInGross = rows.reduce((s, r) => s + Math.max(cashDelta(r), 0), 0);
  const tOutGross = rows.reduce((s, r) => s + Math.max(-cashDelta(r), 0), 0);
  const compensation = rows.filter(isCompensation).reduce((s, r) => s + r.amount, 0);
  const tIn = tInGross - compensation;
  const tOut = tOutGross - compensation;
  const closing = opening + tIn - tOut;

  // by project (outflows)
  const byProject = new Map<string, { name: string; color: string; total: number; count: number }>();
  rows.forEach((r) => {
    const d = cashDelta(r);
    if (d >= 0 || r.movement_type === "transferencia" || r.transfer_account_id) return;
    // Personal draws already deducted from "Mi pago" are shown as part of the fee, not as Personal
    if (r.covered_by_fee) return; // ya está incluido en las líneas "Mi pago" de las obras (compensado)
    const id = r.project_id ?? "none";
    const cur = byProject.get(id) ?? { name: r.project?.name ?? "Sin proyecto", color: r.project?.color ?? "#8E8E93", total: 0, count: 0 };
    cur.total += -d;
    cur.count += 1;
    byProject.set(id, cur);
  });
  const projRows = Array.from(byProject.values()).sort((a, b) => b.total - a.total);


  const pending = balances.map((b) => ({ ...b, person: people.find((p) => p.id === b.person_id) })).filter((b) => b.petty_given - b.petty_proved > 0.005);
  const loans = balances.filter((b) => b.loan_outstanding > 0.005);
  const lastCount = counts[0];
  const isCurrent = key === monthKey();
  const daysElapsed = isCurrent ? Number(todayISO().slice(-2)) : new Date(year, month, 0).getDate();

  return (
    <>
      <PageHeader title="Caja del mes" subtitle={`${rows.length} movimientos en ${monthLabel(key).toLowerCase()}`}>
        <Suspense>
          <MonthPicker value={key} />
        </Suspense>
        <UndoButton compact />
        <PdfButton href={`/api/reportes/caja?mes=${key}`} title={`Caja ${monthLabel(key)}`} back={`/caja?mes=${key}`} />
        <QuickAddButton className="hidden sm:flex" label="Registrar" />
      </PageHeader>

      {/* Three answers: how much cash, what's left per client, what's pending */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium text-muted-foreground">¿Cuánto efectivo debo tener?</div>
            <Link href="/arqueo" className="rounded-lg bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent">¿Cuadra? Contar →</Link>
          </div>
          <div className="mt-2 text-[32px] font-bold leading-none tracking-tight tabular sm:text-[38px] lg:text-[40px]">{formatMXN(closing)}</div>
          <div className="mt-2.5 text-[12.5px] text-muted-foreground">
            Inicio {formatMXN(opening)} + entradas {formatMXN(tIn)} − salidas {formatMXN(tOut)}
            {lastCount && (
              <> · último conteo {formatDate(lastCount.date)}{" "}
                <span className={cn("rounded-md px-1.5 py-px text-[11px] font-semibold", lastCount.difference === 0 ? "bg-positive/15 text-positive" : "bg-danger/10 text-danger")}>{lastCount.difference === 0 ? "cuadró" : (lastCount.difference > 0 ? "+" : "") + formatMXN(lastCount.difference)}</span>
              </>
            )}
          </div>
        </Card>
        <Card className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="text-[13px] font-medium text-muted-foreground">¿Cuánto le queda a cada cliente?</div>
          {clients.length === 0 ? <p className="mt-2 text-[14px] text-muted-foreground">Sin clientes.</p> : (
            <ul className="mt-1.5 divide-y divide-border">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="flex items-center justify-between py-2">
                    <span className="text-[14.5px] font-medium">{c.name}</span>
                    <span className={cn("text-[17px] font-bold tabular", fundOf(c.id) < 0 ? "text-danger" : "text-positive")}>{formatMXN(fundOf(c.id))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(uncoveredDraws > 0 || Math.abs(closing - fundsTotal + uncoveredDraws) > 0.5) && (
            <div className="mt-2 border-t border-border pt-2 text-[12px] text-muted-foreground">
              {uncoveredDraws > 0 && <div className="flex justify-between"><Link href="/mi-pago" className="hover:underline">− Lo que ya tomé de mi pago (por descontar)</Link><span className="tabular text-warning">−{formatMXN(uncoveredDraws)}</span></div>}
              <div className="flex justify-between"><span>Mío / otros</span><span className="tabular">{formatMXN(closing - fundsTotal + uncoveredDraws)}</span></div>
              <div className="mt-1 flex justify-between font-semibold text-foreground"><span>= Efectivo en caja</span><span className="tabular">{formatMXN(closing)}</span></div>
            </div>
          )}
        </Card>
        <Card className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="text-[13px] font-medium text-muted-foreground">¿Qué tengo pendiente?</div>
          <ul className="mt-1.5 divide-y divide-border">
            {pending.map((b) => (
              <li key={b.person_id}><Link href="/personas" className="flex items-center justify-between py-2"><span className="text-[14px]"><b>{b.person?.name ?? "—"}</b> debe comprobar</span><span className="text-[14.5px] font-semibold tabular text-warning">{formatMXN(b.petty_given - b.petty_proved)}</span></Link></li>
            ))}
            {loans.map((b) => (
              <li key={b.person_id}><Link href="/prestamos" className="flex items-center justify-between py-2"><span className="text-[14px]"><b>{people.find((p) => p.id === b.person_id)?.name ?? "—"}</b> me debe (préstamo)</span><span className="text-[14.5px] font-semibold tabular text-danger">{formatMXN(b.loan_outstanding)}</span></Link></li>
            ))}
            {feePending !== null && feePending > 0 && (
              <li><Link href="/mi-pago" className="flex items-center justify-between py-2"><span className="text-[14px]">Mi pago por retirar este mes</span><span className="text-[14.5px] font-semibold tabular text-accent">{formatMXN(feePending)}</span></Link></li>
            )}
            {pending.length === 0 && loans.length === 0 && !(feePending && feePending > 0) && <li className="py-3 text-[14px] text-muted-foreground">Nada pendiente. 👍🏻</li>}
          </ul>
        </Card>
      </div>

      <details className="mt-3 rounded-2xl bg-card px-5 py-3 shadow-card">
        <summary className="cursor-pointer text-[13.5px] font-medium text-muted-foreground">Más indicadores del mes</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Salidas del mes" value={formatMXN(tOut)} foot={`${rows.filter((r) => cashDelta(r) < 0).length} mov. · ${formatMXN(tOut / Math.max(daysElapsed, 1))} por día${compensation ? ` · sin contar ${formatMXN(compensation)} ya tomados de mi pago` : ""}`} />
          <Kpi label="Entradas del mes" value={formatMXN(tIn)} foot={`${rows.filter((r) => cashDelta(r) > 0 && !isCompensation(r)).length} movimientos`} />
          <Kpi label="Gasto de obras" value={formatMXN(projRows.filter((p) => projects.find((x) => x.name === p.name)?.kind === "obra").reduce((s, p) => s + p.total, 0))} foot="salidas del mes en obras" href="/proyectos" />
          <Kpi label="Gasto personal" value={formatMXN(projRows.filter((p) => projects.find((x) => x.name === p.name)?.kind === "personal").reduce((s, p) => s + p.total, 0))} foot={tOut ? `${((projRows.filter((p) => projects.find((x) => x.name === p.name)?.kind === "personal").reduce((s, p) => s + p.total, 0) / tOut) * 100).toFixed(0)} % de las salidas` : "—"} href="/dashboard" />
        </div>
      </details>

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
              <Tot label={compensation ? "Entradas (sin compensaciones)" : "Entradas"} value={"+" + formatMXN(tIn)} cls="text-positive" />
              <Tot label={compensation ? "Salidas (netas)" : "Salidas"} value={"−" + formatMXN(tOut)} cls="text-danger" />
              <Tot label="Saldo final" value={formatMXN(closing)} />
            </div>
            <Ledger rows={rows} opening={opening} projects={projects.filter((p) => !p.is_archived)} emptyText="Sin movimientos de efectivo este mes." />
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
      <div className="mt-2 text-[22px] font-bold leading-none tracking-tight tabular sm:text-[26px]">{value}</div>
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
