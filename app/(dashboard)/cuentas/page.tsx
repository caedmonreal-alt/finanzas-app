import type { Metadata } from "next";
import { getAccountBalances } from "@/lib/queries";
import { formatMXN, cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Cuentas" };
export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const balances = await getAccountBalances();
  const total = balances.reduce((s, b) => s + b.balance, 0);

  return (
    <>
      <PageHeader title="Cuentas" subtitle={`Patrimonio neto ${formatMXN(total)}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tus cuentas</CardTitle>
            <CardDescription>Saldo actual</CardDescription>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-muted-foreground">Aún no tienes cuentas. Agrega la primera a la izquierda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {balances.map((b) => (
                  <li key={b.account_id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-[14.5px] font-medium">{b.name}</div>
                      <div className="text-[12.5px] text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[b.type]}
                        {b.credit_limit ? ` · límite ${formatMXN(b.credit_limit)}` : ""}
                      </div>
                    </div>
                    <div className={cn("text-[14.5px] font-semibold tabular", b.balance < 0 && "text-danger")}>{formatMXN(b.balance)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
