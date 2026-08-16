"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignProjectClient } from "@/lib/actions/caja";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

/** Assign an existing obra to this client (or move it from another client). */
export function AssignProjects({ clientId, projects }: { clientId: string; projects: Project[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState("");
  const others = projects.filter((p) => p.client_id !== clientId);
  if (!others.length) return null;
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="h-10 flex-1 rounded-xl border border-border bg-card-2 px-3 text-[14px]">
        <option value="">Asignar otra obra a este cliente…</option>
        {others.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client_id ? " (de otro cliente)" : ""}</option>)}
      </select>
      <Button size="sm" variant="secondary" disabled={!sel || pending} onClick={() => start(async () => { await assignProjectClient(sel, clientId); setSel(""); router.refresh(); })}>Asignar</Button>
    </div>
  );
}
