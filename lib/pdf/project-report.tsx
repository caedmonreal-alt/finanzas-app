import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { Doc, Kpi, s, mxn } from "./base";
import type { LedgerRow, ProofRow } from "@/lib/queries-caja";
import { MOVEMENT_TYPE_LABEL, type MovementType } from "@/lib/types";

interface Props {
  name: string; status: string; clientName: string | null;
  spent: number; proved: number; budget: number | null; contract: number | null; receivedDirect: number;
  ledger: LedgerRow[]; proofs: ProofRow[];
  monthly: { month: string; expense: number }[];
  topConcepts: [string, number][];
}

export function ProjectReport({ name, status, clientName, spent, proved, budget, contract, ledger, proofs, monthly, topConcepts }: Props) {
  const pct = budget ? (spent / budget) * 100 : null;
  return (
    <Doc title={name} subtitle={`${status}${clientName ? ` · Cliente: ${clientName}` : ""}`} footer={`Obra ${name}`}>
      <View style={s.kpis}>
        <Kpi label="Gastado" value={mxn(spent)} />
        <Kpi label="Presupuesto" value={budget ? mxn(budget) : "—"} />
        <Kpi label="Avance" value={pct === null ? "—" : `${pct.toFixed(0)} %`} color={pct !== null && pct > 100 ? "#D70015" : undefined} />
        <Kpi label="Contratado" value={contract ? mxn(contract) : "—"} />
      </View>
      {budget ? <Text style={[s.sub, { marginTop: 8 }]}>{spent <= budget ? `Vas ${mxn(budget - spent)} por debajo del presupuesto.` : `Vas ${mxn(spent - budget)} por encima del presupuesto.`}{contract && spent > 0 ? ` Margen actual: ${mxn(contract - spent)} (${(((contract - spent) / contract) * 100).toFixed(0)} % del contrato).` : ""}</Text> : null}

      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Gasto por mes</Text>
          {monthly.map((m) => (
            <View key={m.month} style={s.row}><Text style={[s.cell, { flex: 1 }]}>{new Date(m.month + "T12:00:00").toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</Text><Text style={[s.cell, s.bold, { width: 80, textAlign: "right" }]}>{mxn(m.expense)}</Text></View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Mayores conceptos</Text>
          {topConcepts.map(([c, v]) => (
            <View key={c} style={s.row}><Text style={[s.cell, { flex: 1 }]}>{c}</Text><Text style={[s.cell, s.bold, { width: 80, textAlign: "right" }]}>{mxn(v)}</Text></View>
          ))}
        </View>
      </View>

      <Text style={s.h2} break>Movimientos</Text>
      <View style={s.rowHead}><Text style={[s.th, { width: 60 }]}>Fecha</Text><Text style={[s.th, { flex: 1 }]}>Concepto</Text><Text style={[s.th, { width: 100 }]}>Tipo</Text><Text style={[s.th, { width: 80, textAlign: "right" }]}>Monto</Text></View>
      {ledger.map((r) => {
        const label = r.is_fee ? "Mi pago" : r.split_group ? "Repartido" : MOVEMENT_TYPE_LABEL[r.movement_type as MovementType];
        return (
          <View key={r.id} style={s.row}>
            <Text style={[s.cell, s.muted, { width: 60 }]}>{r.date.slice(8)}/{r.date.slice(5, 7)}/{r.date.slice(2, 4)}</Text>
            <Text style={[s.cell, { flex: 1 }]}>{r.note || label}{r.person ? ` · ${r.person.name}` : ""}</Text>
            <Text style={[s.cell, s.muted, { width: 100 }]}>{label}</Text>
            <Text style={[s.cell, { width: 80, textAlign: "right" }, r.amount > 0 ? s.green : {}]}>{r.amount > 0 ? "+" : ""}{mxn(r.amount)}</Text>
          </View>
        );
      })}
      {proofs.length > 0 && (
        <>
          <Text style={s.h2}>Comprobaciones de caja chica ({mxn(proved)})</Text>
          {proofs.map((p) => (
            <View key={p.id} style={s.row}><Text style={[s.cell, s.muted, { width: 60 }]}>{p.date.slice(8)}/{p.date.slice(5, 7)}/{p.date.slice(2, 4)}</Text><Text style={[s.cell, { flex: 1 }]}>{p.note || "Comprobación"} · {p.person?.name}</Text><Text style={[s.cell, { width: 80, textAlign: "right" }]}>{mxn(p.amount)}</Text></View>
          ))}
        </>
      )}
    </Doc>
  );
}
