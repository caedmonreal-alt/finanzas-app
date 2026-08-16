/** Four sections; each with its sub-pages. `href` of a section = its landing page. */
export const NAV_SECTIONS = [
  {
    key: "caja", label: "Caja", href: "/caja", icon: "book",
    items: [
      { href: "/caja", label: "Caja del mes" },
      { href: "/arqueo", label: "Arqueo · ¿cuadra?" },
      { href: "/importar", label: "Capturar varias líneas" },
    ],
  },
  {
    key: "clientes", label: "Clientes y obras", href: "/proyectos", icon: "hardhat",
    items: [
      { href: "/proyectos", label: "Clientes y obras" },
      { href: "/resumen", label: "Resumen anual" },
    ],
  },
  {
    key: "personas", label: "Personas", href: "/personas", icon: "users",
    items: [
      { href: "/personas", label: "Caja chica" },
      { href: "/prestamos", label: "Préstamos" },
    ],
  },
  {
    key: "yo", label: "Yo", href: "/yo", icon: "wallet2",
    items: [
      { href: "/mi-pago", label: "Mi pago" },
      { href: "/dashboard", label: "Tablero personal" },
      { href: "/transacciones", label: "Movimientos personales" },
      { href: "/presupuestos", label: "Presupuestos" },
      { href: "/cuentas", label: "Cuentas" },
    ],
  },
] as const;

export type NavIcon = (typeof NAV_SECTIONS)[number]["icon"];

/** Which section a pathname belongs to */
export function sectionFor(pathname: string) {
  const all = NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.key })));
  const hit = all.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  if (hit) return hit.section;
  if (pathname.startsWith("/clientes")) return "clientes";
  if (pathname.startsWith("/reportes")) return "caja";
  return "caja";
}
