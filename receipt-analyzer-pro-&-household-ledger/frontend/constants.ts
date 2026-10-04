import { ExpenseCategory, IncomeCategory } from './types.ts';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '食費', '外食', '日用品', '交通費', '医療', '娯楽', '衣服', '光熱通信', 'その他'
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  '給与', '副業', '臨時', 'その他'
];

export const CATEGORY_COLORS: Record<string, string> = {
  '食費': '#f87171', // red-400
  '外食': '#fb923c', // orange-400
  '日用品': '#fbbf24', // amber-400
  '交通費': '#34d399', // emerald-400
  '医療': '#60a5fa', // blue-400
  '娯楽': '#a78bfa', // violet-400
  '衣服': '#f472b6', // pink-400
  '光熱通信': '#94a3b8', // slate-400
  'その他': '#cbd5e1', // slate-300
  '給与': '#4ade80', // green-400
  '副業': '#2dd4bf', // teal-400
  '臨時': '#38bdf8', // sky-400
};
