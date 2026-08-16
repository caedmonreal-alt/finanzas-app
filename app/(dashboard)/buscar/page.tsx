import type { Metadata } from "next";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Buscar" };
export const dynamic = "force-dynamic";

export default function BuscarPage({ searchParams }: { searchParams: { q?: string } }) {
  return <SearchBox initial={searchParams.q ?? ""} />;
}
