import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Análisis" };

export default function Page() {
  return (
    <>
      <PageHeader title="Análisis" />
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-[15px] font-medium">Próximamente · Iteración 3</p>
          <p className="mt-1 text-[14px] text-muted-foreground">KPIs, gráficas, análisis por categoría e insights automáticos.</p>
        </CardContent>
      </Card>
    </>
  );
}
