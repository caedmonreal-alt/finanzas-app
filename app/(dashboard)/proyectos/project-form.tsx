"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { upsertProject, archiveProject } from "@/lib/actions/caja";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL, type Project, type ProjectKind, type ProjectStatus, type Client } from "@/lib/types";

/** "Nuevo proyecto" button + sheet, or edit mode when `project` is passed. */
export function ProjectForm({ project, trigger, clients = [] }: { project?: Project; trigger?: React.ReactNode; clients?: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project?.name ?? "");
  const [kind, setKind] = useState<ProjectKind>(project?.kind ?? "obra");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ejecucion");
  const [client] = useState(project?.client_name ?? "");
  const [clientId, setClientId] = useState<string>(project?.client_id ?? "");
  const [contract, setContract] = useState(project?.contract_total ? String(project.contract_total) : "");
  const [installment, setInstallment] = useState(project?.installment_amount ? String(project.installment_amount) : "");
  const [budget, setBudget] = useState(project?.budget_total ? String(project.budget_total) : "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || null;

  function save() {
    start(async () => {
      const res = await upsertProject(project?.id ?? null, { name, kind, status, client_name: client, client_id: clientId || null, contract_total: num(contract), installment_amount: num(installment), budget_total: num(budget), notes });
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }
  function archive() {
    if (!project) return;
    start(async () => {
      const res = await archiveProject(project.id, true);
      if (res.error) return setError(res.error);
      setOpen(false);
      router.push("/proyectos");
      router.refresh();
    });
  }
  const chip = (on: boolean) => cn("h-9 rounded-xl bg-card-2 px-3 text-[13px] font-medium", on && "bg-accent text-white");

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger ?? <Button variant={project ? "secondary" : "default"}>{project ? "Editar" : "+ Nuevo proyecto"}</Button>}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">{project ? "Editar proyecto" : "Nuevo proyecto"}</h2>
              <button aria-label="Cerrar" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ampliación 04" /></div>
              <div className="space-y-1.5"><Label>Tipo</Label><div className="flex flex-wrap gap-2">{(Object.keys(PROJECT_KIND_LABEL) as ProjectKind[]).map((k) => <button key={k} className={chip(kind === k)} onClick={() => setKind(k)}>{PROJECT_KIND_LABEL[k]}</button>)}</div></div>
              {kind === "obra" && (
                <>
                  <div className="space-y-1.5"><Label>Estado</Label><div className="flex flex-wrap gap-2">{(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>{PROJECT_STATUS_LABEL[s]}</button>)}</div></div>
                  <div className="space-y-1.5"><Label>Cliente (fondo común)</Label>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card-2 px-3 text-[14px]">
                      <option value="">Sin cliente</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1.5"><Label>Presupuesto de obra</Label><Input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" /></div>
                    <div className="space-y-1.5"><Label>Monto contratado</Label><Input inputMode="numeric" value={contract} onChange={(e) => setContract(e.target.value)} placeholder="0" /></div>
                    <div className="space-y-1.5"><Label>Ministración típica</Label><Input inputMode="numeric" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder="0" /></div>
                  </div>
                  <p className="text-[12px] text-muted-foreground">Con presupuesto verás el avance financiero; con monto contratado y ministración típica, cuántas ministraciones te faltan por recibir.</p>
                </>
              )}
              <div className="space-y-1.5"><Label>Notas</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              {error && <p className="text-[13px] text-danger">{error}</p>}
              <div className="flex gap-2 pt-1">
                {project && <Button variant="secondary" className="text-danger" onClick={archive} disabled={pending}>Archivar</Button>}
                <Button className="flex-1" onClick={save} disabled={pending || !name.trim()}>{pending ? "Guardando…" : "Guardar"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
