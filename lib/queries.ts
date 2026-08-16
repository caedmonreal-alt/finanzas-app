import { createClient } from "@/lib/supabase/server";

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
