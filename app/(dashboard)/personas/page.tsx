import type { Metadata } from "next";
import { getPeople, getPersonBalances, getProjects, getProofs } from "@/lib/queries-caja";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PeopleTable } from "./people-table";

export const metadata: Metadata = { title: "Caja chica" };
export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const [people, balances, projects, proofs] = await Promise.all([getPeople(), getPersonBalances(), getProjects(), getProofs({}, 30)]);
  const rows = people.map((p) => {
    const b = balances.find((x) => x.person_id === p.id);
    return { person: p, petty_given: b?.petty_given ?? 0, petty_proved: b?.petty_proved ?? 0, payments: b?.payments ?? 0, loan: b?.loan_outstanding ?? 0, last: b?.last_date ?? null };
  });
  const totalPending = rows.reduce((s, r) => s + Math.max(0, r.petty_given - r.petty_proved), 0);

  return (
    <>
      <PageHeader title="Caja chica" subtitle={`${formatMXN(totalPending)} por comprobar · ${people.length} personas`} />
      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <CardDescription>Entregado − comprobado = por comprobar</CardDescription>
        </CardHeader>
        <CardContent>
          <PeopleTable rows={rows} projects={projects.filter((p) => !p.is_archived)} />
        </CardContent>
      </Card>
      {proofs.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Últimas comprobaciones</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {proofs.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-[14px]">
                  <span><b>{p.person?.name}</b> · {p.note || "Comprobación"} <span className="text-muted-foreground">· {p.project?.name ?? "sin proyecto"} · {formatDate(p.date)}</span></span>
                  <span className={cn("font-semibold tabular")}>{formatMXN(p.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
