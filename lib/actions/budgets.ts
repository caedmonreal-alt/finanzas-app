"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthRange, shiftMonth } from "@/lib/dates";

type Result = { error?: string };

/** Upsert a budget for (category, month). amount 0 or empty removes it. */
export async function setBudget(categoryId: string, monthKey: string, amount: number): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const { start } = monthRange(monthKey);

  if (!amount || amount <= 0) {
    const { error } = await supabase.from("budgets").delete().eq("category_id", categoryId).eq("month", start);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("budgets")
      .upsert({ user_id: user.id, category_id: categoryId, month: start, amount }, { onConflict: "user_id,category_id,month" });
    if (error) return { error: error.message };
  }
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  return {};
}

/** Copies all budgets from the previous month into monthKey (does not overwrite existing ones). */
export async function copyBudgetsFromPreviousMonth(monthKey: string): Promise<Result & { copied?: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const prev = monthRange(shiftMonth(monthKey, -1)).start;
  const cur = monthRange(monthKey).start;

  const [{ data: prevRows, error: e1 }, { data: curRows, error: e2 }] = await Promise.all([
    supabase.from("budgets").select("category_id, amount").eq("month", prev),
    supabase.from("budgets").select("category_id").eq("month", cur),
  ]);
  if (e1) return { error: e1.message };
  if (e2) return { error: e2.message };
  const existing = new Set((curRows ?? []).map((r) => r.category_id));
  const rows = (prevRows ?? [])
    .filter((r) => !existing.has(r.category_id))
    .map((r) => ({ user_id: user.id, category_id: r.category_id, month: cur, amount: r.amount }));
  if (rows.length === 0) return { copied: 0 };
  const { error } = await supabase.from("budgets").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  return { copied: rows.length };
}
