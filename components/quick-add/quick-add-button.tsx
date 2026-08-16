"use client";

import { useQuickAdd } from "./quick-add-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuickAddButton({ className, label = "Registrar gasto" }: { className?: string; label?: string }) {
  const { openNew } = useQuickAdd();
  return (
    <Button onClick={() => openNew("expense")} className={className}>
      <span className="text-xl leading-none">+</span>
      <span className={cn(label ? "" : "sr-only")}>{label}</span>
    </Button>
  );
}
