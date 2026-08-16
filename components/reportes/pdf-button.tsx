import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Opens the PDF in a new tab (on iPhone: Compartir → Guardar en Archivos / enviar por WhatsApp). */
export function PdfButton({ href, label = "PDF", className }: { href: string; label?: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={cn("inline-flex h-12 items-center gap-2 rounded-2xl bg-card-2 px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-card-2/70", className)}
    >
      <FileDown className="h-5 w-5" strokeWidth={1.8} />
      {label}
    </a>
  );
}
