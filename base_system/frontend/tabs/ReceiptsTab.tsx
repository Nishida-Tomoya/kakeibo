import React, { useState, useEffect, useMemo } from 'react';
import { getReceipts, deleteReceipt } from '../services/storageService.ts';
import { ReceiptRecord } from '../types.ts';
import { Search, Calendar, ChevronDown, ChevronUp, Trash2, Store, Image as ImageIcon } from 'lucide-react';

export const ReceiptsTab: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = () => {
    const data = getReceipts().sort((a, b) => b.date.localeCompare(a.date));
    setReceipts(data);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('このレシートを削除しますか？（家計簿の支出データは削除されません）')) {
      deleteReceipt(id);
      loadReceipts();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const matchName = r.storeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = filterMonth ? r.date.startsWith(filterMonth) : true;
      return matchName && matchMonth;
    });
  }, [receipts, searchTerm, filterMonth]);

  // Get unique months for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    receipts.forEach(r => {
      if (r.date) months.add(r.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [receipts]);

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="店舗名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative sm:w-48">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="">すべての月</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m.replace('-', '年')}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            <ImageIcon size={48} className="mx-auto mb-3 opacity-20" />
            <p>保存されたレシートがありません</p>
          </div>
        ) : (
          filteredReceipts.map(receipt => {
            const isExpanded = expandedId === receipt.id;
            return (
              <div key={receipt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                {/* Header (Clickable) */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(receipt.id)}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                      <Store size={20} />
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-gray-900 truncate">{receipt.storeName}</h3>
                      <p className="text-xs text-gray-500">{receipt.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 flex-shrink-0 pl-2">
                    <span className="font-bold text-gray-900">¥{receipt.total.toLocaleString()}</span>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    
                    {/* Category Breakdown */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">カテゴリ小計</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(receipt.categoryBreakdown).map(([cat, amount]) => (
                          <div key={cat} className="bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm flex items-center shadow-sm">
                            <span className="text-gray-600 mr-2">{cat}</span>
                            <span className="font-medium text-gray-900">¥{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Items List */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">商品明細 ({receipt.items.length}件)</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {receipt.items.length > 0 ? (
                          <ul className="divide-y divide-gray-100">
                            {receipt.items.map((item, idx) => (
                              <li key={idx} className="p-2.5 flex justify-between items-center text-sm hover:bg-gray-50">
                                <div className="flex-1 pr-2 truncate">
                                  <span className="text-gray-800">{item.name}</span>
                                  <span className="ml-2 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.category}</span>
                                </div>
                                <span className="font-medium text-gray-900 whitespace-nowrap">¥{item.price.toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="p-3 text-sm text-gray-500 text-center">明細データがありません</p>
                        )}
                      </div>
                    </div>

                    {/* Image */}
                    {receipt.imageUrl && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">レシート画像</h4>
                        <div className="bg-white p-2 rounded-lg border border-gray-200 flex justify-center">
                          <img 
                            src={receipt.imageUrl} 
                            alt="Receipt" 
                            className="max-h-64 object-contain rounded"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={(e) => handleDelete(receipt.id, e)}
                        className="flex items-center text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} className="mr-1" /> 削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
