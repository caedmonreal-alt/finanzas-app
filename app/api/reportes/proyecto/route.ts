import { NextResponse, type NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProject, getProjectTotals, getProjectLedger, getProofs, getMonthlyProjectTotals, getClients } from "@/lib/queries-caja";
import { PROJECT_STATUS_LABEL } from "@/lib/types";
import { ProjectReport } from "@/lib/pdf/project-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  const [totals, ledger, proofs, monthly, clients] = await Promise.all([getProjectTotals(), getProjectLedger(project.id, 1000), getProofs({ projectId: project.id }, 500), getMonthlyProjectTotals(project.id, 12), getClients()]);
  const t = totals.find((x) => x.project_id === project.id);
  const proved = proofs.reduce((s, p) => s + p.amount, 0);
  const byConcept = new Map<string, number>();
  ledger.filter((r) => r.amount < 0 && ["gasto", "pago"].includes(r.movement_type)).forEach((r) => { const k = (r.note || "Sin concepto").trim(); byConcept.set(k, (byConcept.get(k) ?? 0) - r.amount); });
  proofs.forEach((p) => { const k = (p.note || "Comprobación caja chica").trim(); byConcept.set(k, (byConcept.get(k) ?? 0) + p.amount); });
  const buffer = await renderToBuffer(
    React.createElement(ProjectReport, {
      name: project.name, status: PROJECT_STATUS_LABEL[project.status], clientName: clients.find((c) => c.id === project.client_id)?.name ?? null,
      spent: t?.spent ?? 0, proved, budget: project.budget_total, contract: project.contract_total, receivedDirect: t?.received ?? 0,
      ledger, proofs, monthly: monthly.map((m) => ({ month: m.month, expense: m.expense })), topConcepts: Array.from(byConcept.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
    }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
  );
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="obra-${project.name}.pdf"` } });
}
