import { NextResponse, type NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCashLedger, getCashOpening, getProjects, getPersonBalances, getPeople, getClients, getClientBalances } from "@/lib/queries-caja";
import { parseMonthKey, monthLabel } from "@/lib/dates";
import { projectColor } from "@/lib/project-colors";
import { CajaReport } from "@/lib/pdf/caja-report";
import type { LedgerRow } from "@/lib/queries-caja";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { year, month } = parseMonthKey(req.nextUrl.searchParams.get("mes"));
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const [rows, opening, projects, balances, people, clients, clientBalances] = await Promise.all([getCashLedger(key), getCashOpening(key), getProjects(), getPersonBalances(), getPeople(), getClients(), getClientBalances()]);
  const colorOf = projectColor(projects);
  const isCash = (r: LedgerRow) => r.account?.type === "cash";
  const cashDelta = (r: LedgerRow) => (isCash(r) ? r.amount : r.transfer_account_id ? -r.amount : 0);
  const byProject = new Map<string, { name: string; total: number; count: number; color: string }>();
  rows.forEach((r) => {
    const d = cashDelta(r);
    if (d >= 0 || r.transfer_account_id) return;
    const id = r.project_id ?? "none";
    const cur = byProject.get(id) ?? { name: r.project?.name ?? "Sin proyecto", total: 0, count: 0, color: r.project_id ? colorOf(r.project_id) : "#8E8E93" };
    cur.total += -d; cur.count += 1; byProject.set(id, cur);
  });
  const pending = balances.filter((b) => b.petty_given - b.petty_proved > 0.005).map((b) => ({ name: people.find((p) => p.id === b.person_id)?.name ?? "—", pending: b.petty_given - b.petty_proved }));
  const clientsFunds = clients.map((c) => { const b = clientBalances.find((x) => x.client_id === c.id); return { name: c.name, fund: b ? b.received - b.applied - b.petty_pending - b.loans_out : 0 }; });

  const buffer = await renderToBuffer(
    React.createElement(CajaReport, { monthLabel: monthLabel(key), opening, rows, cashDelta, byProject: Array.from(byProject.values()).sort((a, b) => b.total - a.total), pending, clientsFunds }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="caja-${key}.pdf"` },
  });
}
