import { LogOut, MessageCircle, Send, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type User } from '../api.ts';
import { ErrorMessage, Field, SuccessMessage } from '../components/common.tsx';
import { addMonths, formatMonth, thisMonth } from '../utils.ts';

export function SettingsPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="space-y-4">
      <section className="card flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-gray-500">ログイン中</p>
          <p className="font-bold">{user.username}</p>
        </div>
        <button
          onClick={async () => {
            await api.logout().catch(() => {});
            onLogout();
          }}
          className="btn-secondary flex items-center gap-1"
        >
          <LogOut size={16} />ログアウト
        </button>
      </section>
      <FamilyAccounts />
      <LineReport />
    </div>
  );
}

function FamilyAccounts() {
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = () => api.users().then(setUsers).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.addUser(username.trim(), password);
      setSuccess(`${username.trim()} さんのアカウントを作りました`);
      setUsername('');
      setPassword('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました');
    }
  };

  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center font-semibold"><Users size={18} className="mr-2 text-blue-500" />家族のアカウント</h2>
      <p className="text-xs text-gray-500">全員が同じ家計簿を見て、登録・修正できます。</p>
      <ul className="flex flex-wrap gap-2">
        {users.map((u) => <li key={u.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{u.username}</li>)}
      </ul>
      <form onSubmit={handleAdd} className="space-y-3 border-t border-gray-100 pt-3">
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="ユーザー名">
            <input value={username} onChange={(e) => setUsername(e.target.value)} required className="input" autoComplete="off" />
          </Field>
          <Field label="パスワード（8文字以上）">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input" autoComplete="new-password" />
          </Field>
        </div>
        <button type="submit" className="btn-secondary flex w-full items-center justify-center gap-1">
          <UserPlus size={16} />アカウントを追加
        </button>
      </form>
    </section>
  );
}

function LineReport() {
  const [month, setMonth] = useState(addMonths(thisMonth(), -1));
  const [status, setStatus] = useState<{ configured: boolean; preview: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.lineStatus(month).then(setStatus).catch((err) => setError(err.message));
  }, [month]);

  const handleSend = async () => {
    if (!window.confirm(`${formatMonth(month)}のレポートを、公式アカウントの友だち全員に送りますか？`)) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await api.lineSend(month);
      setSuccess('LINE に送信しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // 直近12か月から選べるようにする
  const monthOptions = Array.from({ length: 12 }, (_, i) => addMonths(thisMonth(), -i));

  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center font-semibold"><MessageCircle size={18} className="mr-2 text-green-500" />LINE 月次レポート</h2>
      <p className="text-xs text-gray-500">
        毎月1日の9時に、前月の集計を LINE 公式アカウントの友だち全員に自動で送ります。
      </p>
      {status && (
        <p className={`rounded-lg px-3 py-2 text-xs ${status.configured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-800'}`}>
          {status.configured
            ? 'LINE の設定は完了しています。'
            : 'LINE のチャネルアクセストークンが未設定のため、送信されません（server/.env の LINE_CHANNEL_ACCESS_TOKEN を設定してください）。'}
        </p>
      )}
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      <Field label="プレビューする月">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input">
          {monthOptions.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </Field>
      {status && <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-sans text-sm">{status.preview}</pre>}
      <button onClick={handleSend} disabled={!status?.configured || sending} className="btn-primary flex w-full items-center justify-center gap-1">
        <Send size={16} />このレポートを今すぐ送る
      </button>
    </section>
  );
}
