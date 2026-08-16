"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectKind, ProjectStatus } from "@/lib/types";

type Result = { error?: string; id?: string };
const PATHS = ["/caja", "/proyectos", "/personas", "/prestamos", "/arqueo", "/dashboard"];
const reval = () => {
  PATHS.forEach((p) => revalidatePath(p));
  revalidatePath("/proyectos/[id]", "page");
};

async function uid() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/* ---------- projects ---------- */
export interface ProjectInput {
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  client_name?: string;
  client_id?: string | null;
  contract_total?: number | null;
  installment_amount?: number | null;
  budget_total?: number | null;
  notes?: string;
}
export async function upsertProject(id: string | null, input: ProjectInput): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { error: "Sesión expirada." };
  const name = input.name.trim();
  if (!name) return { error: "Escribe un nombre." };
  const row = {
    name,
    kind: input.kind,
    status: input.status,
    client_name: input.client_name?.trim() || null,
    client_id: input.client_id ?? null,
    contract_total: input.contract_total || null,
    installment_amount: input.installment_amount || null,
    budget_total: input.budget_total || null,
    notes: input.notes?.trim() || null,
  };
  if (id) {
    const { error } = await supabase.from("projects").update(row).eq("id", id);
    if (error) return { error: error.message };
    reval();
    return { id };
  }
  const { data, error } = await supabase.from("projects").insert({ user_id: userId, ...row }).select("id").single();
  if (error) return { error: error.message };
  reval();
  return { id: data.id };
}
export async function archiveProject(id: string, archived = true): Promise<Result> {
  const { supabase } = await uid();
  const { error } = await supabase.from("projects").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };
  reval();
  return { id };
}

/* ---------- people ---------- */
export async function upsertPerson(id: string | null, input: { name: string; role?: string; phone?: string; notes?: string }): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { error: "Sesión expirada." };
  const name = input.name.trim();
  if (!name) return { error: "Escribe un nombre." };
  const row = { name, role: input.role?.trim() || null, phone: input.phone?.trim() || null, notes: input.notes?.trim() || null };
  if (id) {
    const { error } = await supabase.from("people").update(row).eq("id", id);
    if (error) return { error: error.message };
    reval();
    return { id };
  }
  const { data, error } = await supabase.from("people").insert({ user_id: userId, ...row }).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe una persona con ese nombre." : error.message };
  reval();
  return { id: data.id };
}

/** Merge person `from` into `to` (moves movements and proofs, archives `from`). Used for "Gabriel = Alejandro". */
export async function mergePeople(fromId: string, toId: string): Promise<Result> {
  const { supabase } = await uid();
  if (fromId === toId) return { error: "Elige dos personas distintas." };
  const a = await supabase.from("transactions").update({ person_id: toId }).eq("person_id", fromId);
  if (a.error) return { error: a.error.message };
  const b = await supabase.from("proofs").update({ person_id: toId }).eq("person_id", fromId);
  if (b.error) return { error: b.error.message };
  const c = await supabase.from("people").update({ is_archived: true }).eq("id", fromId);
  if (c.error) return { error: c.error.message };
  reval();
  return { id: toId };
}

/* ---------- proofs (comprobaciones de caja chica) ---------- */
export async function createProof(input: { person_id: string; project_id: string | null; amount: number; date: string; note: string; category_id?: string | null }): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { error: "Sesión expirada." };
  if (!input.amount || input.amount <= 0) return { error: "Escribe un monto." };
  const { data, error } = await supabase
    .from("proofs")
    .insert({ user_id: userId, person_id: input.person_id, project_id: input.project_id, amount: input.amount, date: input.date, note: input.note.trim() || null, category_id: input.category_id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };
  reval();
  return { id: data.id };
}
export async function deleteProof(id: string): Promise<Result> {
  const { supabase } = await uid();
  const { error } = await supabase.from("proofs").delete().eq("id", id);
  if (error) return { error: error.message };
  reval();
  return { id };
}

/* ---------- cash counts (arqueos) ---------- */
export async function createCashCount(input: { date: string; expected: number; counted: number; note: string; adjust: boolean; account_id: string | null }): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { error: "Sesión expirada." };
  const { data, error } = await supabase
    .from("cash_counts")
    .insert({ user_id: userId, account_id: input.account_id, date: input.date, expected: input.expected, counted: input.counted, note: input.note.trim() || null })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const diff = input.counted - input.expected;
  if (input.adjust && diff !== 0 && input.account_id) {
    const { error: e2 } = await supabase.from("transactions").insert({
      user_id: userId,
      account_id: input.account_id,
      amount: diff,
      date: input.date,
      movement_type: "ajuste",
      note: `Ajuste por arqueo (${diff > 0 ? "sobrante" : "faltante"})`,
    });
    if (e2) return { error: e2.message };
  }
  reval();
  return { id: data.id };
}

/* ---------- clients ---------- */
export async function upsertClient(id: string | null, input: { name: string; notes?: string }): Promise<Result> {
  const { supabase, userId } = await uid();
  if (!userId) return { error: "Sesión expirada." };
  const name = input.name.trim();
  if (!name) return { error: "Escribe un nombre." };
  if (id) {
    const { error } = await supabase.from("clients").update({ name, notes: input.notes?.trim() || null }).eq("id", id);
    if (error) return { error: error.message };
    reval();
    return { id };
  }
  const { data, error } = await supabase.from("clients").insert({ user_id: userId, name, notes: input.notes?.trim() || null }).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un cliente con ese nombre." : error.message };
  reval();
  return { id: data.id };
}
