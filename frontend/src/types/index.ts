export interface User {
  id: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  isActive: boolean;
  balance: number;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  creditLimit: string;
  billingCycleDay: number;
  dueDay: number;
  isActive: boolean;
  outstanding: number;
}

export type CategoryKind = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string | null;
  parentId: string | null;
}

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "CC_PAYMENT";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  date: string;
  note: string | null;
  payee: string | null;
  tags: string[];
  accountId: string | null;
  toAccountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  account: Account | null;
  toAccount: Account | null;
  creditCard: CreditCard | null;
  category: Category | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  targetDate: string | null;
  linkedAccountId: string | null;
  isArchived: boolean;
  currentAmount: number;
  progressPct: number;
}

export interface GoalContribution {
  id: string;
  amount: string;
  date: string;
  note: string | null;
}

export interface Investment {
  id: string;
  fundName: string;
  folioNumber: string | null;
  category: string | null;
  currentNav: string;
  navUpdatedAt: string | null;
  isArchived: boolean;
  units: number;
  investedAmount: number;
  currentValue: number;
  gainLoss: number;
  avgNav: number;
}

export interface InvestmentTransaction {
  id: string;
  type: "BUY" | "SELL" | "SIP";
  units: string;
  nav: string;
  amount: string;
  date: string;
  note: string | null;
}

export type VaultEntryType = "PASSWORD" | "CARD" | "NOTE";

export interface VaultEntryMeta {
  id: string;
  type: VaultEntryType;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultPasswordData {
  site?: string;
  username?: string;
  password: string;
  notes?: string;
}

export interface VaultCardData {
  cardholderName?: string;
  cardNumber: string;
  expiry?: string;
  cvv?: string;
  bank?: string;
  notes?: string;
}

export interface VaultNoteData {
  body: string;
}

export interface VaultEntryRevealed extends VaultEntryMeta {
  data: VaultPasswordData | VaultCardData | VaultNoteData;
}

export interface DashboardSummary {
  netWorth: number;
  totalAccountBalance: number;
  totalCardOutstanding: number;
  investmentValue: number;
  accountBalances: { id: string; name: string; balance: number }[];
  cardOutstanding: { id: string; name: string; outstanding: number }[];
  monthIncome: number;
  monthExpense: number;
  trend: { month: string; income: number; expense: number }[];
  expenseByCategory: { categoryId: string | null; name: string; color: string; total: number }[];
  goals: { id: string; name: string; targetAmount: number; currentAmount: number; progressPct: number }[];
}
