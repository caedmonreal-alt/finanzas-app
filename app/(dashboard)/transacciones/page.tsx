import type { Metadata } from "next";
import { Suspense } from "react";
import { getTransactionsForMonth, getCategories, getAccountBalances } from "@/lib/queries";
import { monthKey, parseMonthKey } from "@/lib/dates";
import { formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { TransactionsList } from "./transactions-list";

export const metadata: Metadata = { title: "Transacciones" };
export const dynamic = "force-dynamic";

export default async function TransaccionesPage({ searchParams }: { searchParams: { mes?: string } }) {
  const { year, month } = parseMonthKey(searchParams.mes);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const [txs, categories, accounts] = await Promise.all([getTransactionsForMonth(key), getCategories(), getAccountBalances()]);

  const income = txs.filter((t) => t.amount > 0 && !t.transfer_account_id).reduce((s, t) => s + t.amount, 0);
  const expense = -txs.filter((t) => t.amount < 0 && !t.transfer_account_id).reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Transacciones"
        subtitle={`${txs.length} movimientos · Ingresos ${formatMXN(income)} · Gastos ${formatMXN(expense)}`}
      >
        <Suspense>
          <MonthPicker value={key} />
        </Suspense>
        <QuickAddButton className="hidden sm:flex" />
      </PageHeader>
      <TransactionsList transactions={txs} categories={categories} accounts={accounts} isCurrentMonth={key === monthKey()} />
    </>
  );
}
