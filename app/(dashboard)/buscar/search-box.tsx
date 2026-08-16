"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import { searchAll, type SearchResult } from "@/lib/actions/search";
import { Ledger } from "@/components/caja/ledger";
import { UndoButton } from "@/components/caja/undo-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMXN } from "@/lib/utils";

const QUICK = ["⛽", "🍽️", "🧱", "🔩", "👷🏻", "👜", "🤝", "💵", "💼", "🐂"];

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<SearchResult | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    const h = setTimeout(() => start(async () => setRes(await searchAll(q))), 300);
    return () => clearTimeout(h);
  }, [q]);

  const total = res ? res.transactions.filter((t) => !t.transfer_account_id).reduce((s, t) => s + t.amount, 0) : 0;

  return (
    <div className="-mt-1">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/caja"))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-accent hover:bg-card-2" aria-label="Regresar"><ArrowLeft className="h-5 w-5" /></button>
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Concepto, persona, obra, cliente, monto, emoji…" className="h-12 w-full rounded-2xl bg-card pl-11 pr-10 text-[16px] shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/50" />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-card-2" aria-label="Limpiar"><X className="h-4 w-4" /></button>}
        </label>
        <UndoButton compact />
      </div>

      {!q && (
        <div className="space-y-3">
          <p className="text-[13.5px] text-muted-foreground">Ejemplos: <b className="text-foreground">herrajes</b> · <b className="text-foreground">Gabriel</b> · <b className="text-foreground">Capilla</b> · <b className="text-foreground">1500</b> (monto exacto) · <b className="text-foreground">&gt;10000</b> · <b className="text-foreground">500-2000</b> · <b className="text-foreground">caja chica</b> · un emoji.</p>
          <div className="flex flex-wrap gap-2">{QUICK.map((e) => <button key={e} onClick={() => setQ(e)} className="grid h-11 w-11 place-items-center rounded-xl bg-card text-[20px] shadow-card">{e}</button>)}</div>
        </div>
      )}

      {q && res && (
        <>
          <p className="mb-3 text-[13px] text-muted-foreground">{res.interpreted}{pending ? " · buscando…" : ""}</p>
          {(res.people.length > 0 || res.projects.length > 0 || res.clients.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {res.clients.map((c) => <Link key={c.id} href={`/clientes/${c.id}`} className="rounded-xl bg-accent-soft px-3 py-2 text-[13.5px] font-medium text-accent">Cliente · {c.name} →</Link>)}
              {res.projects.map((p) => <Link key={p.id} href={`/proyectos/${p.id}`} className="rounded-xl bg-card px-3 py-2 text-[13.5px] font-medium shadow-card">Obra · {p.name} →</Link>)}
              {res.people.map((p) => <Link key={p.id} href="/personas" className="rounded-xl bg-card px-3 py-2 text-[13.5px] font-medium shadow-card">Persona · {p.name}{p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null} →</Link>)}
            </div>
          )}
          <Card>
            <CardContent className="pt-4">
              {res.transactions.length === 0 ? <p className="py-6 text-center text-[14px] text-muted-foreground">Sin movimientos que coincidan.</p> : (
                <>
                  <div className="mb-2 flex justify-between text-[13px] text-muted-foreground"><span>{res.transactions.length >= 80 ? "Mostrando los 80 más recientes" : ""}</span><span>neto <b className="text-foreground tabular">{formatMXN(total)}</b></span></div>
                  <Ledger rows={res.transactions} groupByDay />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
