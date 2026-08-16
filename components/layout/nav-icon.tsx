import { Home, List, Gauge, Wallet, TrendingUp } from "lucide-react";
import type { NavIcon as NavIconName } from "./nav-items";

const ICONS = { home: Home, list: List, gauge: Gauge, wallet: Wallet, trend: TrendingUp };

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.8} />;
}
