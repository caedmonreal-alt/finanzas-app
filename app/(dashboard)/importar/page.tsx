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
      <PageHeader title="Capturar varias líneas" subtitle="Escribe o pega varias: el día en una línea y debajo “cantidad concepto”. Sirve para tus notas de Evernote o para vaciar el día de golpe." />
      <Importer projects={projects} people={people} accounts={accounts.filter((a) => a.type === "cash").map((a) => ({ id: a.account_id, name: a.name }))} clients={clients} />
    </>
  );
}
