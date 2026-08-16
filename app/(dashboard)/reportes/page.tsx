import type { Metadata } from "next";
import { PdfViewer } from "./pdf-viewer";

export const metadata: Metadata = { title: "Informe" };
export const dynamic = "force-dynamic";

/** In-app PDF viewer: back button + share/save + open externally. Keeps the user inside the PWA. */
export default function ReportePage({ searchParams }: { searchParams: { u?: string; t?: string; back?: string } }) {
  const src = searchParams.u ?? "";
  const title = searchParams.t ?? "Informe";
  const back = searchParams.back ?? "/caja";
  return <PdfViewer src={src} title={title} back={back} />;
}
