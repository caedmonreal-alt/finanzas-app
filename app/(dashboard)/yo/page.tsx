import type { Metadata } from "next";
import Link from "next/link";
import { getMonthlyFee, getClients } from "@/lib/queries-caja";
import { getAccountBalances } from "@/lib/queries";
import { monthKey } from "@/lib/dates";
import { formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Yo" };
export const dynamic = "force-dynamic";

export default async function YoPage() {
  const [fees, clients, accounts] = await Promise.all([getMonthlyFee(1), getClients(), getAccountBalances()]);
  const agreed = clients.reduce((s, c) => s + (c.monthly_fee ?? 0), 0);
  const cur = fees.find((r) => r.month === `${monthKey()}-01`) ?? { fee: 0, covered: 0, uncovered: 0 };
  const pending = agreed ? Math.max(0, agreed - cur.fee - cur.uncovered) : null;
  const nonCash = accounts.filter((a) => a.type !== "cash").reduce((s, a) => s + a.balance, 0);
  const tiles = [
    { href: "/mi-pago", title: "Mi pago", value: pending === null ? formatMXN(cur.fee - cur.covered) : formatMXN(pending), foot: pending === null ? "retirado este mes · captura tu pago acordado" : "pendiente de retirar este mes" },
    { href: "/dashboard", title: "Tablero personal", value: formatMXN(nonCash), foot: "cuentas bancarias, tarjetas e inversiones" },
    { href: "/transacciones", title: "Movimientos personales", value: "", foot: "buscar, filtrar y editar" },
    { href: "/presupuestos", title: "Presupuestos", value: "", foot: "límites mensuales por categoría" },
    { href: "/cuentas", title: "Cuentas", value: String(accounts.length), foot: "efectivo, débito, crédito, inversiones" },
  ];
  return (
    <>
      <PageHeader title="Yo" subtitle="Tu pago, tus cuentas y tus gastos personales" />
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full px-5 py-4 transition-colors hover:bg-card-2/50">
              <div className="text-[15px] font-semibold">{t.title} →</div>
              {t.value && <div className="mt-1.5 text-[24px] font-bold tabular">{t.value}</div>}
              <div className="mt-1 text-[12.5px] text-muted-foreground">{t.foot}</div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
