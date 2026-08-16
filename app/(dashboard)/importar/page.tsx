import type { Metadata } from "next";
import { getProjects, getPeople, getClients } from "@/lib/queries-caja";
import { getAccountBalances } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Importar" };
export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const [projects, people, accounts, clients] = await Promise.all([getProjects(), getPeople(), getAccountBalances(), getClients()]);
  return (
    <>
      <PageHeader title="Importar de Evernote" subtitle="Pega la nota tal cual: el mes en la primera línea, luego el día y debajo “cantidad concepto”" />
      <Importer projects={projects} people={people} accounts={accounts.filter((a) => a.type === "cash").map((a) => ({ id: a.account_id, name: a.name }))} clients={clients} />
    </>
  );
}
