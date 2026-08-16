import type { Metadata } from "next";
import Link from "next/link";
import { getMonthlyFee, getClients } from "@/lib/queries-caja";
import { monthKey } from "@/lib/dates";
import { formatMXN, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FeeButton } from "./fee-button";

export const metadata: Metadata = { title: "Mi pago" };
export const dynamic = "force-dynamic";

export default async function MiPagoPage() {
  const [rows, clients] = await Promise.all([getMonthlyFee(12), getClients()]);
  const agreed = clients.reduce((s, c) => s + (c.monthly_fee ?? 0), 0);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const now = new Date();
  const months: string[] = [];
  for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`); }
  const cur = byMonth.get(`${monthKey()}-01`) ?? { fee: 0, covered: 0, uncovered: 0 };
  const curWithdrawn = cur.fee - cur.covered;
  const curPending = agreed ? Math.max(0, agreed - cur.fee - cur.uncovered) : null;
  const totalUncovered = rows.reduce((s, r) => s + r.uncovered, 0);
  const label = (m: string) => { const d = new Date(m + "T12:00:00"); const s = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };

  return (
    <>
      <PageHeader title="Mi pago" subtitle={agreed ? `Acordado ${formatMXN(agreed)} al mes${clients.length > 1 ? ` (${clients.filter((c) => c.monthly_fee).map((c) => `${c.name} ${formatMXN(c.monthly_fee!)}`).join(" + ")})` : ""}` : "Captura tu pago mensual acordado en Proyectos → cliente → Renombrar"}>
        <FeeButton />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <K label="Este mes · registrado" value={formatMXN(cur.fee)} foot="cargado a los clientes (repartido en obras)" />
        <K label="Este mes · adelantos" value={formatMXN(cur.uncovered + cur.covered)} foot={`${formatMXN(cur.covered)} ya descontados · ${formatMXN(cur.uncovered)} por descontar`} />
        <K label="Este mes · retirado en efectivo" value={formatMXN(curWithdrawn)} foot="lo que físicamente sacaste como pago" />
        <K label="Pendiente de retirar" value={curPending === null ? "—" : formatMXN(curPending)} foot={curPending === null ? "captura el pago acordado" : curPending > 0 ? "acordado − registrado − adelantos por descontar" : "ya tomaste tu pago del mes"} cls={curPending && curPending > 0 ? "text-accent" : undefined} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div><CardTitle>Mes por mes</CardTitle><CardDescription>Adelantos = gastos personales y de proyectos propios pagados de la caja. Retirado = pago registrado − adelantos descontados.</CardDescription></div>
        </CardHeader>
        <CardContent>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead>
                <tr className="text-[12px] text-muted-foreground">
                  <th className="py-1.5 pr-2 text-left font-semibold">Mes</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Acordado</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Registrado</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Adelantos</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Retirado en efectivo</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {months.slice().reverse().map((m) => {
                  const r = byMonth.get(m) ?? { fee: 0, covered: 0, uncovered: 0 };
                  const draws = r.covered + r.uncovered;
                  const withdrawn = r.fee - r.covered;
                  const pending = agreed ? agreed - r.fee - r.uncovered : null;
                  const isCur = m === `${monthKey()}-01`;
                  const empty = !r.fee && !draws;
                  return (
                    <tr key={m} className={cn(isCur && "bg-accent-soft/60", empty && "text-muted-foreground")}>
                      <td className="py-2 pr-2 font-medium">{label(m)}{isCur ? " · en curso" : ""}</td>
                      <td className="px-2 py-2 text-right tabular">{agreed ? formatMXN(agreed) : "—"}</td>
                      <td className="px-2 py-2 text-right tabular">{r.fee ? formatMXN(r.fee) : "·"}</td>
                      <td className="px-2 py-2 text-right tabular">{draws ? <>{formatMXN(draws)}{r.uncovered > 0 && <span className="ml-1 text-[11.5px] text-warning">({formatMXN(r.uncovered)} sin descontar)</span>}</> : "·"}</td>
                      <td className="px-2 py-2 text-right tabular">{withdrawn ? formatMXN(withdrawn) : "·"}</td>
                      <td className="px-2 py-2 text-right tabular">{pending === null ? "—" : pending > 0 ? <span className="font-semibold text-accent">{formatMXN(pending)}</span> : pending < 0 ? <span className="text-danger">{formatMXN(pending)} de más</span> : <span className="text-positive">completo</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalUncovered > 0 && <p className="mt-3 text-[13px] text-muted-foreground">Tienes <b className="text-foreground">{formatMXN(totalUncovered)}</b> en adelantos sin descontar. Se descuentan automáticamente la próxima vez que registres “Mi pago (repartido)” con la casilla marcada.</p>}
          <p className="mt-2 text-[12.5px] text-muted-foreground">Ver el reparto de cada pago en las obras: <Link href="/caja" className="text-accent hover:underline">Caja del mes</Link> (líneas “Mi pago · parte proporcional”).</p>
        </CardContent>
      </Card>
    </>
  );
}

function K({ label, value, foot, cls }: { label: string; value: string; foot?: string; cls?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-[24px] font-bold leading-none tracking-tight tabular", cls)}>{value}</div>
      {foot && <div className="mt-2 text-[12px] text-muted-foreground">{foot}</div>}
    </Card>
  );
}
