import { Receipt, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_COLORS } from '../../../shared/categories.ts';
import { api, type Transaction } from '../api.ts';
import { ErrorMessage, MonthSelector, Spinner } from '../components/common.tsx';
import { TransactionForm } from '../components/TransactionForm.tsx';
import { formatDate, thisMonth, yen } from '../utils.ts';

/** 明細の一覧。タップすると修正・削除できる */
export function TransactionsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.transactions(month).then(setRows).catch((err) => setError(err.message));
  }, [month]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const income = rows?.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0) ?? 0;
  const expense = rows?.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0) ?? 0;

  // 日付ごとにまとめる（rows は日付の新しい順で届く）
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const row of rows ?? []) {
    const last = groups[groups.length - 1];
    if (last?.date === row.date) last.items.push(row);
    else groups.push({ date: row.date, items: [row] });
  }

  return (
    <div className="space-y-4">
      <MonthSelector month={month} onChange={setMonth} />
      <ErrorMessage message={error} />

      <div className="card grid grid-cols-3 divide-x divide-gray-100 py-3 text-center">
        <div><p className="text-xs text-gray-500">収入</p><p className="font-bold text-green-600">{yen(income)}</p></div>
        <div><p className="text-xs text-gray-500">支出</p><p className="font-bold text-red-600">{yen(expense)}</p></div>
        <div><p className="text-xs text-gray-500">収支</p><p className={`font-bold ${income - expense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{yen(income - expense)}</p></div>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-10 text-gray-400"><Spinner /></div>
      ) : groups.length === 0 ? (
        <p className="card py-10 text-center text-sm text-gray-500">この月の明細はありません</p>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <h3 className="mb-1 px-1 text-xs font-semibold text-gray-500">{formatDate(g.date)}</h3>
            <ul className="card divide-y divide-gray-100">
              {g.items.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[t.category] ?? '#cbd5e1' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {t.category}
                        {t.source === 'receipt' && <Receipt size={12} className="ml-1 inline text-gray-400" aria-label="レシートから登録" />}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {[t.store_name, t.memo].filter(Boolean).join('・') || ' '}
                      </span>
                    </span>
                    <span className={`whitespace-nowrap font-semibold ${t.type === 'income' ? 'text-green-600' : ''}`}>
                      {t.type === 'income' ? '+' : ''}{yen(t.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {editing && (
        <EditDialog
          transaction={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditDialog({ transaction: t, onClose, onChanged }: { transaction: Transaction; onClose: () => void; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm('この明細を削除しますか？')) return;
    try {
      await api.deleteTransaction(t.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{t.type === 'income' ? '収入' : '支出'}の修正</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-500 hover:bg-gray-100" aria-label="閉じる"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <ErrorMessage message={error} />
          {t.source === 'receipt' && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">レシートから登録した明細です。ここで直しても、保存したレシートの記録は変わりません。</p>
          )}
          <TransactionForm
            initial={{ type: t.type, date: t.date, amount: t.amount, category: t.category, store_name: t.store_name ?? '', memo: t.memo ?? '' }}
            submitLabel="保存する"
            onSubmit={async (input) => {
              try {
                await api.updateTransaction(t.id, input);
                onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : '保存に失敗しました');
                throw err;
              }
            }}
          />
          <button onClick={handleDelete} className="flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={16} />この明細を削除
          </button>
          {t.created_by_name && <p className="text-center text-[11px] text-gray-400">登録した人: {t.created_by_name}</p>}
        </div>
      </div>
    </div>
  );
}
