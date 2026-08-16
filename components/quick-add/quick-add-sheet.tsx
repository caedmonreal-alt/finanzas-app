"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { todayISO } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import type { AccountBalance } from "@/lib/queries";

export interface EditableTransaction {
  id: string;
  amount: number;
  account_id: string;
  category_id: string | null;
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
  onClose: () => void;
}

const SPENDING_ACCOUNT_TYPES = ["cash", "debit", "credit"];

/**
 * Bottom sheet on mobile / centered dialog on desktop.
 * Flow: monto → categoría → Listo. Cuenta, fecha y nota son opcionales (con defaults).
 */
export function QuickAddSheet({ open, initialKind, edit, categories, accounts, onClose }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"expense" | "income">(initialKind);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const lastCategoryRef = useRef<Record<string, string | null>>({ expense: null, income: null });

  const visibleCategories = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);
  const spendingAccounts = useMemo(
    () => accounts.filter((a) => SPENDING_ACCOUNT_TYPES.includes(a.type)).concat(accounts.filter((a) => !SPENDING_ACCOUNT_TYPES.includes(a.type))),
    [accounts]
  );

  // Reset the form each time the sheet opens
  useEffect(() => {
    if (!open) return;
    if (edit) {
      setKind(edit.amount < 0 ? "expense" : "income");
      setAmount(String(Math.abs(edit.amount)));
      setCategoryId(edit.category_id);
      setAccountId(edit.account_id);
      setDate(edit.date);
      setNote(edit.note ?? "");
      setRecurring(edit.is_recurring);
    } else {
      setKind(initialKind);
      setAmount("");
      setCategoryId(lastCategoryRef.current[initialKind] ?? categories.find((c) => c.kind === initialKind)?.id ?? null);
      setAccountId((prev) => prev || spendingAccounts[0]?.account_id || "");
      setDate(todayISO());
      setNote("");
      setRecurring(false);
    }
    setError(null);
    const t = setTimeout(() => amountRef.current?.focus(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, initialKind]);

  // When kind changes, pick a sensible category
  useEffect(() => {
    if (!open) return;
    if (!visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId(lastCategoryRef.current[kind] ?? visibleCategories[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
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
    if (!accountId) {
      setError("Primero agrega una cuenta en la sección Cuentas.");
      return;
    }
    const input = { kind, amount: value, account_id: accountId, category_id: categoryId, date, note, is_recurring: recurring };
    start(async () => {
      const res = edit ? await updateTransaction(edit.id, input) : await createTransaction(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      lastCategoryRef.current[kind] = categoryId;
      const catName = categories.find((c) => c.id === categoryId)?.name ?? "Sin categoría";
      setToast(`${kind === "expense" ? "Gasto" : "Ingreso"} de ${formatMXN(value)} · ${catName}`);
      setTimeout(() => setToast(null), 2200);
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!edit) return;
    start(async () => {
      const res = await deleteTransaction(edit.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setToast("Movimiento eliminado");
      setTimeout(() => setToast(null), 2000);
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={edit ? "Editar movimiento" : "Registrar movimiento"}
            className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 sm:rounded-3xl sm:pb-5"
          >
            {/* Header: kind toggle + close */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex rounded-xl bg-card-2 p-1">
                {(["expense", "income"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "h-9 rounded-[10px] px-4 text-[14px] font-semibold text-muted-foreground transition-colors",
                      kind === k && "bg-card text-foreground shadow-card"
                    )}
                  >
                    {k === "expense" ? "Gasto" : "Ingreso"}
                  </button>
                ))}
              </div>
              <button aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount */}
            <div className="flex items-baseline justify-center gap-1 py-3">
              <span className="text-[32px] text-muted-foreground">$</span>
              <input
                ref={amountRef}
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                className={cn(
                  "w-[220px] bg-transparent text-[52px] font-bold tracking-tight outline-none tabular placeholder:text-muted-foreground/50",
                  kind === "income" && "text-positive"
                )}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-xl bg-card-2 px-3.5 text-[14px] font-medium transition-colors",
                    categoryId === c.id && "bg-accent text-white"
                  )}
                >
                  {c.icon && <span>{c.icon}</span>}
                  {c.name}
                </button>
              ))}
              {visibleCategories.length === 0 && (
                <p className="text-[13px] text-muted-foreground">No hay categorías de este tipo. Créalas en Presupuestos.</p>
              )}
            </div>

            {/* Account · date */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none focus:ring-2 focus:ring-accent/50"
                aria-label="Cuenta"
              >
                {spendingAccounts.length === 0 && <option value="">Sin cuentas</option>}
                {spendingAccounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none focus:ring-2 focus:ring-accent/50"
                aria-label="Fecha"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Nota (opcional)"
                className="h-11 flex-1 rounded-xl border border-border bg-card-2 px-3 text-[14px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/50"
              />
              <label className="flex h-11 cursor-pointer select-none items-center gap-2 rounded-xl bg-card-2 px-3 text-[13px] text-muted-foreground">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-[#0A84FF]" />
                Recurrente
              </label>
            </div>

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
          <div className="rounded-2xl bg-foreground px-4 py-3 text-[14px] font-medium text-background shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
