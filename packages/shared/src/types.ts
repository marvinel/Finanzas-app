export interface Transaction {
  id?: number;
  date: string; // ISO date string
  description: string;
  amount: number; // negative = debit, positive = credit
  balance: number;
  category: TransactionCategory;
  subcategory?: string;
  isSubscription: boolean;
  userId?: number;
  createdAt?: string;
}

export interface Subscription {
  id?: number;
  name: string;
  amount: number;
  category: TransactionCategory;
  frequency: "monthly" | "yearly";
  lastCharged: string;
  isActive: boolean;
  userId?: number;
}

export interface SpendingSummary {
  category: TransactionCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: SpendingSummary[];
}

export type TransactionCategory =
  | "transfers"
  | "credit_card_payment"
  | "cash_withdrawal"
  | "food"
  | "groceries"
  | "subscriptions"
  | "services"
  | "income"
  | "other";

export interface ParsedStatement {
  accountNumber: string;
  periodStart: string;
  periodEnd: string;
  previousBalance: number;
  finalBalance: number;
  transactions: Transaction[];
}

export interface UploadResult {
  success: boolean;
  transactionsCount: number;
  period: { start: string; end: string };
  summary: SpendingSummary[];
}
