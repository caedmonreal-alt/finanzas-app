import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Transacciones" };

export default function Page() {
  return (
    <>
      <PageHeader title="Transacciones" />
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-[15px] font-medium">Próximamente · Iteración 2</p>
          <p className="mt-1 text-[14px] text-muted-foreground">Registro rápido de gastos e ingresos, filtros y edición.</p>
        </CardContent>
      </Card>
    </>
  );
}
