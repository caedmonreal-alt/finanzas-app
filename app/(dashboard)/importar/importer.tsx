"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransactionsBulk, type TransactionInput } from "@/lib/actions/transactions";
import { monthKey } from "@/lib/dates";
import { formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MOVEMENT_TYPES, type MovementType, type Project, type Person, type Client } from "@/lib/types";

interface ParsedRow { key: number; day: number; amount: number; concept: string; project_id: string; movement_type: MovementType; person: string; include: boolean }

const MONTHS: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const PERSONAL_KW = /gasolina|comida|desayuno|cena|costco|walmart|tintorer|skincare|caseta|camioneta|pastel|revelaci|birria|c[oó]mputo|ropa|farmacia|doctor|cine|restaurante|s[uú]per|uber|netflix|spotify|luz|agua|internet|tel(?:cel|mex)/i;
const CONCRETE_KW = /dicom|concreto|cemex|holcim/i;

function guessProject(concept: string, projects: Project[]): string {
  const c = concept.toLowerCase();
  // exact project name mentions first (longest name wins)
  const named = projects.filter((p) => c.includes(p.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
  if (named) return named.id;
  if (CONCRETE_KW.test(c)) return projects.find((p) => /corrales/i.test(p.name))?.id ?? "";
  if (/rancho|n[oó]mina ph|gas rancho|alimento|forraje|vaquill|becerr|ganado|toro|novill/i.test(c)) {
    if (/vaquill|becerr|ganado|toro|novill/i.test(c)) return projects.find((p) => /ganado/i.test(p.name))?.id ?? "";
    return projects.find((p) => /rancho/i.test(p.name))?.id ?? "";
  }
  if (AMBIGUOUS_KW.test(c)) return ""; // Amazon / Mercado Libre: casi siempre obra, a veces personal → elegir a mano
  if (PERSONAL_KW.test(c)) return projects.find((p) => p.kind === "personal")?.id ?? "";
  return "";
}
// Known aliases → canonical person name (case-insensitive substring match)
const PERSON_ALIASES: [RegExp, string, "pago" | "caja_chica"][] = [
  [/\bph\b|paulina/i, "Paulina (PH)", "pago"],
  [/gabriel|alejandro/i, "Gabriel Alejandro", "caja_chica"],
  [/\bemilio\b/i, "Emilio", "caja_chica"],
  [/\balberto\b/i, "Alberto", "pago"],
  [/\babdiel\b/i, "Abdiel", "pago"],
  [/jhonatan|jonathan/i, "Jhonatan", "pago"],
  [/crist[oó]bal|salinas/i, "Cristóbal Salinas", "pago"],
  [/juan sosa|\bsosa\b/i, "Juan Sosa", "pago"],
  [/fafsa/i, "FAFSA", "pago"],
  [/cabsa/i, "CABSA", "pago"],
  [/hugo carrillo|carrillo/i, "Ing. Hugo Carrillo", "pago"],
  [/gmc|gareth|montelongo/i, "GMC Gareth Montelongo", "pago"],
  [/\bgustavo\b/i, "Gustavo", "pago"],
  [/bulnes/i, "Bulnes", "pago"],
  [/\bmanuel\b/i, "Manuel", "caja_chica"],
  [/hugo panuco|panuco/i, "Hugo Panuco", "pago"],
];
const AMBIGUOUS_KW = /amazon|mercado libre|meli\b|liverpool|home depot/i; // obra la mayoría de las veces → dejar sin proyecto para que Eduardo elija

function guessType(concept: string, dir: "out" | "in", people: Person[]): { type: MovementType; person: string } {
  const c = concept.trim();
  if (dir === "in") return { type: /minist|anticipo|cliente/i.test(c) ? "ministracion" : /venta|becerr|vaquill|ganado/i.test(c) ? "venta" : /pr[eé]stamo|pago de|abono/i.test(c) ? "cobro_prestamo" : "otro_ingreso", person: "" };
  if (/pr[eé]stamo/i.test(c)) {
    const alias = PERSON_ALIASES.find(([re]) => re.test(c));
    return { type: "prestamo", person: alias ? alias[1] : c.replace(/pr[eé]stamo/i, "").trim() };
  }
  const alias = PERSON_ALIASES.find(([re]) => re.test(c));
  if (alias) {
    // "Material X" or supervisor names → caja chica; contractors/staff → pago
    const type: MovementType = /material|caja/i.test(c) ? "caja_chica" : alias[2];
    return { type, person: alias[1] };
  }
  const m = c.match(/^material\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)$/i);
  if (m) return { type: "caja_chica", person: m[1] };
  const known = people.find((p) => c.toLowerCase().includes(p.name.toLowerCase()));
  if (known) return { type: /material/i.test(c) ? "caja_chica" : "pago", person: known.name };
  if (/^n[oó]mina\s+(.+)$/i.test(c)) return { type: "pago", person: c.replace(/^n[oó]mina\s+/i, "") };
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,2}$/.test(c) && !PERSONAL_KW.test(c)) return { type: "pago", person: c };
  return { type: "gasto", person: "" };
}

