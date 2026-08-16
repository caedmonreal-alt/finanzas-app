"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashCount } from "@/lib/actions/caja";
import { todayISO } from "@/lib/dates";
import { cn, formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export function CashCountForm({ expected, cashAccounts }: { expected: number; cashAccounts: { id: string; name: string; balance: number }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [counted, setCounted] = useState("");
  const [qty, setQty] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [adjust, setAdjust] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const denomTotal = useMemo(() => DENOMS.reduce((s, d) => s + d * (Number(qty[d]) || 0), 0), [qty]);
  const value = Number(counted.replace(/[^0-9.]/g, "")) || 0;
  const diff = value - expected;

  function save() {
    if (!value && value !== 0) return;
    start(async () => {
      const res = await createCashCount({ date, expected, counted: value, note, adjust, account_id: cashAccounts[0]?.id ?? null });
      if (res.error) return setError(res.error);
      setMsg(diff === 0 ? "Arqueo guardado: cuadró exacto." : adjust ? `Arqueo guardado y ajuste de ${formatMXN(diff)} registrado.` : "Arqueo guardado con diferencia (sin ajuste).");
      setCounted(""); setQty({}); setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card-2 px-4 py-3"><div className="text-[12px] text-muted-foreground">Saldo teórico</div><div className="mt-0.5 text-[22px] font-bold tabular">{formatMXN(expected)}</div>{cashAccounts.length > 1 && <div className="text-[11.5px] text-muted-foreground">{cashAccounts.map((a) => `${a.name} ${formatMXN(a.balance)}`).join(" · ")}</div>}</div>
        <div className="rounded-2xl bg-card-2 px-4 py-3">
          <Label htmlFor="counted">Efectivo contado</Label>
          <input id="counted" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0" className="mt-0.5 w-full bg-transparent text-[22px] font-bold tabular outline-none placeholder:text-muted-foreground/50" />
        </div>
      </div>
      {counted !== "" && (
        <div className={cn("rounded-2xl px-4 py-3 text-[14px] font-semibold", diff === 0 ? "bg-positive/15 text-positive" : diff < 0 ? "bg-danger/10 text-danger" : "bg-warning/15 text-warning")}>
          {diff === 0 ? "✓ Cuadra exacto" : diff < 0 ? `Faltan ${formatMXN(-diff)}` : `Sobran ${formatMXN(diff)}`}
          {diff !== 0 && <span className="ml-2 font-normal text-muted-foreground">Revisa movimientos sin capturar antes de ajustar.</span>}
        </div>
      )}
      <details className="rounded-2xl bg-card-2 px-4 py-3">
        <summary className="cursor-pointer text-[13.5px] font-medium">Desglose por billete (opcional)</summary>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {DENOMS.map((d) => (
            <label key={d} className="text-[11.5px] text-muted-foreground">${d}<Input inputMode="numeric" value={qty[d] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [d]: e.target.value }))} className="mt-0.5 h-9 px-2 text-center" placeholder="0" /></label>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px]"><span className="text-muted-foreground">Total del desglose: <b className="text-foreground tabular">{formatMXN(denomTotal)}</b></span><Button size="sm" variant="secondary" onClick={() => setCounted(String(denomTotal))} disabled={!denomTotal}>Usar este total</Button></div>
      </details>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></div>
      </div>
      {counted !== "" && diff !== 0 && (
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px]"><input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} className="accent-[#0A84FF]" /> Registrar un ajuste de {formatMXN(diff)} para que la caja quede en {formatMXN(value)}</label>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {msg && <p className="text-[13px] text-positive">{msg}</p>}
      <Button onClick={save} disabled={pending || counted === ""} className="w-full sm:w-auto">{pending ? "Guardando…" : "Guardar arqueo"}</Button>
    </div>
  );
}
