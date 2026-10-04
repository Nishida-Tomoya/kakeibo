import { ChevronDown, ChevronUp, ImageIcon, Search, Store, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, type ReceiptRecord } from '../api.ts';
import { ErrorMessage, Spinner } from '../components/common.tsx';
import { formatMonth, yen } from '../utils.ts';

/** 保存したレシートの一覧（店名検索・月で絞り込み） */
export function ReceiptsPage() {
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [months, setMonths] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.receipts(q, month).then(setReceipts).catch((err) => setError(err.message));
  }, [q, month]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // 入力のたびに検索しないよう少し待つ
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api.receiptMonths().then(setMonths).catch(() => {});
  }, []);

  const handleDelete = async (r: ReceiptRecord) => {
    if (!window.confirm(`${r.store_name}（${r.date}）のレシートを削除しますか？\nこのレシートから登録した支出の明細も一緒に削除されます。`)) return;
    try {
      await api.deleteReceipt(r.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-2 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="店名で検索" className="input pl-9" />
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input sm:w-44">
          <option value="">すべての月</option>
          {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      <ErrorMessage message={error} />

      {receipts === null ? (
        <div className="flex justify-center py-10 text-gray-400"><Spinner /></div>
      ) : receipts.length === 0 ? (
        <div className="card border-dashed py-10 text-center text-sm text-gray-500">
          <ImageIcon size={40} className="mx-auto mb-2 opacity-30" />
          保存されたレシートはありません
        </div>
      ) : (
        receipts.map((r) => {
          const open = openId === r.id;
          return (
            <div key={r.id} className="card overflow-hidden">
              <button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50">
                <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Store size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.store_name}</span>
                  <span className="block text-xs text-gray-500">{r.date}</span>
                </span>
                <span className="font-bold">{yen(r.total)}</span>
                {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {open && (
                <div className="space-y-4 border-t border-gray-100 bg-gray-50 p-4">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-gray-500">家計簿に登録した内訳</h4>
                    <div className="flex flex-wrap gap-2">
                      {r.breakdown.map((b) => (
                        <span key={b.category} className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm">
                          <span className="mr-2 text-gray-600">{b.category}</span>
                          <span className="font-medium">{yen(b.amount)}</span>
                        </span>
                      ))}
                      {r.breakdown.length === 0 && <span className="text-xs text-gray-400">（明細はすべて削除されています）</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-gray-500">品目（{r.items.length}件）</h4>
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
                      {r.items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-2 px-3 py-2">
                          <span className="truncate">
                            {item.name}
                            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{item.category}</span>
                          </span>
                          <span className="whitespace-nowrap font-medium">{yen(item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {r.has_image && (
                    <img src={`/api/receipts/${r.id}/image`} alt="レシート画像" loading="lazy" className="mx-auto max-h-80 rounded-lg border border-gray-200 bg-white object-contain" />
                  )}

                  <div className="flex justify-end">
                    <button onClick={() => handleDelete(r)} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
