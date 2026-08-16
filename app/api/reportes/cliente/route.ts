import { NextResponse, type NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getClient, getClientBalances, getProjects, getProjectTotals, getClientLedger } from "@/lib/queries-caja";
import { ClientReport } from "@/lib/pdf/client-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const client = await getClient(id);
  if (!client) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  const [balances, projects, totals] = await Promise.all([getClientBalances(), getProjects(true), getProjectTotals()]);
  const mine = projects.filter((p) => p.client_id === client.id && !p.is_archived);
  const ledger = await getClientLedger(client.id, mine.map((p) => p.id), 1000);
  const b = balances.find((x) => x.client_id === client.id);
  const tot = new Map(totals.map((t) => [t.project_id, t]));
  const buffer = await renderToBuffer(
    React.createElement(ClientReport, {
      clientName: client.name,
      received: b?.received ?? 0, applied: b?.applied ?? 0, noProj: b?.applied_no_project ?? 0, fees: b?.fees ?? 0, petty: b?.petty_pending ?? 0, loans: b?.loans_out ?? 0,
      projects: mine.map((p) => ({ name: p.name, applied: tot.get(p.id)?.spent ?? 0, budget: p.budget_total })).sort((a, b2) => b2.applied - a.applied),
      ledger,
      ministraciones: ledger.filter((r) => r.movement_type === "ministracion"),
      periodLabel: `Estado de cuenta del fondo · al ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`,
    }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
  );
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="cliente-${client.name}.pdf"` } });
}
