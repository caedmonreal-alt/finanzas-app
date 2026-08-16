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

/* ---------- "Mi pago repartido": prorated fee across a client's active obras ---------- */
export type FeeBasis = "prev_month" | "month" | "year" | "equal";

export interface FeeSplitPreviewRow {
  project_id: string;
  name: string;
  weight: number;
  amount: number;
}

/** Compute the split (no writes). basis month/year use spend on each obra (incl. proofs). */
export async function previewFeeSplit(clientId: string, amount: number, basis: FeeBasis, date: string): Promise<{ rows: FeeSplitPreviewRow[]; error?: string }> {
  const supabase = createClient();
  const { data: projects, error } = await supabase.from("projects").select("id, name").eq("client_id", clientId).eq("kind", "obra").eq("status", "ejecucion").eq("is_archived", false).order("sort_order");
  if (error) return { rows: [], error: error.message };
  if (!projects?.length) return { rows: [], error: "El cliente no tiene obras en ejecución." };

  let weights = new Map<string, number>();
  if (basis === "equal") {
    projects.forEach((p) => weights.set(p.id, 1));
  } else {
    const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
    const pad = (n: number) => String(n).padStart(2, "0");
    let from: string, to: string;
    if (basis === "year") { from = `${y}-01-01`; to = date; }
    else if (basis === "month") { from = `${y}-${pad(m)}-01`; to = date; }
    else { // prev_month: the whole previous month
      const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
      from = `${py}-${pad(pm)}-01`; to = `${py}-${pad(pm)}-${new Date(py, pm, 0).getDate()}`;
    }
    const { data: rows } = await supabase.from("monthly_project_spend").select("project_id, spent").gte("month", from).lte("month", to);
    (rows ?? []).forEach((r) => weights.set(r.project_id, (weights.get(r.project_id) ?? 0) + Number(r.spent)));
    if (!Array.from(weights.values()).some((v) => v > 0)) {
      // nothing spent yet in the period → fall back to equal parts
      weights = new Map(projects.map((p) => [p.id, 1]));
    }
  }
  const total = projects.reduce((s, p) => s + (weights.get(p.id) ?? 0), 0);
  let assigned = 0;
  const out: FeeSplitPreviewRow[] = projects.map((p, i) => {
    const w = weights.get(p.id) ?? 0;
    let a = total ? Math.round((amount * w) / total) : 0;
    if (i === projects.length - 1) a = Math.round(amount - assigned); // last one absorbs rounding
    assigned += a;
    return { project_id: p.id, name: p.name, weight: total ? w / total : 0, amount: a };
  });
  return { rows: out.filter((r) => r.amount > 0 || r.weight > 0) };
}

/** Writes one transaction per obra, linked by split_group. */
export async function createFeeSplit(input: { client_id: string; amount: number; basis: FeeBasis; date: string; account_id: string; note: string }): Promise<{ error?: string; count?: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  if (!input.amount || input.amount <= 0) return { error: "Escribe un monto." };
  const preview = await previewFeeSplit(input.client_id, input.amount, input.basis, input.date);
  if (preview.error) return { error: preview.error };
  const group = crypto.randomUUID();
  const label = input.note.trim() || "Mi pago";
  const rows = preview.rows
    .filter((r) => r.amount > 0)
    .map((r) => ({
      user_id: user.id,
      account_id: input.account_id,
      project_id: r.project_id,
      client_id: null,
      movement_type: "gasto",
      is_fee: true,
      split_group: group,
      amount: -r.amount,
      date: input.date,
      note: `${label} · parte proporcional (${(r.weight * 100).toFixed(0)} %)`,
    }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { error: error.message };
  revalidateAll();
  return { count: rows.length };
}

/** Deletes every line of a prorated fee. */
export async function deleteSplitGroup(group: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("split_group", group);
  if (error) return { error: error.message };
  revalidateAll();
  return { id: group };
}
