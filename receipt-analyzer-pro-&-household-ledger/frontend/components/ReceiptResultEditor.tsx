import React, { useState, useEffect } from 'react';
import { ReceiptData, Transaction, ReceiptRecord } from '../types.ts';
import { CheckCircle2, AlertCircle, HelpCircle, Store, Calendar, DollarSign, Plus, Trash2, ChevronDown, ChevronUp, List } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../constants.ts';

interface ReceiptResultEditorProps {
  data: ReceiptData;
  onSave: (transactions: Omit<Transaction, 'id' | 'createdAt'>[], editedReceipt: Partial<ReceiptRecord>) => void;
  onCancel: () => void;
}

export const ReceiptResultEditor: React.FC<ReceiptResultEditorProps> = ({ data, onSave, onCancel }) => {
  const [storeName, setStoreName] = useState(data.store_name || '');
  const [date, setDate] = useState(data.date || new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState(data.total?.toString() || '0');
  
  const [breakdown, setBreakdown] = useState<{category: string, amount: number}[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [showItems, setShowItems] = useState(true);

  useEffect(() => {
    let initialBreakdown: {category: string, amount: number}[] = [];

    // 1. 優先: items からカテゴリごとに集計する
    if (data.items && data.items.length > 0) {
      const breakdownMap: Record<string, number> = {};
      data.items.forEach(item => {
        // 規定のカテゴリに含まれない場合は「その他」にする
        const cat = EXPENSE_CATEGORIES.includes(item.category as any) ? item.category : 'その他';
        breakdownMap[cat] = (breakdownMap[cat] || 0) + item.price;
      });

      const rawTotal = Object.values(breakdownMap).reduce((sum, val) => sum + val, 0);
      const parsedTotal = data.total;

      // 税抜(rawTotal)と税込(parsedTotal)がずれている場合、比例配分で税込に合わせる
      if (parsedTotal && rawTotal > 0 && rawTotal !== parsedTotal) {
        let taxedTotal = 0;
        let maxCategory = '';
        let maxAmount = -1;
        const taxedMap: Record<string, number> = {};

        // 比例配分
        for (const [cat, rawAmount] of Object.entries(breakdownMap)) {
          const taxedAmount = Math.round((rawAmount * parsedTotal) / rawTotal);
          taxedMap[cat] = taxedAmount;
          taxedTotal += taxedAmount;

          // 最大金額のカテゴリを記録（誤差吸収用）
          if (rawAmount > maxAmount) {
            maxAmount = rawAmount;
            maxCategory = cat;
          }
        }

        // 丸め誤差の吸収
        const diff = parsedTotal - taxedTotal;
        if (diff !== 0 && maxCategory) {
          taxedMap[maxCategory] += diff;
        }

        initialBreakdown = Object.entries(taxedMap).map(([category, amount]) => ({
          category,
          amount
        }));
      } else {
        // totalがない、またはrawTotalと一致する場合はそのまま
        initialBreakdown = Object.entries(breakdownMap).map(([category, amount]) => ({
          category,
          amount
        }));
      }
    } 
    // 2. 次点: APIが返した category_breakdown を使う
    else if (data.category_breakdown && Object.keys(data.category_breakdown).length > 0) {
      initialBreakdown = Object.entries(data.category_breakdown).map(([category, amount]) => ({
        category,
        amount: Number(amount)
      }));
    } 
    // 3. 最終手段: total しかない場合は「その他」に入れる
    else if (data.total) {
      initialBreakdown.push({ category: 'その他', amount: data.total });
    }
    
    setBreakdown(initialBreakdown);
  }, [data]);

  const handleBreakdownChange = (index: number, field: 'category' | 'amount', value: string) => {
    const newBreakdown = [...breakdown];
    if (field === 'amount') {
      newBreakdown[index].amount = parseInt(value, 10) || 0;
    } else {
      newBreakdown[index].category = value;
    }
    setBreakdown(newBreakdown);
  };

  const addBreakdownRow = () => {
    setBreakdown([...breakdown, { category: 'その他', amount: 0 }]);
  };

  const removeBreakdownRow = (index: number) => {
    setBreakdown(breakdown.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // 支出レコードをカテゴリごとに分割して作成
    const transactions: Omit<Transaction, 'id' | 'createdAt'>[] = breakdown.map(item => ({
      type: 'expense',
      date: date,
      amount: item.amount,
      category: item.category,
      storeName: storeName,
      source: 'receipt',
      memo: `レシート解析: ${data.store_name_raw}`
    }));

    // レシート控え用のデータ
    const editedReceipt: Partial<ReceiptRecord> = {
      storeName,
      date,
      total: parseInt(total, 10) || 0,
      categoryBreakdown: breakdown.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>),
      items: data.items || []
    };

    onSave(transactions, editedReceipt);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle2 size={14} className="mr-1" />;
      case 'medium': return <AlertCircle size={14} className="mr-1" />;
      case 'low': return <HelpCircle size={14} className="mr-1" />;
      default: return null;
    }
  };

  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const isTotalMismatch = parseInt(total, 10) !== breakdownTotal;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-md font-semibold text-gray-800 flex items-center">
          <CheckCircle2 className="text-blue-500 mr-2" size={18} />
          解析結果の確認・編集
        </h2>
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(data.confidence)}`}>
          {getConfidenceIcon(data.confidence)}
          信頼度: {data.confidence.toUpperCase()}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
              <Store size={14} className="mr-1" /> 店舗名
            </label>
            <input 
              type="text" 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">元データ: {data.store_name_raw}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
              <Calendar size={14} className="mr-1" /> 日付
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Total */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
            <DollarSign size={14} className="mr-1" /> 支払総額 (参考)
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-2">¥</span>
            <input 
              type="number" 
              value={total} 
              onChange={(e) => setTotal(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">取得元: {data.total_source}</p>
        </div>

        <hr className="border-gray-100" />

        {/* Category Breakdown */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-medium text-gray-700">カテゴリ別内訳 (登録される明細)</label>
            <button onClick={addBreakdownRow} className="text-xs text-blue-600 flex items-center hover:text-blue-800">
              <Plus size={12} className="mr-1" /> 追加
            </button>
          </div>
          
          <div className="space-y-2">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <select 
                  value={item.category}
                  onChange={(e) => handleBreakdownChange(index, 'category', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex items-center flex-1">
                  <span className="text-gray-500 mr-1 text-sm">¥</span>
                  <input 
                    type="number" 
                    value={item.amount}
                    onChange={(e) => handleBreakdownChange(index, 'amount', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button 
                  onClick={() => removeBreakdownRow(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  disabled={breakdown.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {isTotalMismatch && (
            <p className="text-xs text-orange-600 mt-2 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              内訳の合計 (¥{breakdownTotal.toLocaleString()}) が支払総額と一致しません。
            </p>
          )}
        </div>

        {/* Items Toggle */}
        <div className="pt-2 border-t border-gray-100">
          <button 
            onClick={() => setShowItems(!showItems)}
            className="text-sm font-medium text-gray-700 flex items-center w-full justify-between hover:bg-gray-50 p-2 rounded-md transition-colors"
          >
            <span className="flex items-center">
              <List size={16} className="mr-2 text-gray-500" />
              読み取った商品リスト (税抜・{data.items?.length || 0}件)
            </span>
            {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showItems && (
            <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
              {data.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                  <div className="flex-1 pr-2">
                    <p className="text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500 bg-gray-200 inline-block px-1.5 py-0.5 rounded mt-0.5">{item.category}</p>
                  </div>
                  <div className="font-medium text-gray-900 whitespace-nowrap">
                    ¥{item.price.toLocaleString()}
                  </div>
                </div>
              ))}
              {(!data.items || data.items.length === 0) && (
                <p className="text-xs text-gray-500 text-center py-2">商品明細がありません</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button 
            onClick={handleSave}
            disabled={breakdown.length === 0}
            className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            この内容で登録
          </button>
        </div>

        {/* Raw JSON Toggle */}
        <div className="pt-4 border-t border-gray-100">
          <button 
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-gray-500 flex items-center hover:text-gray-700"
          >
            {showRaw ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
            RAW JSON (デバッグ用)
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 bg-gray-800 text-green-400 text-[10px] font-mono rounded-md overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
