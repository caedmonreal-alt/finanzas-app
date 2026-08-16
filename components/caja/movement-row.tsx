"use client";

import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { cn, formatMXN } from "@/lib/utils";
import { MOVEMENT_TYPE_LABEL, type MovementType } from "@/lib/types";
import type { LedgerRow } from "@/lib/queries-caja";

/** One ledger line: amount · concept · project tag / type / person · running balance. Click = edit. */
export function MovementRow({ row, running, showProject = true, showDate = false }: { row: LedgerRow; running?: number; showProject?: boolean; showDate?: boolean }) {
  const { openEdit } = useQuickAdd();
  const isIn = row.amount > 0;
  const isTransfer = !!row.transfer_account_id || row.movement_type === "transferencia";
  const typeLabel = row.is_fee ? "Mi pago" : row.split_group ? "Repartido" : row.movement_type !== "gasto" ? MOVEMENT_TYPE_LABEL[row.movement_type as MovementType] : null;
  return (
    <button
      onClick={() =>
        openEdit({
          id: row.id,
          amount: row.amount,
          account_id: row.account_id,
          category_id: row.category_id,
          project_id: row.project_id,
          person_id: row.person_id,
          person_name: row.person?.name ?? null,
          client_id: row.client_id,
          split_group: row.split_group,
          is_fee: row.is_fee,
          movement_type: row.movement_type,
          date: row.date,
          note: row.note,
          is_recurring: row.is_recurring,
        })
      }
      className="-mx-2 grid w-[calc(100%+16px)] grid-cols-[104px_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-card-2/70 sm:grid-cols-[112px_1fr_auto_96px]"
    >
      <span className={cn("text-right text-[15px] font-semibold tabular", isIn && !isTransfer && "text-positive")}>
        {isIn && !isTransfer ? "+" : ""}
        {formatMXN(row.amount)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14.5px]">{row.note || typeLabel || row.category?.name || (isTransfer ? "Transferencia" : "Movimiento")}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
          {showDate && <span>{row.date.slice(-2)}/{row.date.slice(5, 7)}</span>}
          {showProject && row.project && (
            <span className="rounded-md px-1.5 py-px text-[11px] font-semibold text-white" style={{ background: row.project.color ?? "#8E8E93" }}>
              {row.project.name}
            </span>
          )}
          {typeLabel && <span>· {typeLabel}</span>}
          {row.person && <span>· {row.person.name}</span>}
          {row.account && row.account.type !== "cash" && <span>· {row.account.name}</span>}
        </span>
      </span>
      <span />
      {running !== undefined && <span className="hidden text-right text-[12.5px] text-muted-foreground tabular sm:block">{formatMXN(running)}</span>}
    </button>
  );
}
