"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Undo2 } from "lucide-react";
import { getLastUndo, undoLast, type UndoInfo } from "@/lib/actions/transactions";
import { formatMXN, cn } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = { INSERT: "registro", UPDATE: "cambio", DELETE: "borrado" };

/** "Deshacer última acción": reverts the latest batch of changes on movements (works for registros, cambios y borrados). */
export function UndoButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [info, setInfo] = useState<UndoInfo | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { getLastUndo().then(setInfo).catch(() => setInfo(null)); }, [pathname]);

  if (!info) return null;
  const actions = info.actions.split(",").map((a) => ACTION_LABEL[a] ?? a).join("/");
  const label = `${actions} de ${info.entries === 1 ? "1 movimiento" : `${info.entries} movimientos`}${info.sample ? ` · ${info.sample}` : ""}${info.total ? ` · ${formatMXN(info.total)}` : ""}`;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => start(async () => { const r = await undoLast(); if (r.error) setMsg(r.error); else { setMsg(`Deshecho: ${label}`); setInfo(await getLastUndo()); router.refresh(); setTimeout(() => setMsg(null), 3000); } })}
        disabled={pending}
        title={`Deshacer: ${label}`}
        className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl bg-card-2 px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground", compact && "h-9 px-2.5")}
      >
        <Undo2 className="h-4 w-4" strokeWidth={1.8} />
        {compact ? "Deshacer" : <span className="max-w-[260px] truncate">Deshacer: {label}</span>}
      </button>
      {msg && <span className="text-[12px] text-muted-foreground">{msg}</span>}
    </div>
  );
}
