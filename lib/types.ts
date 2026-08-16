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
