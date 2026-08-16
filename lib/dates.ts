/** Date helpers (all dates handled as YYYY-MM-DD strings to avoid timezone drift). */

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-08" for a Date */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Parse "2026-08" → { year, month(1-12) } with fallback to current month */
export function parseMonthKey(key?: string | null): { year: number; month: number } {
  const m = key?.match(/^(\d{4})-(\d{2})$/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthRange(key: string): { start: string; end: string; daysInMonth: number } {
  const { year, month } = parseMonthKey(key);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end, daysInMonth: last };
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d);
}

/** "agosto de 2026" → "Agosto de 2026" */
export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  const s = new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-08-15" → "sáb 15 ago" or "Hoy" / "Ayer" */
export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoy";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (iso === yesterday) return "Ayer";
  const [yy, mm, dd] = iso.split("-").map(Number);
  const s = new Date(yy, mm - 1, dd).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return s.replace(/\./g, "");
}
