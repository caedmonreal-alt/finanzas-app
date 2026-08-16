import { Home, List, Gauge, Wallet, BookOpen, HardHat, Users, Handshake, CheckCircle2, Import, MoreHorizontal, CalendarRange } from "lucide-react";
import type { NavIcon as NavIconName } from "./nav-items";

const ICONS = { home: Home, list: List, gauge: Gauge, wallet: Wallet, book: BookOpen, hardhat: HardHat, users: Users, handshake: Handshake, check: CheckCircle2, import: Import, more: MoreHorizontal, calendar: CalendarRange };

export function NavIcon({ name, className }: { name: NavIconName | "more"; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.8} />;
}
