"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { createCategory, renameCategory, deleteCategory } from "@/lib/actions/categories";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = categories.filter((c) => c.kind === kind);

  function add() {
    start(async () => {
      const res = await createCategory({ name, icon, kind });
      if (res.error) return setError(res.error);
      setError(null);
      setName("");
      setIcon("");
      router.refresh();
    });
  }
  function saveEdit(id: string) {
    start(async () => {
      const res = await renameCategory(id, { name: editName, icon: editIcon });
      if (res.error) return setError(res.error);
      setEditing(null);
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      const res = await deleteCategory(id);
      if (res.error) return setError(res.error);
      setConfirm(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Categorías</CardTitle>
          <CardDescription>Agrega, renombra o elimina. Los movimientos de una categoría eliminada quedan “Sin categoría”.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex rounded-xl bg-card-2 p-1 w-fit">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn("h-8 rounded-[10px] px-3.5 text-[13px] font-semibold text-muted-foreground", kind === k && "bg-card text-foreground shadow-card")}
            >
              {k === "expense" ? "Gastos" : "Ingresos"}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border">
          {list.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="flex items-center gap-2 py-2">
                <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="h-10 w-14 text-center" aria-label="Ícono" />
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 flex-1" aria-label="Nombre" onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)} />
                <button aria-label="Guardar" onClick={() => saveEdit(c.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white"><Check className="h-4 w-4" /></button>
                <button aria-label="Cancelar" onClick={() => setEditing(null)} className="grid h-9 w-9 place-items-center rounded-lg bg-card-2"><X className="h-4 w-4" /></button>
              </li>
            ) : (
              <li key={c.id} className="py-1.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-card-2 text-[16px]">{c.icon ?? "•"}</span>
                  <span className="flex-1 text-[14.5px] font-medium">{c.name}</span>
                  <button aria-label="Renombrar" onClick={() => { setEditing(c.id); setEditName(c.name); setEditIcon(c.icon ?? ""); setConfirm(null); }} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-card-2 hover:text-foreground"><Pencil className="h-4 w-4" strokeWidth={1.8} /></button>
                  <button aria-label="Eliminar" onClick={() => setConfirm(confirm === c.id ? null : c.id)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" strokeWidth={1.8} /></button>
                </div>
                {confirm === c.id && (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-danger/8 px-3 py-1.5 text-[13px]">
                    <span>¿Eliminar <b>{c.name}</b>?</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="destructive" className="h-8" disabled={pending} onClick={() => remove(c.id)}>Sí</Button>
                      <Button size="sm" variant="secondary" className="h-8" onClick={() => setConfirm(null)}>No</Button>
                    </div>
                  </div>
                )}
              </li>
            )
          )}
        </ul>

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🙂" className="h-10 w-14 text-center" aria-label="Ícono (emoji)" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "expense" ? "Nueva categoría de gasto" : "Nueva categoría de ingreso"} className="h-10 flex-1" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button size="sm" onClick={add} disabled={pending || !name.trim()}>Agregar</Button>
        </div>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
