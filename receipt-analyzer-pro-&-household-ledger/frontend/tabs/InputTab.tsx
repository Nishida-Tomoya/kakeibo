import React, { useState, useCallback } from 'react';
import { ImageUploader } from '../components/ImageUploader.tsx';
import { ReceiptResultEditor } from '../components/ReceiptResultEditor.tsx';
import { analyzeReceiptImage } from '../services/geminiService.ts';
import { saveTransactions, saveTransaction, saveReceipt } from '../services/storageService.ts';
import { ReceiptData, Transaction, ReceiptRecord } from '../types.ts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants.ts';
import { Camera, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';

// Utility to compress image to save localStorage space
const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const InputTab: React.FC = () => {
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [expenseInputType, setExpenseInputType] = useState<'receipt' | 'manual'>('receipt');
  
  // Receipt State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [receiptResult, setReceiptResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Input State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [manualStore, setManualStore] = useState('');
  const [manualMemo, setManualMemo] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleImageSelected = useCallback(async (file: File) => {
    setReceiptResult(null);
    setError(null);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Compress image before setting to state and sending to API
        const compressed = await compressImage(base64data);
        setCompressedImage(compressed);
        setPreviewUrl(compressed);

        const base64String = compressed.split(',')[1];
        try {
          const parsedData = await analyzeReceiptImage(base64String, 'image/jpeg');
          setReceiptResult(parsedData);
        } catch (apiError) {
          setError(apiError instanceof Error ? apiError.message : "解析エラー");
        } finally {
          setIsLoading(false);
        }
      };
    } catch (err) {
      setError("予期せぬエラーが発生しました。");
      setIsLoading(false);
    }
  }, []);

  const handleClearReceipt = useCallback(() => {
    setPreviewUrl(null);
    setCompressedImage(null);
    setReceiptResult(null);
    setError(null);
  }, []);

  const handleSaveReceipt = (transactionsData: Omit<Transaction, 'id' | 'createdAt'>[], editedReceipt: Partial<ReceiptRecord>) => {
    // 1. Save transactions for the ledger
    const newTransactions: Transaction[] = transactionsData.map(t => ({
      ...t,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    }));
    saveTransactions(newTransactions);

    // 2. Save the receipt record itself
    if (compressedImage) {
      const receiptRecord: ReceiptRecord = {
        id: crypto.randomUUID(),
        storeName: editedReceipt.storeName || '不明な店舗',
        date: editedReceipt.date || new Date().toISOString().split('T')[0],
        total: editedReceipt.total || 0,
        items: editedReceipt.items || [],
        categoryBreakdown: editedReceipt.categoryBreakdown || {},
        imageUrl: compressedImage,
        createdAt: Date.now()
      };
      saveReceipt(receiptRecord);
    }

    handleClearReceipt();
    showSuccess(`${newTransactions.length}件の明細とレシートを保存しました`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || isNaN(Number(manualAmount))) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: transactionType,
      date: manualDate,
      amount: Number(manualAmount),
      category: manualCategory,
      storeName: manualStore,
      memo: manualMemo,
      source: 'manual',
      createdAt: Date.now()
    };

    saveTransaction(newTransaction);
    setManualAmount('');
    setManualStore('');
    setManualMemo('');
    showSuccess('登録しました');
  };

  React.useEffect(() => {
    if (transactionType === 'expense') setManualCategory(EXPENSE_CATEGORIES[0]);
    else setManualCategory(INCOME_CATEGORIES[0]);
  }, [transactionType]);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Top Type Switcher */}
      <div className="flex p-1 bg-gray-200 rounded-lg mb-6">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${transactionType === 'expense' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTransactionType('expense')}
        >
          支出
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${transactionType === 'income' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTransactionType('income')}
        >
          収入
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle size={18} className="mr-2" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {transactionType === 'expense' && (
        <div className="mb-6 flex border-b border-gray-200">
          <button
            className={`pb-2 px-4 text-sm font-medium flex items-center border-b-2 transition-colors ${expenseInputType === 'receipt' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setExpenseInputType('receipt')}
          >
            <Camera size={16} className="mr-1.5" /> レシート撮影
          </button>
          <button
            className={`pb-2 px-4 text-sm font-medium flex items-center border-b-2 transition-colors ${expenseInputType === 'manual' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setExpenseInputType('manual')}
          >
            <Edit3 size={16} className="mr-1.5" /> 手動入力
          </button>
        </div>
      )}

      {/* Receipt Input Area */}
      {transactionType === 'expense' && expenseInputType === 'receipt' && (
        <div className="space-y-6">
          {!receiptResult ? (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <ImageUploader 
                onImageSelected={handleImageSelected} 
                previewUrl={previewUrl} 
                onClear={handleClearReceipt}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <ReceiptResultEditor 
              data={receiptResult} 
              onSave={handleSaveReceipt} 
              onCancel={handleClearReceipt} 
            />
          )}
        </div>
      )}

      {/* Manual Input Area (Expense or Income) */}
      {((transactionType === 'expense' && expenseInputType === 'manual') || transactionType === 'income') && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">日付</label>
              <input 
                type="date" required
                value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">金額</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">¥</span>
                <input 
                  type="number" required min="1"
                  value={manualAmount} onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full pl-8 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ</label>
            <select 
              value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {transactionType === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">店名 (任意)</label>
              <input 
                type="text" 
                value={manualStore} onChange={(e) => setManualStore(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="スーパー、コンビニなど"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ (任意)</label>
            <input 
              type="text" 
              value={manualMemo} onChange={(e) => setManualMemo(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="詳細など"
            />
          </div>

          <button 
            type="submit"
            className="w-full mt-4 py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            登録する
          </button>
        </form>
      )}
    </div>
  );
};
