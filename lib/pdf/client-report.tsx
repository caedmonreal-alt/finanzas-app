import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { Doc, Kpi, s, mxn, fdate } from "./base";
import type { LedgerRow } from "@/lib/queries-caja";
import { MOVEMENT_TYPE_LABEL, type MovementType } from "@/lib/types";

interface Props {
  clientName: string;
  received: number; applied: number; noProj: number; fees: number; petty: number; loans: number;
  projects: { name: string; applied: number; budget: number | null }[];
  ledger: LedgerRow[];
  ministraciones: LedgerRow[];
  periodLabel: string;
}

export function ClientReport({ clientName, received, applied, noProj, fees, petty, loans, projects, ledger, ministraciones, periodLabel }: Props) {
  const obras = applied - noProj - fees;
  const saldo = received - applied - petty - loans;
  const lines: [string, number, boolean?][] = [["Recibido (ministraciones)", received, true], ["− Aplicado a obras", -obras], ["− Contratistas sin obra", -noProj], ["− Mi pago", -fees], ["− Caja chica sin comprobar", -petty], ["− Prestado por cobrar (autorizado)", -loans]];
  return (
    <Doc title={`Estado de cuenta · ${clientName}`} subtitle={periodLabel} footer={`Estado de cuenta ${clientName}`}>
      <View style={s.kpis}>
        <Kpi label="Recibido" value={mxn(received)} color="#1a9a3f" />
        <Kpi label="Aplicado" value={mxn(applied + petty + loans)} />
        <Kpi label="Saldo del fondo" value={mxn(saldo)} color={saldo >= 0 ? "#1a9a3f" : "#D70015"} />
      </View>
      <Text style={s.h2}>Resumen</Text>
      {lines.filter(([, v]) => v !== 0).map(([l, v, g]) => (
        <View key={l} style={s.row}><Text style={[s.cell, { flex: 1 }]}>{l}</Text><Text style={[s.cell, { width: 90, textAlign: "right" }, g ? s.green : {}]}>{mxn(v)}</Text></View>
      ))}
      <View style={s.total}><Text style={[s.cell, s.bold, { flex: 1 }]}>= Saldo del fondo</Text><Text style={[s.cell, s.bold, { width: 90, textAlign: "right" }, saldo < 0 ? s.red : {}]}>{mxn(saldo)}{saldo < 0 ? "  (puesto de mi bolsa)" : ""}</Text></View>

      <Text style={s.h2}>Aplicado por obra</Text>
      <View style={s.rowHead}><Text style={[s.th, { flex: 1 }]}>Obra</Text><Text style={[s.th, { width: 90, textAlign: "right" }]}>Aplicado</Text><Text style={[s.th, { width: 60, textAlign: "right" }]}>% recibido</Text><Text style={[s.th, { width: 100, textAlign: "right" }]}>Presupuesto</Text></View>
      {projects.map((p) => (
        <View key={p.name} style={s.row}>
          <Text style={[s.cell, { flex: 1 }]}>{p.name}</Text>
          <Text style={[s.cell, s.bold, { width: 90, textAlign: "right" }]}>{mxn(p.applied)}</Text>
          <Text style={[s.cell, s.muted, { width: 60, textAlign: "right" }]}>{received ? ((p.applied / received) * 100).toFixed(0) : 0} %</Text>
          <Text style={[s.cell, s.muted, { width: 100, textAlign: "right" }]}>{p.budget ? `${((p.applied / p.budget) * 100).toFixed(0)} % de ${mxn(p.budget)}` : "—"}</Text>
        </View>
      ))}

      <Text style={s.h2}>Ministraciones</Text>
      {ministraciones.length === 0 ? <Text style={[s.cell, s.muted]}>Ninguna en el periodo.</Text> : ministraciones.map((r) => (
        <View key={r.id} style={s.row}><Text style={[s.cell, { width: 90 }]}>{fdate(r.date)}</Text><Text style={[s.cell, { flex: 1 }]}>{r.note ?? "Ministración"}</Text><Text style={[s.cell, s.green, s.bold, { width: 90, textAlign: "right" }]}>+{mxn(r.amount)}</Text></View>
      ))}

      <Text style={s.h2} break>Movimientos del fondo</Text>
      <View style={s.rowHead}><Text style={[s.th, { width: 60 }]}>Fecha</Text><Text style={[s.th, { flex: 1 }]}>Concepto</Text><Text style={[s.th, { width: 110 }]}>Obra / tipo</Text><Text style={[s.th, { width: 80, textAlign: "right" }]}>Monto</Text></View>
      {ledger.map((r) => {
        const label = r.is_fee ? "Mi pago" : r.split_group ? "Repartido" : r.movement_type !== "gasto" ? MOVEMENT_TYPE_LABEL[r.movement_type as MovementType] : "";
        return (
          <View key={r.id} style={s.row}>
            <Text style={[s.cell, s.muted, { width: 60 }]}>{r.date.slice(8)}/{r.date.slice(5, 7)}/{r.date.slice(2, 4)}</Text>
            <Text style={[s.cell, { flex: 1 }]}>{r.note || label || "Movimiento"}{r.person ? ` · ${r.person.name}` : ""}</Text>
            <Text style={[s.cell, s.muted, { width: 110 }]}>{[r.project?.name, label].filter(Boolean).join(" · ")}</Text>
            <Text style={[s.cell, { width: 80, textAlign: "right" }, r.amount > 0 ? s.green : {}]}>{r.amount > 0 ? "+" : ""}{mxn(r.amount)}</Text>
          </View>
        );
      })}
    </Doc>
  );
}
