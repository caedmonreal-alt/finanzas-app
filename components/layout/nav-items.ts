export const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", short: "Inicio", icon: "home" },
  { href: "/transacciones", label: "Transacciones", short: "Movimientos", icon: "list" },
  { href: "/presupuestos", label: "Presupuestos", short: "Presupuestos", icon: "gauge" },
  { href: "/cuentas", label: "Cuentas", short: "Cuentas", icon: "wallet" },
  { href: "/analisis", label: "Análisis", short: "Análisis", icon: "trend" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
