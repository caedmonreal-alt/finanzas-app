"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { updateAccount, deleteAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/lib/types";
import { formatMXN, cn } from "@/lib/utils";
import type { AccountBalance } from "@/lib/queries";

const TYPES = Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[];

export function AccountRow({ account }: { account: AccountBalance }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [type, setType] = useState<AccountType>(account.type);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const negativeType = type === "credit" || type === "debt";
  const openingAbs = Math.abs(account.opening_balance);

  if (editing) {
    return (
      <li className="py-3">
        <form
          action={(fd) => {
            fd.set("type", type);
            start(async () => {
              const res = await updateAccount(account.account_id, fd);
              if (res.error) setError(res.error);
              else {
                setError(null);
                setEditing(false);
              }
            });
          }}
          className="space-y-3 rounded-2xl bg-card-2 p-4"
        >
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={cn("h-9 rounded-xl bg-card px-3 text-[13px] font-medium", type === t && "bg-accent text-white")}
              >
                {ACCOUNT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor={`name-${account.account_id}`}>Nombre</Label>
              <Input id={`name-${account.account_id}`} name="name" defaultValue={account.name} required className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ob-${account.account_id}`}>{negativeType ? "Deuda inicial" : "Saldo inicial"}</Label>
              <Input id={`ob-${account.account_id}`} name="opening_balance" inputMode="decimal" defaultValue={openingAbs} className="bg-card" />
            </div>
            {type === "credit" && (
              <div className="space-y-1.5">
                <Label htmlFor={`cl-${account.account_id}`}>Límite</Label>
                <Input id={`cl-${account.account_id}`} name="credit_limit" inputMode="decimal" defaultValue={account.credit_limit ?? ""} className="bg-card" />
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">
            El saldo inicial es el punto de partida; el saldo actual se calcula sumando los movimientos.
          </p>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-medium">{account.name}</div>
          <div className="text-[12.5px] text-muted-foreground">
            {ACCOUNT_TYPE_LABEL[account.type]}
            {account.credit_limit ? ` · límite ${formatMXN(account.credit_limit)}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("mr-2 text-[14.5px] font-semibold tabular", account.balance < 0 && "text-danger")}>{formatMXN(account.balance)}</div>
          <button
            aria-label="Editar"
            onClick={() => { setEditing(true); setConfirming(false); }}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-card-2 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            aria-label="Eliminar"
            onClick={() => setConfirming((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger/8 px-3 py-2">
          <span className="text-[13px]">¿Eliminar <b>{account.name}</b>? Si tiene movimientos, solo se archiva.</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteAccount(account.account_id);
                  if (res.error) setError(res.error);
                  else if (res.message) setNotice(res.message);
                  setConfirming(false);
                })
              }
            >
              {pending ? "…" : "Sí, eliminar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              No
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
      {notice && <p className="mt-1 text-[13px] text-muted-foreground">{notice}</p>}
    </li>
  );
}
