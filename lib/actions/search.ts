"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";
import { keywordsForEmoji } from "@/lib/icons";
import type { LedgerRow } from "@/lib/queries-caja";
import { MOVEMENT_TYPES } from "@/lib/types";

export interface SearchResult {
  transactions: LedgerRow[];
  people: { id: string; name: string; role: string | null }[];
  projects: { id: string; name: string; kind: string; status: string }[];
  clients: { id: string; name: string }[];
  interpreted: string; // how the query was understood
}

const SELECT = "id, account_id, category_id, project_id, person_id, client_id, split_group, is_fee, covered_by_fee, movement_type, amount, date, note, is_recurring, transfer_account_id, account:accounts!transactions_account_id_fkey(name, type), project:projects(name, kind, color), person:people(name), category:categories(name, icon)";
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
// Emoji detection without unicode-property regex (target es5): first char code point above BMP or in symbol ranges
const isEmoji = (s: string) => { const cp = s.codePointAt(0) ?? 0; return cp > 0x2190 && !/^[A-Za-z0-9$<>\-.,\s]/.test(s); };

/** Global search: concepts, amounts (exact or "mayor a"), people, projects, clients, emojis, movement types. */
export async function searchAll(qRaw: string): Promise<SearchResult> {
  const q = qRaw.trim();
  const supabase = createClient();
  const empty: SearchResult = { transactions: [], people: [], projects: [], clients: [], interpreted: "" };
  if (q.length < 1) return empty;

  // 1) amount query: "1500", "$1,500", ">10000", "<500", "1000-2000"
  const amt = q.replace(/[$,\s]/g, "");
  let txQuery = supabase.from("transactions").select(SELECT).order("date", { ascending: false }).limit(60);
  let interpreted = "";
  const range = amt.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (/^\d+(\.\d+)?$/.test(amt)) {
    const v = Number(amt);
    txQuery = txQuery.or(`amount.eq.${v},amount.eq.${-v}`);
    interpreted = `Movimientos por exactamente $${v.toLocaleString("es-MX")}`;
  } else if (/^>\d+/.test(amt)) {
    const v = Number(amt.slice(1));
    txQuery = txQuery.or(`amount.gte.${v},amount.lte.${-v}`);
    interpreted = `Movimientos mayores a $${v.toLocaleString("es-MX")}`;
  } else if (/^<\d+/.test(amt)) {
    const v = Number(amt.slice(1));
    txQuery = txQuery.gt("amount", -v).lt("amount", v);
    interpreted = `Movimientos menores a $${v.toLocaleString("es-MX")}`;
  } else if (range) {
    const a = Number(range[1]), b = Number(range[2]);
    txQuery = txQuery.or(`and(amount.gte.${a},amount.lte.${b}),and(amount.gte.${-b},amount.lte.${-a})`);
    interpreted = `Movimientos entre $${a.toLocaleString("es-MX")} y $${b.toLocaleString("es-MX")}`;
  } else if (isEmoji(q)) {
    const kws = keywordsForEmoji(q);
    if (!kws.length) return { ...empty, interpreted: "No reconozco ese icono." };
    txQuery = txQuery.or(kws.map((k) => `note.ilike.%${k.replace(/[%_,()]/g, "")}%`).join(","));
    interpreted = `${q} · ${kws.slice(0, 6).join(", ")}${kws.length > 6 ? "…" : ""}`;
  } else {
    const type = MOVEMENT_TYPES.find((t) => t.label.toLowerCase() === q.toLowerCase() || t.id === q.toLowerCase());
    if (type) {
      txQuery = txQuery.eq("movement_type", type.id);
      interpreted = `Tipo: ${type.label}`;
    } else {
      txQuery = txQuery.ilike("note", `%${q.replace(/[%_]/g, "")}%`);
      interpreted = `Conceptos que contienen “${q}”`;
    }
  }

  const [tx, people, projects, clients] = await Promise.all([
    txQuery,
    isEmoji(q) || /^\d/.test(amt) ? Promise.resolve({ data: [] as any[] }) : supabase.from("people").select("id, name, role").ilike("name", `%${q}%`).eq("is_archived", false).limit(10),
    isEmoji(q) || /^\d/.test(amt) ? Promise.resolve({ data: [] as any[] }) : supabase.from("projects").select("id, name, kind, status").ilike("name", `%${q}%`).eq("is_archived", false).limit(10),
    isEmoji(q) || /^\d/.test(amt) ? Promise.resolve({ data: [] as any[] }) : supabase.from("clients").select("id, name").ilike("name", `%${q}%`).eq("is_archived", false).limit(10),
  ]);

  // Also: transactions of matching people / projects (by name) when text search
  let extra: any[] = [];
  const pIds = (people.data ?? []).map((p: any) => p.id);
  const prIds = (projects.data ?? []).map((p: any) => p.id);
  if (pIds.length || prIds.length) {
    const ors = [...pIds.map((id: string) => `person_id.eq.${id}`), ...prIds.map((id: string) => `project_id.eq.${id}`)].join(",");
    const r = await supabase.from("transactions").select(SELECT).or(ors).order("date", { ascending: false }).limit(40);
    extra = r.data ?? [];
  }
  const seen = new Set<string>();
  const rows = [...(tx.data ?? []), ...extra].filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true))).map((r: any) => ({ ...r, amount: Number(r.amount), account: one(r.account), project: one(r.project), person: one(r.person), category: one(r.category) })) as LedgerRow[];
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { transactions: rows.slice(0, 80), people: people.data ?? [], projects: projects.data ?? [], clients: clients.data ?? [], interpreted };
}
