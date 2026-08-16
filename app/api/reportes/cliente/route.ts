import { NextResponse, type NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getClient, getProjects, getClientLedger, type LedgerRow } from "@/lib/queries-caja";
import { ClientReport } from "@/lib/pdf/client-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client statement built ONLY from movements that belong to the client's fund:
 * ministraciones, expenses/petty cash of its obras, payments without obra, fee lines, authorized loans.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const client = await getClient(id);
  if (!client) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  const projects = await getProjects(true);
  const mine = projects.filter((p) => p.client_id === client.id);
  const ledger = (await getClientLedger(client.id, mine.map((p) => p.id), 2000)).filter((r) => !r.transfer_account_id && r.movement_type !== "transferencia" && r.movement_type !== "ajuste").sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const ministraciones = ledger.filter((r) => r.movement_type === "ministracion");
  const received = ministraciones.reduce((s, r) => s + r.amount, 0);
  const isFee = (r: LedgerRow) => r.is_fee;
  const isLoan = (r: LedgerRow) => r.movement_type === "prestamo" || r.movement_type === "cobro_prestamo";
  const isObraSpend = (r: LedgerRow) => r.amount < 0 && !r.is_fee && ["gasto", "pago", "caja_chica"].includes(r.movement_type) && !!r.project_id;
  const isNoProj = (r: LedgerRow) => r.amount < 0 && !r.is_fee && ["gasto", "pago", "caja_chica"].includes(r.movement_type) && !r.project_id && !isLoan(r);

  const obras = mine
    .map((p) => { const rows = ledger.filter((r) => r.project_id === p.id && isObraSpend(r)); return { name: p.name, total: rows.reduce((s, r) => s - r.amount, 0), rows }; })
    .filter((o) => o.rows.length)
    .sort((a, b) => b.total - a.total);
  const feeRows = ledger.filter(isFee);
  const noProjRows = ledger.filter(isNoProj);
  const loanRows = ledger.filter((r) => isLoan(r) && r.client_id === client.id);

  const buffer = await renderToBuffer(
    React.createElement(ClientReport, {
      clientName: client.name, received, obras, noProjRows, feeRows, loanRows, ministraciones,
      periodLabel: `Estado de cuenta del fondo · al ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`,
    }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
  );
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="estado-de-cuenta-${client.name}.pdf"` } });
}
