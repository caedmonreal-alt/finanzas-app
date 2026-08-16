"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";

const TYPES: AccountType[] = ["cash", "debit", "credit", "investment", "debt"];

type Result = { error?: string; message?: string };

function parseMoney(raw: FormDataEntryValue | null): number {
  return Number(String(raw ?? "0").replace(/[^0-9.-]/g, "") || 0);
}

function revalidate() {
  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
}

export async function createAccount(formData: FormData): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountType;
  const opening = parseMoney(formData.get("opening_balance"));
  const limit = parseMoney(formData.get("credit_limit"));

  if (!name) return { error: "Escribe un nombre." };
  if (!TYPES.includes(type)) return { error: "Tipo inválido." };
  if (Number.isNaN(opening)) return { error: "Saldo inválido." };

  // Credit cards and debts are stored as negative balances.
  const signed = (type === "credit" || type === "debt") && opening > 0 ? -opening : opening;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    opening_balance: signed,
    credit_limit: type === "credit" && limit ? limit : null,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function updateAccount(id: string, formData: FormData): Promise<Result> {
  const supabase = createClient();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountType;
  const opening = parseMoney(formData.get("opening_balance"));
  const limit = parseMoney(formData.get("credit_limit"));

  if (!name) return { error: "Escribe un nombre." };
  if (!TYPES.includes(type)) return { error: "Tipo inválido." };
  const signed = (type === "credit" || type === "debt") && opening > 0 ? -opening : opening;

  const { error } = await supabase
    .from("accounts")
    .update({ name, type, opening_balance: signed, credit_limit: type === "credit" && limit ? limit : null })
    .eq("id", id); // RLS guarantees it is the user's own row
  if (error) return { error: error.message };
  revalidate();
  return {};
}

/**
 * Deletes the account when it has no transactions; otherwise archives it
 * (keeps history and balances consistent).
 */
export async function deleteAccount(id: string): Promise<Result> {
  const supabase = createClient();
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`account_id.eq.${id},transfer_account_id.eq.${id}`);
  if (countError) return { error: countError.message };

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);
    if (error) return { error: error.message };
    revalidate();
    return { message: "La cuenta tenía movimientos, así que se archivó (no se borra el historial)." };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}
