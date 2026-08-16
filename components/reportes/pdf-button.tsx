import Link from "next/link";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Opens the in-app PDF viewer (back button + share) instead of a bare new tab. */
export function PdfButton({ href, label = "PDF", title, back, className }: { href: string; label?: string; title?: string; back?: string; className?: string }) {
  const q = new URLSearchParams({ u: href, t: title ?? label });
  if (back) q.set("back", back);
  return (
    <Link
      href={`/reportes?${q.toString()}`}
      className={cn("inline-flex h-12 items-center gap-2 rounded-2xl bg-card-2 px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-card-2/70", className)}
    >
      <FileDown className="h-5 w-5" strokeWidth={1.8} />
      {label}
    </Link>
  );
}
