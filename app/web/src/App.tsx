import { FileText, List, PieChart, Settings, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type User } from './api.ts';
import { Spinner } from './components/common.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { InputPage } from './pages/InputPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { ReceiptsPage } from './pages/ReceiptsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { TransactionsPage } from './pages/TransactionsPage.tsx';

const TABS = [
  { key: 'input', label: '入力', icon: Wallet },
  { key: 'list', label: '明細', icon: List },
  { key: 'receipts', label: 'レシート', icon: FileText },
  { key: 'analytics', label: '集計', icon: PieChart },
  { key: 'settings', label: '設定', icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function App() {
  const [auth, setAuth] = useState<{ user: User | null; needsSetup: boolean } | null>(null);
  const [tab, setTab] = useState<TabKey>('input');

  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth({ user: null, needsSetup: false }));
    // ログインの期限が切れたら、ログイン画面に戻す
    const onLoggedOut = () => setAuth({ user: null, needsSetup: false });
    window.addEventListener('kakeibo:logged-out', onLoggedOut);
    return () => window.removeEventListener('kakeibo:logged-out', onLoggedOut);
  }, []);

  if (!auth) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400"><Spinner /></div>;
  }
  if (!auth.user) {
    return <LoginPage needsSetup={auth.needsSetup} onLogin={(user) => setAuth({ user, needsSetup: false })} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-center">
          <Wallet size={20} className="mr-2 text-blue-600" />
          <h1 className="font-bold">家計簿</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {tab === 'input' && <InputPage />}
        {tab === 'list' && <TransactionsPage />}
        {tab === 'receipts' && <ReceiptsPage />}
        {tab === 'analytics' && <AnalyticsPage />}
        {tab === 'settings' && <SettingsPage user={auth.user} onLogout={() => setAuth({ user: null, needsSetup: false })} />}
      </main>

      <nav className="fixed bottom-0 z-20 w-full border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 flex-col items-center py-2.5 ${tab === key ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <Icon size={22} className="mb-0.5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
