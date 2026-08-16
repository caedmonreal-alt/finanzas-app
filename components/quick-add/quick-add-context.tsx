"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Category } from "@/lib/types";
import type { AccountBalance } from "@/lib/queries";
import { QuickAddSheet, type EditableTransaction } from "./quick-add-sheet";

interface QuickAddApi {
  openNew: (kind?: "expense" | "income") => void;
  openEdit: (tx: EditableTransaction) => void;
}

const Ctx = createContext<QuickAddApi | null>(null);

export function useQuickAdd(): QuickAddApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({
  categories,
  accounts,
  children,
}: {
  categories: Category[];
  accounts: AccountBalance[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState<{ open: boolean; kind: "expense" | "income"; edit: EditableTransaction | null }>({
    open: false,
    kind: "expense",
    edit: null,
  });

  const openNew = useCallback((kind: "expense" | "income" = "expense") => setState({ open: true, kind, edit: null }), []);
  const openEdit = useCallback((tx: EditableTransaction) => setState({ open: true, kind: tx.amount < 0 ? "expense" : "income", edit: tx }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  // Keyboard shortcut: "n" opens a new expense (desktop convenience)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !["input", "textarea", "select"].includes(tag) && !state.open) {
        e.preventDefault();
        openNew("expense");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, state.open]);

  return (
    <Ctx.Provider value={{ openNew, openEdit }}>
      {children}
      <QuickAddSheet
        open={state.open}
        initialKind={state.kind}
        edit={state.edit}
        categories={categories}
        accounts={accounts}
        onClose={close}
      />
    </Ctx.Provider>
  );
}
