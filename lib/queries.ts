import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/dates";
import type { Category } from "@/lib/types";

export interface AccountBalance {
  account_id: string;
  name: string;
  type: "cash" | "debit" | "credit" | "investment" | "debt";
  currency: string;
  credit_limit: number | null;
  opening_balance: number;
  balance: number;
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface TransactionRow {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  is_recurring: boolean;
  transfer_account_id: string | null;
  account: { name: string } | null;
  category: { name: string; icon: string | null; kind: "income" | "expense" } | null;
}

export interface CategoryMonthTotal {
  category_id: string | null;
  kind: "income" | "expense" | null;
  total: number;
  tx_count: number;
}

export interface BudgetRow {
  id: string;
  category_id: string;
  month: string;
  amount: number;
}

/** First day of a month as YYYY-MM-01 */
export function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("account_balances").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    balance: Number(r.balance),
    opening_balance: Number(r.opening_balance),
    credit_limit: r.credit_limit === null ? null : Number(r.credit_limit),
  }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getMonthTotals(months = 13): Promise<MonthTotal[]> {
  const supabase = createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  const { data, error } = await supabase
    .from("monthly_totals")
    .select("month, income, expense, net")
    .gte("month", monthStart(from))
    .order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: r.month, income: Number(r.income), expense: Number(r.expense), net: Number(r.net) }));
}

export async function getTransactionsForMonth(monthKey: string): Promise<TransactionRow[]> {
  const supabase = createClient();
  const { start, end } = monthRange(monthKey);
  const { data, error } = await supabase
    .from("transactions")
    .select("id, account_id, category_id, amount, date, note, is_recurring, transfer_account_id, account:accounts!transactions_account_id_fkey(name), category:categories(name, icon, kind)")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    amount: Number(r.amount),
    account: Array.isArray(r.account) ? r.account[0] ?? null : r.account,
    category: Array.isArray(r.category) ? r.category[0] ?? null : r.category,
  })) as TransactionRow[];
}

export async function getCategoryTotalsForMonth(monthKey: string): Promise<CategoryMonthTotal[]> {
  const supabase = createClient();
  const { start } = monthRange(monthKey);
  const { data, error } = await supabase
    .from("monthly_category_totals")
    .select("category_id, kind, total, tx_count")
    .eq("month", start);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, total: Number(r.total), tx_count: Number(r.tx_count) }));
}

export async function getBudgetsForMonth(monthKey: string): Promise<BudgetRow[]> {
  const supabase = createClient();
  const { start } = monthRange(monthKey);
  const { data, error } = await supabase.from("budgets").select("id, category_id, month, amount").eq("month", start);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}
