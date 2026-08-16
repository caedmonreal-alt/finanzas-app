"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { todayISO } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOVEMENT_TYPES, type Category, type MovementType, type Project, type Person } from "@/lib/types";
import type { AccountBalance } from "@/lib/queries";

export interface EditableTransaction {
  id: string;
  amount: number;
  account_id: string;
  category_id: string | null;
  project_id?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  movement_type?: MovementType;
  date: string;
  note: string | null;
  is_recurring: boolean;
}

interface Props {
  open: boolean;
  initialKind: "expense" | "income";
  edit: EditableTransaction | null;
  categories: Category[];
  accounts: AccountBalance[];
  projects: Project[];
  people: Person[];
  onClose: () => void;
}

const SPENDING_ACCOUNT_TYPES = ["cash", "debit", "credit"];

/**
 * Registro rápido: Salida/Entrada → monto → concepto → proyecto → tipo (→ persona) → Listo.
 * Categoría solo se pide cuando el proyecto es Personal (alimenta el tablero personal).
 */
export function QuickAddSheet({ open, initialKind, edit, categories, accounts, projects, people, onClose }: Props) {
  const router = useRouter();
  const [dir, setDir] = useState<"out" | "in">(initialKind === "income" ? "in" : "out");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [type, setType] = useState<MovementType>("gasto");
  const [personName, setPersonName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [recurring, setRecurring] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const lastProjectRef = useRef<string | null>(null);

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.is_archived && (p.status === "ejecucion" || p.kind !== "obra")).concat(projects.filter((p) => !p.is_archived && p.kind === "obra" && p.status !== "ejecucion")),
    [projects]
  );
  const project = projects.find((p) => p.id === projectId) ?? null;
  const isPersonal = project?.kind === "personal";
  const typeDefs = MOVEMENT_TYPES.filter((t) => t.dir === dir);
  const typeDef = MOVEMENT_TYPES.find((t) => t.id === type);
  const cashAccounts = accounts.filter((a) => a.type === "cash");
  const spendingAccounts = accounts.filter((a) => SPENDING_ACCOUNT_TYPES.includes(a.type)).concat(accounts.filter((a) => !SPENDING_ACCOUNT_TYPES.includes(a.type)));
  const catKind = dir === "in" ? "income" : "expense";
  const visibleCategories = categories.filter((c) => c.kind === catKind);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    if (edit) {
      setDir(edit.amount < 0 ? "out" : "in");
      setAmount(String(Math.abs(edit.amount)));
      setNote(edit.note ?? "");
      setProjectId(edit.project_id ?? null);
      setType(edit.movement_type ?? (edit.amount < 0 ? "gasto" : "otro_ingreso"));
      setPersonName(edit.person_name ?? "");
      setCategoryId(edit.category_id);
      setAccountId(edit.account_id);
      setDate(edit.date);
      setRecurring(edit.is_recurring);
      setMore(true);
    } else {
      setDir(initialKind === "income" ? "in" : "out");
      setAmount("");
      setNote("");
      setProjectId(lastProjectRef.current ?? activeProjects[0]?.id ?? null);
      setType(initialKind === "income" ? "otro_ingreso" : "gasto");
      setPersonName("");
      setCategoryId(null);
      setAccountId((prev) => prev || cashAccounts[0]?.account_id || spendingAccounts[0]?.account_id || "");
      setDate(todayISO());
      setRecurring(false);
      setMore(false);
    }
    setError(null);
    const t = setTimeout(() => amountRef.current?.focus(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, initialKind]);

  // Keep type consistent with direction
  useEffect(() => {
    if (!typeDefs.some((t) => t.id === type)) setType(dir === "in" ? (project?.kind === "obra" ? "ministracion" : project?.name === "Ganado" ? "venta" : "otro_ingreso") : "gasto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir]);

  // Sensible default income type by project
  useEffect(() => {
    if (dir !== "in" || edit) return;
    if (project?.kind === "obra") setType("ministracion");
    else if (project?.name.toLowerCase().includes("ganado")) setType("venta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, dir]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit() {
    const value = Number(amount.replace(/[^0-9.]/g, ""));
    if (!value || value <= 0) {
      setError("Escribe un monto.");
      amountRef.current?.focus();
      return;
    }
    if (!accountId) return setError("Primero crea una cuenta de efectivo en Cuentas.");
    if (typeDef?.needsPerson && !personName.trim()) return setError("Escribe a quién.");
    const input = {
      kind: dir === "in" ? ("income" as const) : ("expense" as const),
      amount: value,
      account_id: accountId,
      category_id: isPersonal ? categoryId : null,
      project_id: projectId,
      person_name: typeDef?.needsPerson ? personName.trim() : null,
      movement_type: type,
      date,
      note,
      is_recurring: recurring,
    };
    start(async () => {
      const res = edit ? await updateTransaction(edit.id, input) : await createTransaction(input);
      if (res.error) return setError(res.error);
      lastProjectRef.current = projectId;
      setToast(`${dir === "out" ? "Salida" : "Entrada"} de ${formatMXN(value)}${note ? ` · ${note}` : ""}${project ? ` · ${project.name}` : ""}`);
      setTimeout(() => setToast(null), 2400);
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!edit) return;
    start(async () => {
      const res = await deleteTransaction(edit.id);
      if (res.error) return setError(res.error);
      setToast("Movimiento eliminado");
      setTimeout(() => setToast(null), 2000);
      onClose();
      router.refresh();
    });
  }

  const chip = (active: boolean) =>
    cn("flex h-10 items-center gap-1.5 rounded-xl bg-card-2 px-3.5 text-[14px] font-medium transition-colors", active && "bg-accent text-white");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 sm:rounded-3xl sm:pb-5"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex rounded-xl bg-card-2 p-1">
                {(["out", "in"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDir(k)}
                    className={cn("h-9 rounded-[10px] px-4 text-[14px] font-semibold text-muted-foreground transition-colors", dir === k && "bg-card text-foreground shadow-card")}
                  >
                    {k === "out" ? "Salida" : "Entrada"}
                  </button>
                ))}
              </div>
              <button aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-baseline justify-center gap-1 py-2">
              <span className="text-[30px] text-muted-foreground">$</span>
              <input
                ref={amountRef}
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                onKeyDown={(e) => e.key === "Enter" && (document.getElementById("qa-note") as HTMLInputElement)?.focus()}
                className={cn("w-[220px] bg-transparent text-[50px] font-bold tracking-tight outline-none tabular placeholder:text-muted-foreground/50", dir === "in" && "text-positive")}
              />
            </div>

            <input
              id="qa-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Concepto (ej. Herrajes, Material Gabriel, Gasolina VW)"
              className="h-11 w-full rounded-xl border border-border bg-card-2 px-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/50"
            />

            <div className="mt-3 text-[12.5px] font-semibold text-muted-foreground">Proyecto</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {activeProjects.map((p) => (
                <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={chip(projectId === p.id)}>
                  {p.name}
                  {p.kind === "obra" && p.status !== "ejecucion" && <span className="text-[11px] opacity-70">· {p.status}</span>}
                </button>
              ))}
            </div>

            <div className="mt-3 text-[12.5px] font-semibold text-muted-foreground">Tipo</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {typeDefs.map((t) => (
                <button key={t.id} type="button" title={t.hint} onClick={() => setType(t.id)} className={chip(type === t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {typeDef?.needsPerson && (
              <>
                <div className="mt-3 text-[12.5px] font-semibold text-muted-foreground">Persona</div>
                <input
                  list="qa-people"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="¿A quién? (se crea si no existe)"
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none focus:ring-2 focus:ring-accent/50"
                />
                <datalist id="qa-people">
                  {people.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </>
            )}

            {isPersonal && (
              <>
                <div className="mt-3 text-[12.5px] font-semibold text-muted-foreground">Categoría personal</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {visibleCategories.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategoryId(c.id)} className={chip(categoryId === c.id)}>
                      {c.icon && <span>{c.icon}</span>}
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button type="button" onClick={() => setMore((v) => !v)} className="mt-3 text-[13px] font-medium text-accent">
              {more ? "Menos opciones" : `Cuenta: ${accounts.find((a) => a.account_id === accountId)?.name ?? "—"} · ${date === todayISO() ? "hoy" : date} · cambiar`}
            </button>
            {more && (
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none" aria-label="Cuenta">
                  {spendingAccounts.length === 0 && <option value="">Sin cuentas</option>}
                  {spendingAccounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none" aria-label="Fecha" />
                <label className="col-span-2 flex h-10 cursor-pointer select-none items-center gap-2 text-[13px] text-muted-foreground">
                  <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-[#0A84FF]" /> Recurrente (se repite cada mes)
                </label>
              </div>
            )}

            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

            <div className="mt-4 flex gap-2.5">
              {edit && (
                <Button variant="secondary" onClick={remove} disabled={pending} className="text-danger">
                  Eliminar
                </Button>
              )}
              <Button onClick={submit} disabled={pending} className="flex-1">
                {pending ? "Guardando…" : edit ? "Guardar cambios" : "Listo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center lg:bottom-8">
          <div className="rounded-2xl bg-foreground px-4 py-3 text-[14px] font-medium text-background shadow-lg animate-in fade-in slide-in-from-bottom-2">{toast}</div>
        </div>
      )}
    </>
  );
}