export function Importer({ projects, people, accounts, clients }: { projects: Project[]; people: Person[]; accounts: { id: string; name: string }[]; clients: Client[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [dir, setDir] = useState<"out" | "in">("out");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const active = useMemo(() => projects.filter((p) => !p.is_archived), [projects]);

  function parse() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let day: number | null = null;
    let mk = monthKey();
    const out: ParsedRow[] = [];
    let skipped = 0;
    lines.forEach((l) => {
      const mm = l.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de\s*)?(\d{4})?/i);
      if (mm && /entradas|salidas|gastos|caja/i.test(l)) {
        const y = mm[2] ? Number(mm[2]) : new Date().getFullYear();
        mk = `${y}-${String(MONTHS[mm[1].toLowerCase()]).padStart(2, "0")}`;
        return;
      }
      if (/^\d{1,2}$/.test(l)) { day = Number(l); return; }
      const m = l.match(/^\$?\s*([\d.,]+)\s+(.+)$/);
      if (m && day) {
        const amount = Number(m[1].replace(/,/g, ""));
        if (!amount) { skipped++; return; }
        const concept = m[2].trim();
        const g = guessType(concept, dir, people);
        out.push({ key: out.length, day, amount, concept, project_id: guessProject(concept, active) || (g.type === "prestamo" ? "" : ""), movement_type: g.type, person: g.person, include: true });
      } else skipped++;
    });
    setMonth(mk);
    setRows(out);
    setInfo(`${out.length} movimientos reconocidos · ${formatMXN(out.reduce((s, r) => s + r.amount, 0))}${skipped ? ` · ${skipped} líneas ignoradas` : ""} · mes ${mk}`);
  }
  function update(key: number, patch: Partial<ParsedRow>) { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); }
  function doImport() {
    const sel = rows.filter((r) => r.include);
    if (!sel.length) return;
    if (!accountId) return setError("Necesitas una cuenta de efectivo (Cuentas → tipo Efectivo).");
    const inputs: TransactionInput[] = sel.map((r) => ({
      kind: dir === "in" ? "income" : "expense",
      amount: r.amount,
      account_id: accountId,
      category_id: null,
      project_id: r.movement_type === "ministracion" ? null : r.project_id || null,
      client_id: r.movement_type === "ministracion" ? clients[0]?.id ?? null : null,
      person_name: r.person || null,
      movement_type: r.movement_type,
      date: `${month}-${String(r.day).padStart(2, "0")}`,
      note: r.concept,
    }));
    start(async () => {
      const res = await createTransactionsBulk(inputs);
      if (res.error) return setError(res.error);
      setError(null);
      setInfo(`Importados ${res.count} movimientos en ${month}. Ya aparecen en la Caja.`);
      setRows([]); setText("");
      router.refresh();
    });
  }
  const typeDefs = MOVEMENT_TYPES.filter((t) => t.dir === dir);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
      <Card>
        <CardHeader><CardTitle>Pegar nota</CardTitle><CardDescription>Ejemplo: “Entradas y salidas agosto 2026”, luego “04”, luego “3,000 Nómina PH”…</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder={"Entradas y salidas agosto 2026\n04\n3,000 Nómina PH\n800 Pastel Revelación\n05\n33,000 Casa Alba I"} className="w-full rounded-xl border border-border bg-card-2 p-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-accent/50" />
          <div className="flex flex-wrap items-center gap-2">
            <select value={dir} onChange={(e) => setDir(e.target.value as "out" | "in")} className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px]"><option value="out">Todo son salidas</option><option value="in">Todo son entradas</option></select>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px]" />
            {accounts.length > 1 && <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-11 rounded-xl border border-border bg-card-2 px-3 text-[14px]">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
            <Button onClick={parse} disabled={!text.trim()}>Analizar</Button>
          </div>
          {info && <p className="text-[13px] text-muted-foreground">{info}</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Vista previa</CardTitle><CardDescription>Corrige proyecto, tipo o persona antes de importar</CardDescription></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="py-6 text-center text-[14px] text-muted-foreground">Pega el texto y pulsa Analizar.</p> : (
            <>
              <div className="max-h-[520px] overflow-auto -mx-2 px-2">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11.5px] text-muted-foreground"><th className="py-1 pr-1"></th><th className="py-1 pr-2">Día</th><th className="py-1 pr-2 text-right">Monto</th><th className="py-1 pr-2">Concepto</th><th className="py-1 pr-2">Proyecto</th><th className="py-1 pr-2">Tipo</th><th className="py-1">Persona</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => {
                      const needsPerson = MOVEMENT_TYPES.find((t) => t.id === r.movement_type)?.needsPerson;
                      return (
                        <tr key={r.key} className={r.include ? "" : "opacity-40"}>
                          <td className="py-1.5 pr-1"><input type="checkbox" checked={r.include} onChange={(e) => update(r.key, { include: e.target.checked })} className="accent-[#0A84FF]" /></td>
                          <td className="py-1.5 pr-2 tabular">{String(r.day).padStart(2, "0")}</td>
                          <td className="py-1.5 pr-2 text-right font-semibold tabular">{formatMXN(r.amount)}</td>
                          <td className="py-1.5 pr-2 max-w-[160px] truncate" title={r.concept}>{r.concept}</td>
                          <td className="py-1.5 pr-2"><select value={r.project_id} onChange={(e) => update(r.key, { project_id: e.target.value })} className="h-8 max-w-[140px] rounded-lg border border-border bg-card-2 px-1.5 text-[12.5px]"><option value="">Sin proyecto</option>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                          <td className="py-1.5 pr-2"><select value={r.movement_type} onChange={(e) => update(r.key, { movement_type: e.target.value as MovementType })} className="h-8 rounded-lg border border-border bg-card-2 px-1.5 text-[12.5px]">{typeDefs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></td>
                          <td className="py-1.5">{needsPerson ? <input value={r.person} onChange={(e) => update(r.key, { person: e.target.value })} list="imp-people" placeholder="¿quién?" className="h-8 w-[110px] rounded-lg border border-border bg-card-2 px-2 text-[12.5px]" /> : <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <datalist id="imp-people">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{rows.filter((r) => r.include).length} seleccionados · {formatMXN(rows.filter((r) => r.include).reduce((s, r) => s + r.amount, 0))}</span>
                <Button onClick={doImport} disabled={pending || !rows.some((r) => r.include)}>{pending ? "Importando…" : "Importar seleccionados"}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
