import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { Doc, Kpi, s, mxn, fdate } from "./base";
import type { LedgerRow } from "@/lib/queries-caja";
import { MOVEMENT_TYPE_LABEL, type MovementType } from "@/lib/types";

interface Props {
  monthLabel: string;
  opening: number;
  rows: LedgerRow[];
  cashDelta: (r: LedgerRow) => number;
  byProject: { name: string; total: number; count: number; color: string }[];
  pending: { name: string; pending: number }[];
  clientsFunds: { name: string; fund: number }[];
}

export function CajaReport({ monthLabel, opening, rows, cashDelta, byProject, pending, clientsFunds }: Props) {
  const tIn = rows.reduce((a, r) => a + Math.max(cashDelta(r), 0), 0);
  const tOut = rows.reduce((a, r) => a + Math.max(-cashDelta(r), 0), 0);
  const closing = opening + tIn - tOut;
  const days = new Map<string, LedgerRow[]>();
  rows.forEach((r) => { if (!days.has(r.date)) days.set(r.date, []); days.get(r.date)!.push(r); });
  let running = opening;
  return (
    <Doc title={`Caja · ${monthLabel}`} subtitle={`Entradas y salidas de efectivo · ${rows.length} movimientos`} footer={`Caja ${monthLabel}`}>
      <View style={s.kpis}>
        <Kpi label="Saldo inicial" value={mxn(opening)} />
        <Kpi label="Entradas" value={"+" + mxn(tIn)} color="#1a9a3f" />
        <Kpi label="Salidas" value={"−" + mxn(tOut)} color="#D70015" />
        <Kpi label="Saldo final" value={mxn(closing)} />
      </View>

      <Text style={s.h2}>Movimientos</Text>
      <View style={s.rowHead}>
        <Text style={[s.th, { width: 70 }]}>Monto</Text>
        <Text style={[s.th, { flex: 1 }]}>Concepto</Text>
        <Text style={[s.th, { width: 110 }]}>Proyecto / tipo</Text>
        <Text style={[s.th, { width: 70, textAlign: "right" }]}>Saldo</Text>
      </View>
      {Array.from(days.entries()).map(([date, list]) => (
        <View key={date} wrap={false}>
          <Text style={s.day}>{date.slice(-2)}  <Text style={[s.muted, { fontFamily: "Helvetica", fontSize: 8.5 }]}>{fdate(date)}</Text></Text>
          {list.map((r) => {
            const d = cashDelta(r);
            running += d;
            const label = r.is_fee ? "Mi pago" : r.split_group ? "Repartido" : r.movement_type !== "gasto" ? MOVEMENT_TYPE_LABEL[r.movement_type as MovementType] : "";
            return (
              <View key={r.id} style={s.row}>
                <Text style={[s.cell, { width: 70 }, d > 0 ? s.green : {}]}>{d > 0 ? "+" : ""}{mxn(d)}</Text>
                <Text style={[s.cell, { flex: 1 }]}>{r.note || label || "Movimiento"}{r.person ? ` · ${r.person.name}` : ""}</Text>
                <Text style={[s.cell, s.muted, { width: 110 }]}>{[r.project?.name, label].filter(Boolean).join(" · ")}</Text>
                <Text style={[s.cell, s.muted, { width: 70, textAlign: "right" }]}>{mxn(running)}</Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={s.total}>
        <Text style={[s.cell, s.bold, { flex: 1 }]}>Saldo final</Text>
        <Text style={[s.cell, s.bold, { width: 70, textAlign: "right" }]}>{mxn(closing)}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 16 }} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Salidas por proyecto</Text>
          {byProject.map((p) => (
            <View key={p.name} style={s.row}>
              <Text style={[s.cell, { flex: 1 }]}>{p.name} <Text style={s.muted}>· {p.count} mov.</Text></Text>
              <Text style={[s.cell, s.bold, { width: 80, textAlign: "right" }]}>{mxn(p.total)}</Text>
              <Text style={[s.cell, s.muted, { width: 36, textAlign: "right" }]}>{tOut ? ((p.total / tOut) * 100).toFixed(0) : 0} %</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Fondos de clientes y pendientes</Text>
          {clientsFunds.map((c) => (
            <View key={c.name} style={s.row}><Text style={[s.cell, { flex: 1 }]}>Fondo de {c.name}</Text><Text style={[s.cell, s.bold, { width: 80, textAlign: "right" }, c.fund < 0 ? s.red : {}]}>{mxn(c.fund)}</Text></View>
          ))}
          {pending.map((p) => (
            <View key={p.name} style={s.row}><Text style={[s.cell, { flex: 1 }]}>Por comprobar · {p.name}</Text><Text style={[s.cell, { width: 80, textAlign: "right", color: "#b56a00" }]}>{mxn(p.pending)}</Text></View>
          ))}
        </View>
      </View>
    </Doc>
  );
}
