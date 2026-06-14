export type UserStatus = "approved" | "rejected" | "suspended" | "paid";

export interface User {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  status: UserStatus;
  trial_end: string | null;
  paid_until: string | null;
}

export type TransactionType = "lend" | "borrow";

export interface BalanceEntry {
  currency: string;
  net: string; // decimal as string
}

export interface Transaction {
  id: number;
  person_id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  note: string | null;
  date: string;
  parent_id: number | null;
  created_at: string;
  children: Transaction[];
}

export interface Person {
  id: number;
  name: string;
  currencies: string[];
  is_archived: boolean;
  reminder_at: string | null;
  created_at: string;
  balances: BalanceEntry[];
  transactions: Transaction[];
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface Summary {
  owed_to_you: Record<string, string>;
  you_owe: Record<string, string>;
}
