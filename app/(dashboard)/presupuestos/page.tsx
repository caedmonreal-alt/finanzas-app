import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategories, getBudgetsForMonth, getCategoryTotalsForMonth } from "@/lib/queries";
import { monthKey, parseMonthKey, monthRange, todayISO } from "@/lib/dates";
import { formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { BudgetEditor } from "./budget-editor";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Presupuestos" };
export const dynamic = "force-dynamic";

export default async function PresupuestosPage({ searchParams }: { searchParams: { mes?: string } }) {
  const { year, month } = parseMonthKey(searchParams.mes);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const [categories, budgets, totals] = await Promise.all([getCategories(), getBudgetsForMonth(key), getCategoryTotalsForMonth(key)]);

  const spentBy = new Map(totals.filter((t) => t.kind === "expense").map((t) => [t.category_id, t.total]));
  const budgetBy = new Map(budgets.map((b) => [b.category_id, b.amount]));
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const totalBudget = expenseCats.reduce((s, c) => s + (budgetBy.get(c.id) ?? 0), 0);
  const totalSpent = expenseCats.reduce((s, c) => s + (spentBy.get(c.id) ?? 0), 0);

  const isCurrent = key === monthKey();
  const { daysInMonth } = monthRange(key);
  const dayOfMonth = isCurrent ? Number(todayISO().slice(-2)) : daysInMonth;
  const elapsed = dayOfMonth / daysInMonth;

  return (
    <>
      <PageHeader
        title="Presupuestos"
        subtitle={totalBudget ? `${formatMXN(totalSpent)} de ${formatMXN(totalBudget)} · ${((totalSpent / totalBudget) * 100).toFixed(0)} % usado · ${(elapsed * 100).toFixed(0)} % del mes` : "Define cuánto quieres gastar por categoría cada mes"}
      >
        <Suspense>
          <MonthPicker value={key} />
        </Suspense>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <BudgetEditor
          monthKey={key}
          elapsed={elapsed}
          rows={expenseCats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, budget: budgetBy.get(c.id) ?? 0, spent: spentBy.get(c.id) ?? 0 }))}
        />
        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
