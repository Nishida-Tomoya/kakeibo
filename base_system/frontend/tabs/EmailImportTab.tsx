import React, { useState } from 'react';
import { analyzeEmailText } from '../services/geminiService.ts';
import { saveTransaction } from '../services/storageService.ts';
import { EmailCandidate, Transaction } from '../types.ts';
import { EXPENSE_CATEGORIES } from '../constants.ts';
import { Mail, Search, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

export const EmailImportTab: React.FC = () => {
  const [emailText, setEmailText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<(EmailCandidate & { selectedCategory: string, isSaved: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setCandidates([]);

    try {
      const results = await analyzeEmailText(emailText);
      const candidatesWithState = results.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        selectedCategory: EXPENSE_CATEGORIES[0],
        isSaved: false
      }));
      setCandidates(candidatesWithState);
      if (candidatesWithState.length === 0) {
        setError("金額情報が見つかりませんでした。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCategoryChange = (id: string, category: string) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, selectedCategory: category } : c));
  };

  const handleSave = (candidate: EmailCandidate & { selectedCategory: string, isSaved: boolean }) => {
    if (!candidate.amount) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: 'expense',
      date: candidate.date || new Date().toISOString().split('T')[0],
      amount: candidate.amount,
      category: candidate.selectedCategory,
      storeName: candidate.sender,
      memo: `メール取込: ${candidate.context.substring(0, 20)}...`,
      source: 'email',
      createdAt: Date.now()
    };

    saveTransaction(transaction);
    setCandidates(candidates.map(c => c.id === candidate.id ? { ...c, isSaved: true } : c));
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-3 text-gray-800">
          <Mail size={20} className="mr-2 text-blue-500" />
          <h2 className="text-md font-semibold">メール本文から抽出</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          引き落とし通知やカード利用メールの本文を貼り付けてください。金額を自動抽出します。
        </p>
        
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          placeholder="メール本文をここにペースト..."
          className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 resize-none mb-4"
        />
        
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !emailText.trim()}
          className="w-full py-2.5 px-4 flex justify-center items-center border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isAnalyzing ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> 解析中...</>
          ) : (
            <><Search size={16} className="mr-2" /> 金額を抽出する</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 px-1">抽出された候補 ({candidates.length}件)</h3>
          {candidates.map(candidate => (
            <div key={candidate.id} className={`bg-white p-4 rounded-xl shadow-sm border ${candidate.isSaved ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{candidate.sender || '送信元不明'}</p>
                  <p className="text-xs text-gray-500">{candidate.date || '日付不明'}</p>
                </div>
                <div className="text-right">
                  {candidate.amount ? (
                    <p className="text-lg font-bold text-gray-900">¥{candidate.amount.toLocaleString()}</p>
                  ) : (
                    <p className="text-sm font-medium text-red-500">金額不明</p>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 mb-3 border border-gray-100">
                <span className="font-medium text-gray-400 mr-1">文脈:</span>
                {candidate.context}
              </div>

              {!candidate.isSaved ? (
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <select
                    value={candidate.selectedCategory}
                    onChange={(e) => handleCategoryChange(candidate.id, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSave(candidate)}
                    disabled={!candidate.amount}
                    className="py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
                  >
                    登録 <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-green-100 flex items-center text-green-600 text-sm font-medium">
                  <CheckCircle size={16} className="mr-1.5" /> 登録済み
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
