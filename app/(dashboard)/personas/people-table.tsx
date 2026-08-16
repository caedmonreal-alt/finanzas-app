"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createProof, upsertPerson, mergePeople } from "@/lib/actions/caja";
import { todayISO } from "@/lib/dates";
import { formatMXN, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import type { Person, Project } from "@/lib/types";

interface Row { person: Person; petty_given: number; petty_proved: number; payments: number; loan: number; last: string | null }

export function PeopleTable({ rows, projects }: { rows: Row[]; projects: Project[] }) {
  const router = useRouter();
  const { openNew } = useQuickAdd();
  const [pending, start] = useTransition();
  const [proofFor, setProofFor] = useState<Row | null>(null);
  const [editFor, setEditFor] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // proof form
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState<string>("");
  // person form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [mergeInto, setMergeInto] = useState("");

  const sorted = rows.slice().sort((a, b) => (b.petty_given - b.petty_proved) - (a.petty_given - a.petty_proved) || b.loan - a.loan);
  const obras = projects.filter((p) => p.kind === "obra" && p.status === "ejecucion").concat(projects.filter((p) => !(p.kind === "obra" && p.status === "ejecucion")));

  function openProof(r: Row) { setProofFor(r); setAmount(""); setNote(""); setDate(todayISO()); setProjectId(obras[0]?.id ?? ""); setError(null); }
  function saveProof() {
    if (!proofFor) return;
    const v = Number(amount.replace(/[^0-9.]/g, ""));
    if (!v) return setError("Escribe el monto comprobado.");
    start(async () => {
      const res = await createProof({ person_id: proofFor.person.id, project_id: projectId || null, amount: v, date, note });
      if (res.error) return setError(res.error);
      setProofFor(null);
      router.refresh();
    });
  }
  function openEdit(r: Row) { setEditFor(r); setName(r.person.name); setRole(r.person.role ?? ""); setMergeInto(""); setError(null); }
  function savePerson() {
    start(async () => {
      const res = await upsertPerson(editFor?.person.id ?? null, { name, role });
      if (res.error) return setError(res.error);
      setEditFor(null); setNewOpen(false); router.refresh();
    });
  }
  function doMerge() {
    if (!editFor || !mergeInto) return;
    start(async () => {
      const res = await mergePeople(editFor.person.id, mergeInto);
      if (res.error) return setError(res.error);
      setEditFor(null); router.refresh();
    });
  }

  return (
    <>
      <div className="mb-3 flex justify-end"><Button size="sm" variant="secondary" onClick={() => { setNewOpen(true); setName(""); setRole(""); setError(null); }}>+ Persona</Button></div>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-muted-foreground">Aún no hay personas. Se crean solas al registrar caja chica, pagos o préstamos.</p>
      ) : (
        <>
        {/* Mobile: cards */}
        <ul className="sm:hidden divide-y divide-border">
          {sorted.map((r) => {
            const pend = r.petty_given - r.petty_proved;
            return (
              <li key={r.person.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openEdit(r)} className="min-w-0 text-left">
                    <div className="truncate text-[15px] font-semibold">{r.person.name}</div>
                    <div className="text-[12px] text-muted-foreground">{r.person.role ?? ""}{r.last ? `${r.person.role ? " · " : ""}último ${formatDate(r.last)}` : ""}</div>
                  </button>
                  {pend > 0.005 ? <span className="shrink-0 rounded-md bg-warning/15 px-2 py-0.5 text-[14px] font-semibold text-warning tabular">{formatMXN(pend)}</span> : r.petty_given ? <span className="shrink-0 rounded-md bg-positive/15 px-2 py-0.5 text-[12px] font-semibold text-positive">al corriente</span> : null}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-muted-foreground">
                  {r.petty_given > 0 && <span>Entregado <b className="text-foreground tabular">{formatMXN(r.petty_given)}</b></span>}
                  {r.petty_proved > 0 && <span>Comprobado <b className="text-foreground tabular">{formatMXN(r.petty_proved)}</b></span>}
                  {r.payments > 0 && <span>Pagos <b className="text-foreground tabular">{formatMXN(r.payments)}</b></span>}
                  {r.loan > 0.005 && <span>Me debe <b className="text-danger tabular">{formatMXN(r.loan)}</b></span>}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => openProof(r)} className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-white">Comprobar</button>
                  <button onClick={() => openNew("expense")} className="rounded-lg bg-card-2 px-3 py-1.5 text-[13px] font-semibold">+ Entregar</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden sm:block overflow-x-auto -mx-2 px-2">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] text-muted-foreground">
                <th className="py-1.5 pr-2 font-semibold">Persona</th>
                <th className="py-1.5 px-2 text-right font-semibold">Entregado</th>
                <th className="py-1.5 px-2 text-right font-semibold">Comprobado</th>
                <th className="py-1.5 px-2 text-right font-semibold">Por comprobar</th>
                <th className="py-1.5 px-2 text-right font-semibold hidden sm:table-cell">Pagos</th>
                <th className="py-1.5 px-2 text-right font-semibold hidden sm:table-cell">Me debe</th>
                <th className="py-1.5 pl-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((r) => {
                const pend = r.petty_given - r.petty_proved;
                return (
                  <tr key={r.person.id}>
                    <td className="py-2.5 pr-2">
                      <button onClick={() => openEdit(r)} className="text-left">
                        <div className="font-semibold">{r.person.name}</div>
                        <div className="text-[12px] text-muted-foreground">{r.person.role ?? ""}{r.last ? `${r.person.role ? " · " : ""}último ${formatDate(r.last)}` : ""}</div>
                      </button>
                    </td>
                    <td className="px-2 text-right tabular">{r.petty_given ? formatMXN(r.petty_given) : "—"}</td>
                    <td className="px-2 text-right tabular">{r.petty_proved ? formatMXN(r.petty_proved) : "—"}</td>
                    <td className="px-2 text-right tabular">
                      {pend > 0.005 ? <span className="rounded-md bg-warning/15 px-2 py-0.5 font-semibold text-warning">{formatMXN(pend)}</span> : r.petty_given ? <span className="rounded-md bg-positive/15 px-2 py-0.5 text-[12px] font-semibold text-positive">al corriente</span> : "—"}
                    </td>
                    <td className="px-2 text-right tabular hidden sm:table-cell">{r.payments ? formatMXN(r.payments) : "—"}</td>
                    <td className="px-2 text-right tabular hidden sm:table-cell">{r.loan > 0.005 ? <span className="rounded-md bg-danger/10 px-2 py-0.5 font-semibold text-danger">{formatMXN(r.loan)}</span> : "—"}</td>
                    <td className="pl-2 text-right whitespace-nowrap">
                      <button onClick={() => openProof(r)} className="rounded-lg bg-card-2 px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-accent hover:text-white">Comprobar</button>
                      <button onClick={() => openNew("expense")} className="ml-1 rounded-lg bg-card-2 px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-card-2/70" title="Entregar más caja chica">+ Entregar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Proof sheet */}
      {proofFor && (
        <Sheet title={`Comprobación de ${proofFor.person.name}`} onClose={() => setProofFor(null)}>
          <p className="text-[13px] text-muted-foreground">Por comprobar: <b className="text-foreground">{formatMXN(proofFor.petty_given - proofFor.petty_proved)}</b>. Registra los tickets que te entregó; no mueve efectivo, solo baja lo pendiente y carga el gasto a la obra.</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5"><Label>Monto comprobado</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus /></div>
            <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="mt-2.5 space-y-1.5"><Label>Obra / proyecto</Label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card-2 px-3 text-[14px]">
              <option value="">Sin proyecto</option>
              {obras.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mt-2.5 space-y-1.5"><Label>Concepto</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Material, herramienta, fletes…" /></div>
          {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
          <Button className="mt-4 w-full" onClick={saveProof} disabled={pending}>{pending ? "Guardando…" : "Registrar comprobación"}</Button>
        </Sheet>
      )}

      {/* Person edit / new */}
      {(editFor || newOpen) && (
        <Sheet title={editFor ? "Editar persona" : "Nueva persona"} onClose={() => { setEditFor(null); setNewOpen(false); }}>
          <div className="space-y-2.5">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Rol (opcional)</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Encargado, contratista tablaroca, proveedor…" /></div>
            {editFor && rows.length > 1 && (
              <div className="rounded-2xl bg-card-2 p-3">
                <div className="text-[13px] font-semibold">¿Es la misma persona que otra?</div>
                <p className="text-[12.5px] text-muted-foreground">Sus movimientos y comprobaciones se pasan a la otra y esta se archiva.</p>
                <div className="mt-2 flex gap-2">
                  <select value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-[14px]">
                    <option value="">Elegir…</option>
                    {rows.filter((r) => r.person.id !== editFor.person.id).map((r) => <option key={r.person.id} value={r.person.id}>{r.person.name}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" onClick={doMerge} disabled={!mergeInto || pending}>Unir</Button>
                </div>
              </div>
            )}
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button className="w-full" onClick={savePerson} disabled={pending || !name.trim()}>Guardar</Button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
