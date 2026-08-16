"use client";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

export function MinistracionButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { openNew } = useQuickAdd();
  return (
    <Button size="sm" onClick={() => openNew("income", { movement_type: "ministracion", client_id: clientId, note: `Ministración ${clientName}` })}>
      + Ministración
    </Button>
  );
}
