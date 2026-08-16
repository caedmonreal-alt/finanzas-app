import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { text: string; tone: "up" | "down" | "flat" };
  foot?: React.ReactNode;
  hero?: boolean;
  className?: string;
}

export function KpiCard({ label, value, delta, foot, hero, className }: KpiCardProps) {
  return (
    <Card className={cn("px-4 py-4 sm:px-6 sm:py-5", hero && "col-span-2", className)}>
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-bold tracking-tight leading-none tabular", hero ? "text-[30px] sm:text-[36px] lg:text-[44px]" : "text-[22px] sm:text-[26px] lg:text-[28px]")}>
        {value}
      </div>
      {delta && (
        <span
          className={cn(
            "mt-2.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[13px] font-semibold",
            delta.tone === "up" && "bg-positive/15 text-positive",
            delta.tone === "down" && "bg-danger/12 text-danger",
            delta.tone === "flat" && "bg-card-2 text-muted-foreground"
          )}
        >
          {delta.tone === "up" ? "↑" : delta.tone === "down" ? "↓" : "→"} {delta.text}
        </span>
      )}
      {foot && <div className="mt-2.5 text-[12.5px] text-muted-foreground">{foot}</div>}
    </Card>
  );
}
