import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { Doc, Kpi, s, mxn, fdate } from "./base";
import type { LedgerRow } from "@/lib/queries-caja";

/**
 * Client-facing statement. Closed arithmetic:
 *   Recibido = Aplicado por obra (gastos + caja chica entregada) + Contratistas sin obra + Honorarios + Préstamos autorizados + Saldo
 * Nothing personal or from other clients appears here.
 */
interface ObraBlock { name: string; total: number; rows: LedgerRow[] }
interface Props {
  clientName: string;
  received: number;
  obras: ObraBlock[];
  noProjRows: LedgerRow[];
  feeRows: LedgerRow[];
  loanRows: LedgerRow[]; // prestamo (-) and cobro (+) authorized by this client
  ministraciones: LedgerRow[];
  periodLabel: string;
}

const clean = (note: string | null, fallback: string) => (note ?? fallback).replace(/^Mi pago/i, "Honorarios").replace(/\s*·\s*parte proporcional.*$/i, " · parte proporcional");

export function ClientReport({ clientName, received, obras, noProjRows, feeRows, loanRows, ministraciones, periodLabel }: Props) {
  const obrasTotal = obras.reduce((a, o) => a + o.total, 0);
  const noProj = noProjRows.reduce((a, r) => a - r.amount, 0);
  const fees = feeRows.reduce((a, r) => a - r.amount, 0);
  const loans = loanRows.reduce((a, r) => a - r.amount, 0); // net outstanding
  const saldo = received - obrasTotal - noProj - fees - loans;
  const Row = ({ r, showObra }: { r: LedgerRow; showObra?: boolean }) => (
    <View style={s.row}>
      <Text style={[s.cell, s.muted, { width: 64 }]}>{fdate(r.date)}</Text>
      <Text style={[s.cell, { flex: 1 }]}>{clean(r.note, r.movement_type === "caja_chica" ? "Caja chica" : "Gasto")}{r.person && r.movement_type !== "caja_chica" ? ` · ${r.person.name}` : r.movement_type === "caja_chica" && r.person ? ` · entregado a ${r.person.name}` : ""}</Text>
      {showObra && <Text style={[s.cell, s.muted, { width: 100 }]}>{r.project?.name ?? ""}</Text>}
      <Text style={[s.cell, { width: 80, textAlign: "right" }, r.amount > 0 ? s.green : {}]}>{r.amount > 0 ? "+" : ""}{mxn(Math.abs(r.amount) * (r.amount > 0 ? 1 : 1))}</Text>
    </View>
  );
  return (
    <Doc title={`Estado de cuenta · ${clientName}`} subtitle={periodLabel} footer={`Estado de cuenta ${clientName}`}>
      <View style={s.kpis}>
        <Kpi label="Recibido" value={mxn(received)} color="#1a9a3f" />
        <Kpi label="Aplicado" value={mxn(obrasTotal + noProj + fees + loans)} />
        <Kpi label="Saldo del fondo" value={mxn(saldo)} color={saldo >= 0 ? "#1a9a3f" : "#D70015"} />
      </View>

      <Text style={s.h2}>Resumen</Text>
      <View style={s.row}><Text style={[s.cell, { flex: 1 }]}>Ministraciones recibidas</Text><Text style={[s.cell, s.green, s.bold, { width: 90, textAlign: "right" }]}>{mxn(received)}</Text></View>
      {obras.map((o) => (
        <View key={o.name} style={s.row}><Text style={[s.cell, { flex: 1 }]}>- {o.name}</Text><Text style={[s.cell, { width: 90, textAlign: "right" }]}>-{mxn(o.total)}</Text></View>
      ))}
      {noProj > 0 && <View style={s.row}><Text style={[s.cell, { flex: 1 }]}>- Contratistas y pagos sin obra asignada</Text><Text style={[s.cell, { width: 90, textAlign: "right" }]}>-{mxn(noProj)}</Text></View>}
      {fees > 0 && <View style={s.row}><Text style={[s.cell, { flex: 1 }]}>- Honorarios de administración de obra</Text><Text style={[s.cell, { width: 90, textAlign: "right" }]}>-{mxn(fees)}</Text></View>}
      {loans !== 0 && <View style={s.row}><Text style={[s.cell, { flex: 1 }]}>- Préstamos autorizados a terceros (por recuperar)</Text><Text style={[s.cell, { width: 90, textAlign: "right" }]}>-{mxn(loans)}</Text></View>}
      <View style={s.total}><Text style={[s.cell, s.bold, { flex: 1 }]}>= Saldo del fondo</Text><Text style={[s.cell, s.bold, { width: 90, textAlign: "right" }, saldo < 0 ? s.red : {}]}>{mxn(saldo)}</Text></View>
      {saldo < 0 && <Text style={[s.sub, { marginTop: 4 }]}>Saldo negativo: la diferencia fue cubierta por el administrador y se descontará de la siguiente ministración.</Text>}

      <Text style={s.h2}>Ministraciones</Text>
      {ministraciones.length === 0 ? <Text style={[s.cell, s.muted]}>Ninguna en el periodo.</Text> : ministraciones.map((r) => (
        <View key={r.id} style={s.row}><Text style={[s.cell, { width: 90 }]}>{fdate(r.date)}</Text><Text style={[s.cell, { flex: 1 }]}>{r.note ?? "Ministración"}</Text><Text style={[s.cell, s.green, s.bold, { width: 90, textAlign: "right" }]}>+{mxn(r.amount)}</Text></View>
      ))}

      <Text style={s.h2} break>Detalle por obra</Text>
      {obras.map((o) => (
        <View key={o.name} wrap={false}>
          <View style={[s.rowHead, { marginTop: 8 }]}><Text style={[s.th, { flex: 1, fontSize: 9.5, color: "#1D1D1F" }]}>{o.name}</Text><Text style={[s.th, { width: 80, textAlign: "right", fontSize: 9.5, color: "#1D1D1F" }]}>{mxn(o.total)}</Text></View>
          {o.rows.map((r) => <Row key={r.id} r={r} />)}
        </View>
      ))}
      {noProjRows.length > 0 && (
        <View wrap={false}>
          <View style={[s.rowHead, { marginTop: 8 }]}><Text style={[s.th, { flex: 1, fontSize: 9.5, color: "#1D1D1F" }]}>Contratistas y pagos sin obra asignada</Text><Text style={[s.th, { width: 80, textAlign: "right", fontSize: 9.5, color: "#1D1D1F" }]}>{mxn(noProj)}</Text></View>
          {noProjRows.map((r) => <Row key={r.id} r={r} />)}
        </View>
      )}
      {feeRows.length > 0 && (
        <View wrap={false}>
          <View style={[s.rowHead, { marginTop: 8 }]}><Text style={[s.th, { flex: 1, fontSize: 9.5, color: "#1D1D1F" }]}>Honorarios de administración de obra</Text><Text style={[s.th, { width: 80, textAlign: "right", fontSize: 9.5, color: "#1D1D1F" }]}>{mxn(fees)}</Text></View>
          {feeRows.map((r) => <Row key={r.id} r={r} showObra />)}
        </View>
      )}
      {loanRows.length > 0 && (
        <View wrap={false}>
          <View style={[s.rowHead, { marginTop: 8 }]}><Text style={[s.th, { flex: 1, fontSize: 9.5, color: "#1D1D1F" }]}>Préstamos autorizados a terceros</Text><Text style={[s.th, { width: 80, textAlign: "right", fontSize: 9.5, color: "#1D1D1F" }]}>{mxn(loans)}</Text></View>
          {loanRows.map((r) => <Row key={r.id} r={r} />)}
        </View>
      )}
    </Doc>
  );
}
