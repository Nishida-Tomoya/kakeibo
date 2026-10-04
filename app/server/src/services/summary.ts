import { db } from '../db.ts';

export interface MonthSummary {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
  expenseByCategory: { category: string; amount: number }[];
  incomeByCategory: { category: string; amount: number }[];
}

/** YYYY-MM に n か月足した月を返す（n は負でもよい） */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 日本時間での今月（YYYY-MM） */
export function currentMonthJst(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}`;
}

function byCategory(month: string, type: 'expense' | 'income') {
  return db
    .prepare(
      `SELECT category, SUM(amount) AS amount FROM transactions
       WHERE type = ? AND substr(date, 1, 7) = ?
       GROUP BY category ORDER BY amount DESC`,
    )
    .all(type, month) as { category: string; amount: number }[];
}

export function monthSummary(month: string): MonthSummary {
  const expenseByCategory = byCategory(month, 'expense');
  const incomeByCategory = byCategory(month, 'income');
  const income = incomeByCategory.reduce((s, r) => s + r.amount, 0);
  const expense = expenseByCategory.reduce((s, r) => s + r.amount, 0);
  return { month, income, expense, balance: income - expense, expenseByCategory, incomeByCategory };
}

/** 指定月までの直近 count か月の収入・支出 */
export function trend(month: string, count: number) {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(month, -i);
    const { income, expense } = monthSummary(m);
    result.push({ month: m, income, expense });
  }
  return result;
}
