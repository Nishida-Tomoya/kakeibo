import { Transaction, ReceiptRecord } from '../types.ts';

const STORAGE_KEY = 'receipt_analyzer_transactions_v2';
const STORAGE_KEY_RECEIPTS = 'receipt_analyzer_receipts_v1';

// --- Transactions ---

export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse transactions from local storage", e);
    return [];
  }
};

export const saveTransaction = (transaction: Transaction) => {
  const transactions = getTransactions();
  transactions.push(transaction);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
};

export const saveTransactions = (newTransactions: Transaction[]) => {
  const transactions = getTransactions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...transactions, ...newTransactions]));
};

export const deleteTransaction = (id: string) => {
  const transactions = getTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// --- Receipts ---

export const getReceipts = (): ReceiptRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse receipts from local storage", e);
    return [];
  }
};

export const saveReceipt = (receipt: ReceiptRecord) => {
  const receipts = getReceipts();
  receipts.push(receipt);
  try {
    localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(receipts));
  } catch (e) {
    console.error("Failed to save receipt, possibly quota exceeded", e);
    alert("保存容量の上限に達した可能性があります。不要なレシートを削除してください。");
  }
};

export const deleteReceipt = (id: string) => {
  const receipts = getReceipts();
  const filtered = receipts.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(filtered));
};
