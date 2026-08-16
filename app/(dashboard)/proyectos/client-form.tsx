"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { upsertClient } from "@/lib/actions/caja";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/types";

/** "+ Cliente" button, or "Editar" (small) when `client` is passed. */
export function ClientForm({ client }: { clients: Client[]; client?: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(client?.name ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  function save() {
    start(async () => {
      const res = await upsertClient(client?.id ?? null, { name, notes });
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }
  return (
    <>
      {client ? (
        <button onClick={() => setOpen(true)} className="text-[13px] font-medium text-accent hover:underline">Renombrar</button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>+ Cliente</Button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-[440px] rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">{client ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button aria-label="Cerrar" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" autoFocus /></div>
              <div className="space-y-1.5"><Label>Notas</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              {error && <p className="text-[13px] text-danger">{error}</p>}
              <Button className="w-full" onClick={save} disabled={pending || !name.trim()}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
