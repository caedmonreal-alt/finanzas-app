import { BookOpen, HardHat, Users, BadgeDollarSign, MoreHorizontal } from "lucide-react";

const ICONS = { book: BookOpen, hardhat: HardHat, users: Users, wallet2: BadgeDollarSign, more: MoreHorizontal };

export function NavIcon({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.8} />;
}
