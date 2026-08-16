"use client";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

export function FeeButton() {
  const { openNew } = useQuickAdd();
  return <Button onClick={() => openNew("expense")}>Registrar mi pago</Button>;
}
