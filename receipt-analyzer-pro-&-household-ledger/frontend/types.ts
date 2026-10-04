export type ExpenseCategory = '食費' | '外食' | '日用品' | '交通費' | '医療' | '娯楽' | '衣服' | '光熱通信' | 'その他';
export type IncomeCategory = '給与' | '副業' | '臨時' | 'その他';
export type TransactionType = 'expense' | 'income';
export type InputSource = 'receipt' | 'manual' | 'email';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string; // ExpenseCategory | IncomeCategory
  storeName?: string;
  memo?: string;
  source: InputSource;
  createdAt: number;
}

export interface ReceiptItem {
  name: string;
  price: number;
  category: string;
}

export interface ReceiptData {
  store_name_raw: string;
  store_name: string;
  date: string | null;
  total: number | null;
  total_source: string;
  items: ReceiptItem[];
  category_breakdown: Record<string, number>;
  confidence: 'high' | 'medium' | 'low';
}

export interface ReceiptRecord {
  id: string;
  storeName: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  categoryBreakdown: Record<string, number>;
  imageUrl: string;
  createdAt: number;
}

export interface EmailCandidate {
  id: string;
  sender: string;
  date: string | null;
  amount: number | null;
  context: string;
}
