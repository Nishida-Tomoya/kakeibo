import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { api, type User } from '../api.ts';
import { ErrorMessage, Field } from '../components/common.tsx';

/** ログイン画面。ユーザーがまだ1人もいないときは、最初のアカウントを作る画面になる */
export function LoginPage({ needsSetup, onLogin }: { needsSetup: boolean; onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { user } = needsSetup ? await api.setup(username.trim(), password) : await api.login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <Wallet size={36} className="mx-auto mb-2 text-blue-600" />
          <h1 className="text-xl font-bold">家計簿</h1>
          {needsSetup && <p className="mt-2 text-sm text-gray-500">はじめに、あなたのアカウントを作成してください。</p>}
        </div>
        <ErrorMessage message={error} />
        <Field label="ユーザー名">
          <input value={username} onChange={(e) => setUsername(e.target.value)} required className="input" autoComplete="username" />
        </Field>
        <Field label={needsSetup ? 'パスワード（8文字以上）' : 'パスワード'}>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            minLength={needsSetup ? 8 : undefined} className="input"
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
          />
        </Field>
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {needsSetup ? 'アカウントを作成' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
