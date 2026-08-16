"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MOVEMENT_TYPES, type MovementType } from "@/lib/types";

export interface TransactionInput {
  kind: "expense" | "income";
  amount: number; // always positive from the form
  account_id: string;
  category_id: string | null;
  project_id?: string | null;
  person_id?: string | null;
  person_name?: string | null; // free text → creates the person if needed
  client_id?: string | null;
  movement_type?: MovementType;
  date: string; // YYYY-MM-DD
  note: string;
  is_recurring?: boolean;
}

type Result = { error?: string; id?: string };

const PATHS = ["/caja", "/dashboard", "/transacciones", "/presupuestos", "/cuentas", "/proyectos", "/personas", "/prestamos", "/arqueo"];
function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
  revalidatePath("/proyectos/[id]", "page");
}

function validate(input: TransactionInput): string | null {
  if (!input.amount || input.amount <= 0 || !Number.isFinite(input.amount)) return "Escribe un monto mayor a cero.";
  if (!input.account_id) return "Elige una cuenta.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Fecha inválida.";
  return null;
}

/** Resolve person by id or name (creating it if needed). Returns null when not applicable. */
async function resolvePerson(supabase: ReturnType<typeof createClient>, userId: string, input: TransactionInput): Promise<{ id: string | null; error?: string }> {
  const type = MOVEMENT_TYPES.find((t) => t.id === (input.movement_type ?? "gasto"));
  if (!type?.needsPerson) return { id: null };
  if (input.person_id) return { id: input.person_id };
  const name = (input.person_name ?? "").trim();
  if (!name) return { id: null, error: "Escribe a quién." };
  const { data: existing } = await supabase.from("people").select("id").eq("name", name).maybeSingle();
  if (existing) return { id: existing.id };
  const { data, error } = await supabase.from("people").insert({ user_id: userId, name }).select("id").single();
  if (error) return { id: null, error: error.message };
  return { id: data.id };
}

function normalize(input: TransactionInput) {
  const type = (input.movement_type ?? "gasto") as MovementType;
  const def = MOVEMENT_TYPES.find((t) => t.id === type);
  const dir = def?.dir === "in" ? "in" : "out";
  const signed = dir === "out" ? -Math.abs(input.amount) : Math.abs(input.amount);
  return { type, signed };
}

export async function createTransaction(input: TransactionInput): Promise<Result> {
  const err = validate(input);
  if (err) return { error: err };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const person = await resolvePerson(supabase, user.id, input);
  if (person.error) return { error: person.error };
  const { type, signed } = normalize(input);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: input.account_id,
      category_id: input.category_id,
      project_id: input.project_id ?? null,
      client_id: input.client_id ?? null,
      person_id: person.id,
      movement_type: type,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const person = await resolvePerson(supabase, user.id, input);
  if (person.error) return { error: person.error };
  const { type, signed } = normalize(input);
  const { error } = await supabase
    .from("transactions")
    .update({
      account_id: input.account_id,
      category_id: input.category_id,
      project_id: input.project_id ?? null,
      client_id: input.client_id ?? null,
      person_id: person.id,
      movement_type: type,
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

/** Bulk insert (importer). Returns count. */
export async function createTransactionsBulk(rows: TransactionInput[]): Promise<{ error?: string; count?: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const out: Record<string, unknown>[] = [];
  for (const input of rows) {
    const err = validate(input);
    if (err) return { error: `${err} (${input.note})` };
    const person = await resolvePerson(supabase, user.id, input);
    if (person.error) return { error: person.error };
    const { type, signed } = normalize(input);
    out.push({
      user_id: user.id,
      account_id: input.account_id,
      category_id: input.category_id,
      project_id: input.project_id ?? null,
      client_id: input.client_id ?? null,
      person_id: person.id,
      movement_type: type,
      amount: signed,
      date: input.date,
      note: input.note.trim() || null,
      is_recurring: false,
    });
  }
  const { error } = await supabase.from("transactions").insert(out);
  if (error) return { error: error.message };
  revalidateAll();
  return { count: out.length };
}
