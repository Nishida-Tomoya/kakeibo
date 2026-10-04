import React, { useState } from 'react';
import { InputTab } from './tabs/InputTab.tsx';
import { EmailImportTab } from './tabs/EmailImportTab.tsx';
import { AnalyticsTab } from './tabs/AnalyticsTab.tsx';
import { ReceiptsTab } from './tabs/ReceiptsTab.tsx';
import { Wallet, Mail, PieChart, Receipt, FileText } from 'lucide-react';

type TabType = 'input' | 'receipts' | 'email' | 'analytics';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('input');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-center">
          <Receipt className="text-blue-600 mr-2" size={24} />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">家計簿 Pro</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-3xl mx-auto p-4 overflow-y-auto no-scrollbar">
        {activeTab === 'input' && <InputTab />}
        {activeTab === 'receipts' && <ReceiptsTab />}
        {activeTab === 'email' && <EmailImportTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-20">
        <div className="max-w-3xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
              activeTab === 'input' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Wallet size={24} className="mb-1" />
            <span className="text-[10px] font-medium">入力</span>
          </button>
          
          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
              activeTab === 'receipts' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={24} className="mb-1" />
            <span className="text-[10px] font-medium">レシート</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
              activeTab === 'email' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Mail size={24} className="mb-1" />
            <span className="text-[10px] font-medium">メール取込</span>
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
              activeTab === 'analytics' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <PieChart size={24} className="mb-1" />
            <span className="text-[10px] font-medium">集計</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
