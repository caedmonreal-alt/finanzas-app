"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small refresh control (installed PWAs have no pull-to-refresh). */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button aria-label="Actualizar" onClick={() => start(() => router.refresh())} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-card-2 lg:hidden">
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} strokeWidth={1.8} />
    </button>
  );
}
