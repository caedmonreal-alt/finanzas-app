"use client";

import { useRef, useState, useTransition } from "react";
import { createAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES = Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[];

export function AccountForm() {
  const [type, setType] = useState<AccountType>("debit");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("type", type);
        start(async () => {
          const res = await createAccount(fd);
          if (res.error) setError(res.error);
          else {
            setError(null);
            formRef.current?.reset();
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "h-10 rounded-xl bg-card-2 px-3.5 text-[14px] font-medium transition-colors",
                type === t && "bg-accent text-white"
              )}
            >
              {ACCOUNT_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder={type === "credit" ? "Nu Crédito" : type === "investment" ? "GBM+" : "BBVA Débito"} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="opening_balance">{type === "credit" ? "Deuda actual" : type === "debt" ? "Saldo por pagar" : "Saldo actual"}</Label>
          <Input id="opening_balance" name="opening_balance" inputMode="decimal" placeholder="0" />
        </div>
        {type === "credit" && (
          <div className="space-y-2">
            <Label htmlFor="credit_limit">Límite de crédito</Label>
            <Input id="credit_limit" name="credit_limit" inputMode="decimal" placeholder="60000" />
          </div>
        )}
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Agregar cuenta"}
      </Button>
    </form>
  );
}
