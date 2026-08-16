"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";

const TYPES: AccountType[] = ["cash", "debit", "credit", "investment", "debt"];

export async function createAccount(formData: FormData): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountType;
  const opening = Number(String(formData.get("opening_balance") ?? "0").replace(/[^0-9.-]/g, ""));
  const limitRaw = String(formData.get("credit_limit") ?? "").replace(/[^0-9.]/g, "");

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
    credit_limit: type === "credit" && limitRaw ? Number(limitRaw) : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
  return {};
}

export async function archiveAccount(id: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
  return {};
}
