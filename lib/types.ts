export type AccountType = "cash" | "debit" | "credit" | "investment" | "debt";
export type CategoryKind = "income" | "expense";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  is_archived: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  kind: CategoryKind;
  sort_order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number; // negative = expense, positive = income
  date: string; // YYYY-MM-DD
  note: string | null;
  tags: string[];
  is_recurring: boolean;
  transfer_account_id: string | null;
  imported_hash: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string; // YYYY-MM-01
  amount: number;
}

export interface Snapshot {
  id: string;
  user_id: string;
  date: string;
  net_worth: number;
  liquid: number;
  invested: number;
  debt: number;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  investment: "Inversión",
  debt: "Deuda",
};

/* ---------- v2: libro de caja ---------- */
export type ProjectKind = "obra" | "negocio" | "personal" | "otro";
export type ProjectStatus = "presupuesto" | "proyecto" | "ejecucion" | "pausada" | "terminada";
export type MovementType =
  | "gasto"
  | "caja_chica"
  | "pago"
  | "prestamo"
  | "ministracion"
  | "venta"
  | "aportacion"
  | "cobro_prestamo"
  | "otro_ingreso"
  | "transferencia"
  | "ajuste";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  color: string | null;
  client_name: string | null;
  contract_total: number | null;
  installment_amount: number | null;
  budget_total: number | null;
  start_date: string | null;
  notes: string | null;
  sort_order: number;
  is_archived: boolean;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  notes: string | null;
  is_archived: boolean;
}

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = { obra: "Obra", negocio: "Negocio", personal: "Personal", otro: "Otro" };
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  presupuesto: "En presupuesto",
  proyecto: "En proyecto",
  ejecucion: "En ejecución",
  pausada: "Pausada",
  terminada: "Terminada",
};

export interface MovementTypeDef {
  id: MovementType;
  label: string;
  dir: "in" | "out" | "neutral";
  needsPerson?: boolean;
  hint: string;
}
export const MOVEMENT_TYPES: MovementTypeDef[] = [
  { id: "gasto", label: "Gasto", dir: "out", hint: "Compra o pago directo" },
  { id: "caja_chica", label: "Caja chica", dir: "out", needsPerson: true, hint: "Se lo entrego a alguien; después me comprueba" },
  { id: "pago", label: "Pago a persona", dir: "out", needsPerson: true, hint: "Raya, contratista, proveedor" },
  { id: "prestamo", label: "Préstamo otorgado", dir: "out", needsPerson: true, hint: "Me lo deben" },
  { id: "ministracion", label: "Ministración", dir: "in", hint: "Dinero del cliente de la obra" },
  { id: "venta", label: "Venta", dir: "in", hint: "Ganado u otra venta" },
  { id: "aportacion", label: "Aportación propia", dir: "in", hint: "Meto dinero de mi bolsa" },
  { id: "cobro_prestamo", label: "Cobro de préstamo", dir: "in", needsPerson: true, hint: "Me pagan un préstamo" },
  { id: "otro_ingreso", label: "Otro ingreso", dir: "in", hint: "Cualquier otra entrada" },
];
export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  ...Object.fromEntries(MOVEMENT_TYPES.map((t) => [t.id, t.label])),
  transferencia: "Transferencia",
  ajuste: "Ajuste de arqueo",
} as Record<MovementType, string>;
