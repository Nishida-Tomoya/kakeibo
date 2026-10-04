import { Camera, Edit3 } from 'lucide-react';
import { useState } from 'react';
import type { TransactionType } from '../../../shared/categories.ts';
import { api } from '../api.ts';
import { ErrorMessage, SuccessMessage } from '../components/common.tsx';
import { ReceiptCapture } from '../components/ReceiptCapture.tsx';
import { TransactionForm } from '../components/TransactionForm.tsx';

export function InputPage() {
  const [type, setType] = useState<TransactionType>('expense');
  const [mode, setMode] = useState<'receipt' | 'manual'>('receipt');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setError(null);
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md py-2 text-sm font-medium ${active ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`;

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-gray-200 p-1">
        <button className={tabClass(type === 'expense')} onClick={() => setType('expense')}>支出</button>
        <button className={tabClass(type === 'income')} onClick={() => setType('income')}>収入</button>
      </div>

      <SuccessMessage message={success} />
      <ErrorMessage message={error} />

      {type === 'expense' && (
        <div className="flex border-b border-gray-200">
          {([['receipt', 'レシート読み取り', Camera], ['manual', '手入力', Edit3]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex items-center border-b-2 px-4 pb-2 text-sm font-medium ${mode === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
              <Icon size={16} className="mr-1.5" />{label}
            </button>
          ))}
        </div>
      )}

      {type === 'expense' && mode === 'receipt' ? (
        <ReceiptCapture onSaved={showSuccess} />
      ) : (
        <div className="card p-4">
          <TransactionForm
            key={type}
            type={type}
            submitLabel="登録する"
            onSubmit={async (t) => {
              try {
                await api.addTransaction(t);
                showSuccess('登録しました');
              } catch (err) {
                setError(err instanceof Error ? err.message : '登録に失敗しました');
                throw err;
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
