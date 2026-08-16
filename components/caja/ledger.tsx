"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Square, X } from "lucide-react";
import { MovementRow } from "./movement-row";
import { bulkUpdateTransactions, bulkDeleteTransactions } from "@/lib/actions/transactions";
import { dayLabel, todayISO } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import type { LedgerRow } from "@/lib/queries-caja";
import type { Project } from "@/lib/types";

interface Props {
  rows: LedgerRow[];          // oldest first when grouped by day with running balance; any order otherwise
  opening?: number;           // when provided, shows running balance
  groupByDay?: boolean;
  projects?: Project[];       // for bulk "cambiar obra"
  emptyText?: string;
}

const isCash = (r: LedgerRow) => r.account?.type === "cash";
export const cashDelta = (r: LedgerRow) => (isCash(r) ? r.amount : r.transfer_account_id ? -r.amount : 0);

/** Ledger with day grouping, grouped splits and a multi-select mode (change date / obra, delete in bulk). */
export function Ledger({ rows, opening, groupByDay = true, projects = [], emptyText = "Sin movimientos." }: Props) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleMany = (ids: string[]) => setSel((s) => { const n = new Set(s); const all = ids.every((i) => n.has(i)); ids.forEach((i) => (all ? n.delete(i) : n.add(i))); return n; });
  const exit = () => { setSelecting(false); setSel(new Set()); setConfirmDelete(false); };
  const selRows = rows.filter((r) => sel.has(r.id));
  const selTotal = selRows.reduce((s, r) => s + r.amount, 0);

  const days = useMemo(() => {
    const m = new Map<string, LedgerRow[]>();
    rows.forEach((r) => { if (!m.has(r.date)) m.set(r.date, []); m.get(r.date)!.push(r); });
    return Array.from(m.entries());
  }, [rows]);

  function apply(kind: "date" | "project" | "delete") {
    const ids = Array.from(sel);
    start(async () => {
      const res = kind === "delete" ? await bulkDeleteTransactions(ids) : kind === "date" ? await bulkUpdateTransactions(ids, { date }) : await bulkUpdateTransactions(ids, { project_id: projectId || null });
      if (res.error) return setMsg(res.error);
      setMsg(kind === "delete" ? `${res.count} movimientos eliminados (puedes deshacer)` : `${res.count} movimientos actualizados (puedes deshacer)`);
      setTimeout(() => setMsg(null), 3500);
      exit();
      router.refresh();
    });
  }

  const Row = ({ r, running }: { r: LedgerRow; running?: number }) =>
    selecting ? (
      <div className="flex items-center gap-1">
        <button onClick={() => toggle(r.id)} aria-label="Seleccionar" className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", sel.has(r.id) ? "text-accent" : "text-muted-foreground")}>
          {sel.has(r.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>
        <div className={cn("min-w-0 flex-1 rounded-xl", sel.has(r.id) && "bg-accent-soft/60")} onClick={() => toggle(r.id)}>
          <div className="pointer-events-none"><MovementRow row={r} running={running} /></div>
        </div>
      </div>
    ) : (
      <MovementRow row={r} running={running} />
    );

  let running = opening ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-muted-foreground">{rows.length} movimientos</span>
        {rows.length > 0 && (
          selecting ? (
            <div className="flex items-center gap-2 text-[13px]">
              <button onClick={() => toggleMany(rows.map((r) => r.id))} className="font-medium text-accent">{sel.size === rows.length ? "Ninguno" : "Todos"}</button>
              <button onClick={exit} className="grid h-8 w-8 place-items-center rounded-lg bg-card-2" aria-label="Salir de selección"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button onClick={() => setSelecting(true)} className="rounded-lg bg-card-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">Seleccionar</button>
          )
        )}
      </div>
      {msg && <p className="mb-2 text-[13px] text-positive">{msg}</p>}

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground">{emptyText}</p>
      ) : groupByDay ? (
        days.map(([d, list]) => {
          const dIn = list.reduce((s, r) => s + Math.max(cashDelta(r), 0), 0);
          const dOut = list.reduce((s, r) => s + Math.max(-cashDelta(r), 0), 0);
          const out: React.ReactNode[] = [];
          const seen = new Set<string>();
          list.forEach((r) => {
            if (r.split_group && r.amount < 0 && !selecting) {
              if (seen.has(r.split_group)) return;
              seen.add(r.split_group);
              const members = list.filter((x) => x.split_group === r.split_group && x.amount < 0);
              const total = members.reduce((a, x) => a + cashDelta(x), 0);
              const startBal = running;
              members.forEach((x) => { running += cashDelta(x); });
              const label = (r.note ?? "Reparto").replace(/\s*·\s*parte proporcional.*$/i, "");
              out.push(
                <details key={r.split_group}>
                  <summary className="-mx-2 grid cursor-pointer list-none grid-cols-[32px_88px_1fr] items-center gap-2 rounded-xl px-2 py-2 hover:bg-card-2/70 sm:grid-cols-[36px_112px_1fr_96px] sm:gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-card-2 text-[15px] sm:h-9 sm:w-9">{r.is_fee ? "💼" : "⛽"}</span>
                    <span className="text-right text-[14px] font-semibold tabular sm:text-[15px]">{formatMXN(total)}</span>
                    <span className="min-w-0"><span className="block truncate text-[14.5px]">{label}</span><span className="block text-[12px] text-muted-foreground">{r.is_fee ? "Mi pago" : "Gasto compartido"} · repartido en {members.length} obras <span className="text-accent">▸ ver</span></span></span>
                    {opening !== undefined && <span className="hidden text-right text-[12.5px] text-muted-foreground tabular sm:block">{formatMXN(startBal + total)}</span>}
                  </summary>
                  <div className="ml-6 border-l border-border pl-2">{members.map((x) => <MovementRow key={x.id} row={x} />)}</div>
                </details>
              );
              return;
            }
            running += cashDelta(r);
            out.push(<Row key={r.id} r={r} running={opening !== undefined ? running : undefined} />);
          });
          return (
            <section key={d} className="border-t border-border pt-2.5 pb-1 first:border-t-0 first:pt-0">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="text-[15px] font-bold">
                  {selecting && <button onClick={() => toggleMany(list.map((r) => r.id))} className="mr-2 text-[12px] font-medium text-accent">día</button>}
                  {d.slice(-2)} <span className="text-[13px] font-medium text-muted-foreground">{dayLabel(d)}</span>
                </h3>
                <span className="text-[12.5px] text-muted-foreground tabular">{dIn ? `+${formatMXN(dIn)} · ` : ""}{dOut ? `−${formatMXN(dOut)}` : ""}</span>
              </div>
              {out}
            </section>
          );
        })
      ) : (
        rows.map((r) => <Row key={r.id} r={r} />)
      )}

      {/* Bulk action bar */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 px-3 lg:bottom-4 lg:left-[240px] lg:right-4">
          <div className="mx-auto max-w-[900px] rounded-2xl bg-card p-3 shadow-2xl ring-1 ring-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto text-[13.5px] font-semibold">{sel.size} seleccionados <span className="font-normal text-muted-foreground">· {formatMXN(selTotal)}</span></span>
              <label className="flex items-center gap-1.5 text-[13px]"><span className="text-muted-foreground">Fecha</span><input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-lg border border-border bg-card-2 px-2 text-[13px]" /><button disabled={!sel.size || pending} onClick={() => apply("date")} className="h-9 rounded-lg bg-accent px-3 text-[13px] font-semibold text-white disabled:opacity-40">Cambiar fecha</button></label>
              {projects.length > 0 && (
                <label className="flex items-center gap-1.5 text-[13px]"><span className="text-muted-foreground">Obra</span><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 max-w-[160px] rounded-lg border border-border bg-card-2 px-2 text-[13px]"><option value="">Sin proyecto</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button disabled={!sel.size || pending} onClick={() => apply("project")} className="h-9 rounded-lg bg-card-2 px-3 text-[13px] font-semibold disabled:opacity-40">Cambiar obra</button></label>
              )}
              {!confirmDelete ? (
                <button disabled={!sel.size || pending} onClick={() => setConfirmDelete(true)} className="h-9 rounded-lg bg-danger/10 px-3 text-[13px] font-semibold text-danger disabled:opacity-40">Eliminar</button>
              ) : (
                <span className="flex items-center gap-1.5 text-[13px]">¿Eliminar {sel.size}? <button onClick={() => apply("delete")} className="h-9 rounded-lg bg-danger px-3 font-semibold text-white">Sí</button><button onClick={() => setConfirmDelete(false)} className="h-9 rounded-lg bg-card-2 px-3 font-semibold">No</button></span>
              )}
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">Cualquier cambio en bloque se puede revertir con “Deshacer” arriba.</p>
          </div>
        </div>
      )}
    </div>
  );
}
