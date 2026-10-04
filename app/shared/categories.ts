// サーバーと画面の両方で使うカテゴリ定義。
// base_system/frontend/constants.ts の内容を引き継いでいる。

export const EXPENSE_CATEGORIES = [
  '食費', '外食', '日用品', '交通費', '医療', '娯楽', '衣服', '光熱通信', 'その他',
] as const;

export const INCOME_CATEGORIES = ['給与', '副業', '臨時', 'その他'] as const;

export type TransactionType = 'expense' | 'income';
export type InputSource = 'manual' | 'receipt';

export const CATEGORY_COLORS: Record<string, string> = {
  '食費': '#f87171',
  '外食': '#fb923c',
  '日用品': '#fbbf24',
  '交通費': '#34d399',
  '医療': '#60a5fa',
  '娯楽': '#a78bfa',
  '衣服': '#f472b6',
  '光熱通信': '#94a3b8',
  'その他': '#cbd5e1',
  '給与': '#4ade80',
  '副業': '#2dd4bf',
  '臨時': '#38bdf8',
};

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export interface ReceiptItem {
  name: string;
  price: number;
  category: string;
}

/**
 * レシートの商品明細（税抜のことが多い）をカテゴリごとに合計し、
 * 支払総額（税込）とずれていれば比例配分で総額に合わせる。
 * 丸め誤差は金額がいちばん大きいカテゴリで吸収する。
 * base_system の ReceiptResultEditor にあった計算をそのまま移したもの。
 */
export function breakdownFromItems(
  items: ReceiptItem[],
  total: number | null,
): { category: string; amount: number }[] {
  const raw: Record<string, number> = {};
  for (const item of items) {
    const cat = (EXPENSE_CATEGORIES as readonly string[]).includes(item.category) ? item.category : 'その他';
    raw[cat] = (raw[cat] ?? 0) + item.price;
  }
  const rawTotal = Object.values(raw).reduce((s, v) => s + v, 0);

  if (Object.keys(raw).length === 0) {
    return total ? [{ category: 'その他', amount: total }] : [];
  }
  if (!total || rawTotal <= 0 || rawTotal === total) {
    return Object.entries(raw).map(([category, amount]) => ({ category, amount }));
  }

  const taxed: Record<string, number> = {};
  let taxedTotal = 0;
  let maxCategory = '';
  let maxAmount = -Infinity;
  for (const [cat, amount] of Object.entries(raw)) {
    taxed[cat] = Math.round((amount * total) / rawTotal);
    taxedTotal += taxed[cat];
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = cat;
    }
  }
  taxed[maxCategory] += total - taxedTotal;
  return Object.entries(taxed).map(([category, amount]) => ({ category, amount }));
}
