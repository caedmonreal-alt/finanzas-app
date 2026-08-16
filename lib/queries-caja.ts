import { createClient } from "@/lib/supabase/server";
import { monthRange, shiftMonth } from "@/lib/dates";
import type { Project, Person, MovementType, Client } from "@/lib/types";

export interface LedgerRow {
  id: string;
  account_id: string;
  category_id: string | null;
  project_id: string | null;
  person_id: string | null;
  client_id: string | null;
  split_group: string | null;
  is_fee: boolean;
  covered_by_fee: string | null;
  movement_type: MovementType;
  amount: number;
  date: string;
  note: string | null;
  is_recurring: boolean;
  transfer_account_id: string | null;
  account: { name: string; type: string } | null;
  project: { name: string; kind: string; color: string | null } | null;
  person: { name: string } | null;
  category: { name: string; icon: string | null } | null;
}

export interface ProjectTotals {
  project_id: string;
  received: number;
  spent: number;
  petty_given: number;
  sales: number;
  tx_count: number;
  last_date: string | null;
}

export interface PersonBalance {
  person_id: string;
  petty_given: number;
  petty_proved: number;
  payments: number;
  loan_outstanding: number;
  loan_client_outstanding: number;
  loan_own_outstanding: number;
  last_date: string | null;
}

export interface ProofRow {
  id: string;
  person_id: string;
  project_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  project: { name: string } | null;
  person: { name: string } | null;
}

export interface CashCount {
  id: string;
  date: string;
  expected: number;
  counted: number;
  difference: number;
  note: string | null;
}

const num = (v: unknown) => Number(v ?? 0);
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const supabase = createClient();
  let q = supabase.from("projects").select("*").order("sort_order").order("name");
  if (!includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    contract_total: p.contract_total === null ? null : num(p.contract_total),
    installment_amount: p.installment_amount === null ? null : num(p.installment_amount),
    budget_total: p.budget_total === null ? null : num(p.budget_total),
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    contract_total: data.contract_total === null ? null : num(data.contract_total),
    installment_amount: data.installment_amount === null ? null : num(data.installment_amount),
    budget_total: data.budget_total === null ? null : num(data.budget_total),
  };
}

export async function getPeople(): Promise<Person[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("people").select("*").eq("is_archived", false).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProjectTotals(): Promise<ProjectTotals[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("project_totals").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, received: num(r.received), spent: num(r.spent), petty_given: num(r.petty_given), sales: num(r.sales), tx_count: num(r.tx_count) }));
}

export async function getPersonBalances(): Promise<PersonBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("person_balances").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, petty_given: num(r.petty_given), petty_proved: num(r.petty_proved), payments: num(r.payments), loan_outstanding: num(r.loan_outstanding), loan_client_outstanding: num(r.loan_client_outstanding), loan_own_outstanding: num(r.loan_own_outstanding) }));
}

const LEDGER_SELECT =
  "id, account_id, category_id, project_id, person_id, client_id, split_group, is_fee, covered_by_fee, movement_type, amount, date, note, is_recurring, transfer_account_id, account:accounts!transactions_account_id_fkey(name, type), project:projects(name, kind, color), person:people(name), category:categories(name, icon)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLedger(rows: any[]): LedgerRow[] {
  return rows.map((r) => ({
    ...r,
    amount: num(r.amount),
    account: one(r.account),
    project: one(r.project),
    person: one(r.person),
    category: one(r.category),
  })) as LedgerRow[];
}

/** All movements of the month on cash accounts (the "libro de caja"), oldest first */
export async function getCashLedger(monthKey: string): Promise<LedgerRow[]> {
  const supabase = createClient();
  const { start, end } = monthRange(monthKey);
  const { data, error } = await supabase
    .from("transactions")
    .select(LEDGER_SELECT)
    .gte("date", start)
    .lte("date", end)
    .order("date")
    .order("created_at")
    .limit(1000);
  if (error) throw error;
  return mapLedger(data ?? []).filter((r) => r.account?.type === "cash" || (r.transfer_account_id && r.account?.type !== "cash"));
}

export async function getProjectLedger(projectId: string, limit = 300): Promise<LedgerRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(LEDGER_SELECT)
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapLedger(data ?? []);
}

export async function getPersonLedger(personId: string, limit = 200): Promise<LedgerRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(LEDGER_SELECT)
    .eq("person_id", personId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapLedger(data ?? []);
}

export async function getLoans(): Promise<LedgerRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(LEDGER_SELECT)
    .in("movement_type", ["prestamo", "cobro_prestamo"])
    .order("date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return mapLedger(data ?? []);
}

export async function getProofs(filter: { personId?: string; projectId?: string } = {}, limit = 200): Promise<ProofRow[]> {
  const supabase = createClient();
  let q = supabase.from("proofs").select("id, person_id, project_id, amount, date, note, project:projects(name), person:people(name)").order("date", { ascending: false }).limit(limit);
  if (filter.personId) q = q.eq("person_id", filter.personId);
  if (filter.projectId) q = q.eq("project_id", filter.projectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: num(r.amount), project: one(r.project), person: one(r.person) })) as ProofRow[];
}

/** Cash on hand at end of a date (all cash accounts) */
export async function getCashBalanceAt(dateISO: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cash_balance_at", { p_date: dateISO });
  if (error) throw error;
  return num(data);
}

