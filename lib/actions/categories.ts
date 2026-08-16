"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

function revalidateAll() {
  revalidatePath("/presupuestos");
  revalidatePath("/transacciones");
  revalidatePath("/dashboard");
}

export async function createCategory(input: { name: string; icon: string; kind: "income" | "expense" }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { error: "Escribe un nombre." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    icon: input.icon.trim() || null,
    kind: input.kind,
    sort_order: input.kind === "income" ? 5 : 50,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function renameCategory(id: string, input: { name: string; icon: string }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { error: "Escribe un nombre." };
  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ name, icon: input.icon.trim() || null }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

/** Deletes a category; its transactions keep existing with category_id = null (ON DELETE SET NULL). */
export async function deleteCategory(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
