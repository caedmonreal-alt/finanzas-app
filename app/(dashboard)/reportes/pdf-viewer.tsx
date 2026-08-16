"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PdfViewer({ src, title, back }: { src: string; title: string; back: string }) {
  const router = useRouter();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const filename = `${title.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9 _-]/g, "").trim().replace(/\s+/g, "-") || "informe"}.pdf`;

  useEffect(() => {
    if (!src) return;
    let url: string | null = null;
    fetch(src)
      .then(async (r) => { if (!r.ok) throw new Error("No se pudo generar el informe."); return r.blob(); })
      .then((b) => {
        const f = new File([b], filename, { type: "application/pdf" });
        setFile(f);
        url = URL.createObjectURL(b);
        setBlobUrl(url);
        setCanShare(typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [f] }));
      })
      .catch((e) => setError(e.message));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [src, filename]);

  async function share() {
    if (!file) return;
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else if (blobUrl) { const a = document.createElement("a"); a.href = blobUrl; a.download = filename; a.click(); }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="-mx-4 -mt-6 flex h-[calc(100dvh-88px)] flex-col lg:-mx-8 lg:-mt-7 lg:h-[calc(100dvh-24px)]">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push(back))} className="grid h-10 w-10 place-items-center rounded-xl text-accent hover:bg-card-2" aria-label="Regresar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
        <Button size="sm" onClick={share} disabled={!file} className="gap-1.5">
          {canShare ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {canShare ? "Compartir" : "Descargar"}
        </Button>
        {blobUrl && (
          <a href={src} target="_blank" rel="noopener" className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-card-2" aria-label="Abrir en el navegador" title="Abrir en el navegador">
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
      </div>
      <div className="flex-1 bg-card-2">
        {error ? (
          <div className="p-6 text-center text-[14px] text-danger">{error} <Link href={back} className="text-accent underline">Regresar</Link></div>
        ) : !blobUrl ? (
          <div className="p-10 text-center text-[14px] text-muted-foreground">Generando el informe…</div>
        ) : (
          <iframe title={title} src={blobUrl} className="h-full w-full border-0" />
        )}
      </div>
      <p className="border-t border-border bg-card px-4 py-2 text-center text-[12px] text-muted-foreground">En iPhone: “Compartir” para guardarlo en Archivos o enviarlo por WhatsApp. Si la vista previa no carga completa, usa Compartir.</p>
    </div>
  );
}
