"use client";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

export function LoanButtons() {
  const { openNew } = useQuickAdd();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => openNew("income")}>Registrar cobro</Button>
      <Button onClick={() => openNew("expense")}>Prestar</Button>
    </div>
  );
}
