import { useState } from 'react';
import { categoriesFor, type TransactionType } from '../../../shared/categories.ts';
import type { TransactionInput } from '../api.ts';
import { today } from '../utils.ts';
import { Field } from './common.tsx';

interface Props {
  initial?: TransactionInput;
  /** 新規登録のときは収入/支出を親が決める。修正のときは initial.type を使う */
  type?: TransactionType;
  submitLabel: string;
  onSubmit: (t: TransactionInput) => Promise<void>;
}

/** 収入・支出の入力フォーム（新規登録と修正で共用） */
export function TransactionForm({ initial, type: typeProp, submitLabel, onSubmit }: Props) {
  const type = initial?.type ?? typeProp ?? 'expense';
  const categories = categoriesFor(type);

  const [date, setDate] = useState(initial?.date ?? today());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category ?? categories[0]);
  const [storeName, setStoreName] = useState(initial?.store_name ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [submitting, setSubmitting] = useState(false);

  // 収入/支出を切り替えたときに、存在しないカテゴリが選ばれたままにならないようにする
  const selectedCategory = categories.includes(category) ? category : categories[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ type, date, amount: Number(amount), category: selectedCategory, store_name: storeName, memo });
      if (!initial) {
        setAmount('');
        setStoreName('');
        setMemo('');
      }
    } catch {
      // エラー表示は onSubmit 側で行う。入力内容は消さずに残す
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="日付">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        <Field label="金額（円）">
          <input
            type="number" inputMode="numeric" required min={1} step={1}
            value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0"
          />
        </Field>
      </div>

      <Field label="カテゴリ">
        <select value={selectedCategory} onChange={(e) => setCategory(e.target.value)} className="input">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      {type === 'expense' && (
        <Field label="店名（任意）">
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input" placeholder="スーパー、コンビニなど" />
        </Field>
      )}

      <Field label="メモ（任意）">
        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="input" />
      </Field>

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
        {submitLabel}
      </button>
    </form>
  );
}
