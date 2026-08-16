export const NAV_ITEMS = [
  { href: "/caja", label: "Caja del mes", short: "Caja", icon: "book" },
  { href: "/proyectos", label: "Proyectos", short: "Proyectos", icon: "hardhat" },
  { href: "/resumen", label: "Resumen anual", short: "Resumen", icon: "calendar" },
  { href: "/personas", label: "Caja chica", short: "Caja chica", icon: "users" },
  { href: "/prestamos", label: "Préstamos", short: "Préstamos", icon: "handshake" },
  { href: "/arqueo", label: "Arqueo", short: "Arqueo", icon: "check" },
  { href: "/importar", label: "Importar", short: "Importar", icon: "import" },
  { href: "/dashboard", label: "Personal", short: "Personal", icon: "home", section: "personal" },
  { href: "/transacciones", label: "Transacciones", short: "Movimientos", icon: "list", section: "personal" },
  { href: "/presupuestos", label: "Presupuestos", short: "Presupuestos", icon: "gauge", section: "personal" },
  { href: "/cuentas", label: "Cuentas", short: "Cuentas", icon: "wallet", section: "personal" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