/** Opening balance = cash at the day before the month starts */
export async function getCashOpening(monthKey: string): Promise<number> {
  const prev = monthRange(shiftMonth(monthKey, -1)).end;
  return getCashBalanceAt(prev);
}

export async function getCashCounts(limit = 12): Promise<CashCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cash_counts").select("id, date, expected, counted, difference, note").order("date", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, expected: num(r.expected), counted: num(r.counted), difference: num(r.difference) }));
}

export async function getMonthlyProjectTotals(projectId: string, months = 6) {
  const supabase = createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  const { data, error } = await supabase
    .from("monthly_project_totals")
    .select("month, income, expense, petty_given")
    .eq("project_id", projectId)
    .gte("month", `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`)
    .order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: r.month as string, income: num(r.income), expense: num(r.expense), petty_given: num(r.petty_given) }));
}

export interface ClientBalance {
  client_id: string;
  received: number;
  applied: number;
  petty_pending: number;
  applied_no_project: number;
  loans_out: number;
  fees: number;
  last_date: string | null;
}
export interface ClientProjectTotal {
  client_id: string;
  project_id: string;
  applied: number;
  received_direct: number;
}

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("clients").select("*").eq("is_archived", false).order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, monthly_fee: c.monthly_fee === null ? null : num(c.monthly_fee) }));
}
export async function getClientBalances(): Promise<ClientBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("client_balances").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, received: num(r.received), applied: num(r.applied), petty_pending: num(r.petty_pending), applied_no_project: num(r.applied_no_project), loans_out: num(r.loans_out), fees: num(r.fees) }));
}
export async function getClientProjectTotals(): Promise<ClientProjectTotal[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("client_project_totals").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, applied: num(r.applied), received_direct: num(r.received_direct) }));
}

export interface ProjectMonthSpend { project_id: string; month: string; spent: number; fees: number }
/** Monthly spend (incl. proofs and fees) for all projects in a year */
export async function getYearProjectSpend(year: number): Promise<ProjectMonthSpend[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("monthly_project_spend").select("project_id, month, spent, fees").gte("month", `${year}-01-01`).lte("month", `${year}-12-31`);
  if (error) throw error;
  return (data ?? []).map((r) => ({ project_id: r.project_id, month: r.month, spent: num(r.spent), fees: num(r.fees) }));
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
/** Ledger of a client: explicit client_id rows + rows of its projects. */
export async function getClientLedger(clientId: string, projectIds: string[], limit = 400): Promise<LedgerRow[]> {
  const supabase = createClient();
  const a = supabase.from("transactions").select(LEDGER_SELECT).eq("client_id", clientId).order("date", { ascending: false }).limit(limit);
  const b = projectIds.length ? supabase.from("transactions").select(LEDGER_SELECT).in("project_id", projectIds).is("client_id", null).order("date", { ascending: false }).limit(limit) : Promise.resolve({ data: [], error: null });
  const [ra, rb] = await Promise.all([a, b]);
  if (ra.error) throw ra.error;
  if (rb.error) throw rb.error;
  const rows = mapLedger([...(ra.data ?? []), ...(rb.data ?? [])]);
  rows.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
  return rows;
}
export async function getMonthlyClientReceived(clientId: string, months = 12) {
  const supabase = createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  const { data, error } = await supabase.from("monthly_client_received").select("month, received").eq("client_id", clientId).gte("month", `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`).order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: r.month as string, received: num(r.received) }));
}
export async function getMonthlySpendForProjects(projectIds: string[], months = 12): Promise<ProjectMonthSpend[]> {
  if (!projectIds.length) return [];
  const supabase = createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  const { data, error } = await supabase.from("monthly_project_spend").select("project_id, month, spent, fees").in("project_id", projectIds).gte("month", `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`);
  if (error) throw error;
  return (data ?? []).map((r) => ({ project_id: r.project_id, month: r.month, spent: num(r.spent), fees: num(r.fees) }));
}

export interface MonthlyFee { month: string; fee: number; covered: number; uncovered: number }
export async function getMonthlyFee(months = 12): Promise<MonthlyFee[]> {
  const supabase = createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1), 1);
  const { data, error } = await supabase.from("monthly_fee").select("month, fee, covered, uncovered").gte("month", `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`).order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: r.month as string, fee: num(r.fee), covered: num(r.covered), uncovered: num(r.uncovered) }));
}
/** Total personal/own draws not yet deducted from any fee (all time) */
export async function getUncoveredDrawsTotal(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.from("monthly_fee").select("uncovered");
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + num(r.uncovered), 0);
}

/** Concepts you register often (last 60 days) that don't appear in the last 7 days — hints for a cash shortfall. */
export async function getMissingUsualConcepts(): Promise<string[]> {
  const supabase = createClient();
  const d60 = new Date(); d60.setDate(d60.getDate() - 60);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const { data } = await supabase.from("transactions").select("note, date").lt("amount", 0).gte("date", iso(d60)).not("note", "is", null).limit(2000);
  const norm = (n: string) => n.toLowerCase().replace(/\s*·.*$/, "").replace(/\d+/g, "").trim().split(" ").slice(0, 2).join(" ");
  const counts = new Map<string, number>(); const recent = new Set<string>();
  (data ?? []).forEach((r) => { const k = norm(r.note ?? ""); if (!k) return; counts.set(k, (counts.get(k) ?? 0) + 1); if (r.date >= iso(d7)) recent.add(k); });
  return Array.from(counts.entries()).filter(([k, c]) => c >= 3 && !recent.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
}
