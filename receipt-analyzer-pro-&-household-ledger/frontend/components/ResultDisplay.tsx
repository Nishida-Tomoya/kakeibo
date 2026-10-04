import React from 'react';
import { ReceiptData } from '../types.ts';
import { CheckCircle2, AlertCircle, HelpCircle, Store, Calendar, DollarSign, Tag, Info } from 'lucide-react';

interface ResultDisplayProps {
  data: ReceiptData | null;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <ImageIcon size={48} className="mb-4 opacity-50" />
        <p>画像をアップロードすると、ここに解析結果が表示されます</p>
      </div>
    );
  }

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
      case 'high': return <CheckCircle2 size={16} className="mr-1" />;
      case 'medium': return <AlertCircle size={16} className="mr-1" />;
      case 'low': return <HelpCircle size={16} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <CheckCircle2 className="text-blue-500 mr-2" size={20} />
          解析結果
        </h2>
        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(data.confidence)}`}>
          {getConfidenceIcon(data.confidence)}
          信頼度: {data.confidence.toUpperCase()}
        </div>
      </div>

      <div className="p-6 flex-grow overflow-y-auto">
        <div className="space-y-6">
          
          {/* Store Info */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-1">
              <Store size={20} />
            </div>
            <div className="flex-grow">
              <p className="text-sm text-gray-500 mb-1">店舗名 (正規化)</p>
              <p className="text-xl font-bold text-gray-900">{data.store_name || '不明'}</p>
              <p className="text-xs text-gray-400 mt-1">元データ: {data.store_name_raw}</p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Date & Total */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mt-1">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">日付</p>
                <p className="text-lg font-semibold text-gray-800">{data.date || '不明'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg mt-1">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">支払総額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.total !== null ? `¥${data.total.toLocaleString()}` : '不明'}
                </p>
                <p className="text-xs text-gray-400 mt-1">取得元: {data.total_source}</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Category */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg mt-1">
              <Tag size={20} />
            </div>
            <div className="flex-grow">
              <p className="text-sm text-gray-500 mb-1">カテゴリ</p>
              <div className="flex items-center space-x-3">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-md font-medium">
                  {data.category}
                </span>
              </div>
              <div className="mt-3 bg-gray-50 p-3 rounded-md border border-gray-100 flex items-start space-x-2">
                <Info size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">判定理由:</span> {data.category_reason}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Raw JSON View (Collapsible or just at the bottom) */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2 font-mono uppercase tracking-wider">Raw JSON Output</p>
        <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Helper icon for empty state
const ImageIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
