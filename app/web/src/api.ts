// サーバー（app/server）の API を呼び出す関数とデータの型

import type { InputSource, ReceiptItem, TransactionType } from '../../shared/categories.ts';

export interface User {
  id: number;
  username: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  date: string;
  amount: number;
  category: string;
  store_name: string | null;
  memo: string | null;
  source: InputSource;
  receipt_id: number | null;
  created_by_name: string | null;
}

export interface TransactionInput {
  type: TransactionType;
  date: string;
  amount: number;
  category: string;
  store_name: string;
  memo: string;
}

export interface ReceiptAnalysis {
  store_name_raw: string;
  store_name: string;
  date: string | null;
  total: number | null;
  total_source: string;
  items: ReceiptItem[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ReceiptRecord {
  id: number;
  store_name: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  has_image: boolean;
  breakdown: { category: string; amount: number }[];
}

export interface Summary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  expenseByCategory: { category: string; amount: number }[];
  incomeByCategory: { category: string; amount: number }[];
  trend: { month: string; income: number; expense: number }[];
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('kakeibo:logged-out'));
    }
    throw new ApiError(data.error ?? `通信エラー（${res.status}）`, res.status);
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null; needsSetup: boolean }>('GET', '/api/auth/me'),
  setup: (username: string, password: string) => request<{ user: User }>('POST', '/api/auth/setup', { username, password }),
  login: (username: string, password: string) => request<{ user: User }>('POST', '/api/auth/login', { username, password }),
  logout: () => request('POST', '/api/auth/logout'),
  users: () => request<{ id: number; username: string; created_at: string }[]>('GET', '/api/auth/users'),
  addUser: (username: string, password: string) => request<User>('POST', '/api/auth/users', { username, password }),

  transactions: (month: string) => request<Transaction[]>('GET', `/api/transactions?month=${month}`),
  addTransaction: (t: TransactionInput) => request<{ id: number }>('POST', '/api/transactions', t),
  updateTransaction: (id: number, t: TransactionInput) => request('PUT', `/api/transactions/${id}`, t),
  deleteTransaction: (id: number) => request('DELETE', `/api/transactions/${id}`),

  analyzeReceipt: (image_base64: string) =>
    request<ReceiptAnalysis>('POST', '/api/receipts/analyze', { image_base64, media_type: 'image/jpeg' }),
  saveReceipt: (body: {
    image_base64: string;
    media_type: 'image/jpeg';
    store_name: string;
    store_name_raw: string;
    date: string;
    total: number;
    items: ReceiptItem[];
    breakdown: { category: string; amount: number }[];
  }) => request<{ id: number; transactions: number }>('POST', '/api/receipts', body),
  receipts: (q: string, month: string) =>
    request<ReceiptRecord[]>('GET', `/api/receipts?q=${encodeURIComponent(q)}&month=${month}`),
  receiptMonths: () => request<string[]>('GET', '/api/receipts/months'),
  deleteReceipt: (id: number) => request('DELETE', `/api/receipts/${id}`),

  summary: (month: string) => request<Summary>('GET', `/api/reports/summary?month=${month}`),
  lineStatus: (month?: string) =>
    request<{ configured: boolean; month: string; preview: string }>('GET', `/api/reports/line${month ? `?month=${month}` : ''}`),
  lineSend: (month: string) => request('POST', '/api/reports/line/send', { month }),
};
