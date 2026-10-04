import { AlertCircle, Camera, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { breakdownFromItems, EXPENSE_CATEGORIES } from '../../../shared/categories.ts';
import { api, type ReceiptAnalysis } from '../api.ts';
import { compressImage, today, yen } from '../utils.ts';
import { ErrorMessage, Field, Spinner } from './common.tsx';

const CONFIDENCE_LABEL = {
  high: { text: '読み取り精度: 高', className: 'border-green-200 bg-green-50 text-green-700' },
  medium: { text: '読み取り精度: 中', className: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
  low: { text: '読み取り精度: 低（要確認）', className: 'border-red-200 bg-red-50 text-red-700' },
};

/** レシート画像を選ぶ → Claude で読み取る → 内容を確認・修正して登録する */
export function ReceiptCapture({ onSaved }: { onSaved: (message: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<{ base64: string; dataUrl: string } | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      setAnalysis(await api.analyzeReceipt(compressed.base64));
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み取りに失敗しました');
    } finally {
      setAnalyzing(false);
    }
  };

  if (image && analysis) {
    return (
      <ReceiptEditor
        analysis={analysis}
        imageBase64={image.base64}
        onCancel={reset}
        onSaved={(message) => {
          reset();
          onSaved(message);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {!image ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="card flex w-full flex-col items-center gap-3 border-2 border-dashed border-blue-300 p-8 hover:bg-blue-50"
        >
          <span className="rounded-full bg-blue-100 p-3 text-blue-600"><Camera size={28} /></span>
          <span className="font-medium text-gray-700">レシートを撮影・選択</span>
          <span className="text-xs text-gray-500">AI が店名・日付・金額・品目を読み取ります</span>
        </button>
      ) : (
        <div className="card relative overflow-hidden">
          <img src={image.dataUrl} alt="レシート" className="max-h-96 w-full bg-gray-50 object-contain" />
          {analyzing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-sm">
              <Spinner className="h-8 w-8 border-4 text-blue-600" />
              <p className="rounded-full bg-white px-3 py-1 text-sm font-medium text-blue-800 shadow-sm">読み取り中…（数十秒かかることがあります）</p>
            </div>
          ) : (
            <button onClick={reset} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-sm hover:text-red-600" aria-label="やり直す">
              <X size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReceiptEditor({ analysis, imageBase64, onCancel, onSaved }: {
  analysis: ReceiptAnalysis;
  imageBase64: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [storeName, setStoreName] = useState(analysis.store_name);
  const [date, setDate] = useState(analysis.date ?? today());
  const [total, setTotal] = useState(String(analysis.total ?? 0));
  const [breakdown, setBreakdown] = useState(() => breakdownFromItems(analysis.items, analysis.total));
  const [showItems, setShowItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdownTotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const mismatch = Number(total) !== breakdownTotal;
  const confidence = CONFIDENCE_LABEL[analysis.confidence];

  const updateRow = (index: number, patch: Partial<{ category: string; amount: number }>) =>
    setBreakdown(breakdown.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.saveReceipt({
        image_base64: imageBase64,
        media_type: 'image/jpeg',
        store_name: storeName,
        store_name_raw: analysis.store_name_raw,
        date,
        total: Number(total) || 0,
        items: analysis.items,
        breakdown,
      });
      onSaved(`レシートを保存し、${result.transactions}件の支出を登録しました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setSaving(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="font-semibold">読み取り結果の確認</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidence.className}`}>{confidence.text}</span>
      </div>

      <div className="space-y-4 p-4">
        <ErrorMessage message={error} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="店名">
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input" />
            <span className="mt-1 block text-[11px] text-gray-400">レシートの表記: {analysis.store_name_raw}</span>
          </Field>
          <Field label="日付">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="支払総額（円）">
          <input type="number" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} className="input" />
          <span className="mt-1 block text-[11px] text-gray-400">読み取った行: {analysis.total_source}</span>
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">家計簿に登録する内訳（カテゴリごと）</span>
            <button onClick={() => setBreakdown([...breakdown, { category: 'その他', amount: 0 }])} className="flex items-center text-xs text-blue-600">
              <Plus size={14} className="mr-0.5" />行を追加
            </button>
          </div>
          <div className="space-y-2">
            {breakdown.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={b.category} onChange={(e) => updateRow(i, { category: e.target.value })} className="input flex-1">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number" inputMode="numeric" value={b.amount}
                  onChange={(e) => updateRow(i, { amount: parseInt(e.target.value, 10) || 0 })}
                  className="input flex-1"
                />
                <button
                  onClick={() => setBreakdown(breakdown.filter((_, j) => j !== i))}
                  disabled={breakdown.length === 1}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30" aria-label="この行を削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {mismatch && (
            <p className="mt-2 flex items-center text-xs text-orange-600">
              <AlertCircle size={14} className="mr-1 shrink-0" />
              内訳の合計（{yen(breakdownTotal)}）が支払総額と一致しません
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-2">
          <button onClick={() => setShowItems(!showItems)} className="flex w-full items-center justify-between rounded-md p-2 text-sm text-gray-700 hover:bg-gray-50">
            <span>読み取った品目（{analysis.items.length}件）</span>
            {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showItems && (
            <ul className="mt-1 max-h-60 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 text-sm">
              {analysis.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate">
                    {item.name}
                    <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{item.category}</span>
                  </span>
                  <span className="whitespace-nowrap font-medium">{yen(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="btn-secondary flex-1">キャンセル</button>
          <button onClick={handleSave} disabled={saving || breakdown.length === 0} className="btn-primary flex-1">
            この内容で登録
          </button>
        </div>
      </div>
    </div>
  );
}
