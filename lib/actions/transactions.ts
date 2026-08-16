"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TransactionInput {
  kind: "expense" | "income";
  amount: number; // always positive from the form
  account_id: string;
  category_id: string | null;
  date: string; // YYYY-MM-DD
  note: string;
  is_recurring?: boolean;
}

type Result = { error?: string; id?: string };

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/transacciones");
  revalidatePath("/presupuestos");
  revalidatePath("/cuentas");
}

function validate(input: TransactionInput): string | null {
  if (!input.amount || input.amount <= 0 || !Number.isFinite(input.amount)) return "Escribe un monto mayor a cero.";
  if (!input.account_id) return "Elige una cuenta.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Fecha inválida.";
  return null;
}

export async function createTransaction(input: TransactionInput): Promise<Result> {
  const err = validate(input);
  if (err) return { error: err };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const signed = input.kind === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: input.account_id,
      category_id: input.category_id,
      amount: signed,
      date: input.date,
      note: input.note.trim() || null,
      is_recurring: !!input.is_recurring,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidateAll();
  return { id: data.id };
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Result> {
  const err = validate(input);
  if (err) return { error: err };
  const supabase = createClient();
  const signed = input.kind === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);
  const { error } = await supabase
    .from("transactions")
    .update({
      account_id: input.account_id,
      category_id: input.category_id,
      amount: signed,
      date: input.date,
      note: input.note.trim() || null,
      is_recurring: !!input.is_recurring,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { id };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { id };
}
