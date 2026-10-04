import { Router } from 'express';
import { z } from 'zod';
import { createUser, endSession, findUserByCredentials, requireLogin, startSession, userCount } from '../auth.ts';
import { db } from '../db.ts';

export const authRouter = Router();

const Credentials = z.object({
  username: z.string().trim().min(1, 'ユーザー名を入力してください').max(50),
  password: z.string().min(8, 'パスワードは8文字以上にしてください').max(200),
});

/** ログイン状態と、初回セットアップが必要か（ユーザーが1人もいないか）を返す */
authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null, needsSetup: userCount() === 0 });
});

/** 最初の1人目のユーザーを作る。ユーザーが既にいる場合は使えない */
authRouter.post('/setup', (req, res) => {
  if (userCount() > 0) {
    res.status(403).json({ error: 'セットアップは完了しています' });
    return;
  }
  const parsed = Credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const user = createUser(parsed.data.username, parsed.data.password);
  startSession(res, user.id);
  res.json({ user });
});

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  const user = typeof username === 'string' && typeof password === 'string'
    ? findUserByCredentials(username.trim(), password)
    : null;
  if (!user) {
    res.status(401).json({ error: 'ユーザー名かパスワードが違います' });
    return;
  }
  startSession(res, user.id);
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

// ---- 家族のアカウント管理（ログイン中のユーザーなら誰でも追加・一覧できる） ----

authRouter.get('/users', requireLogin, (_req, res) => {
  res.json(db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all());
});

authRouter.post('/users', requireLogin, (req, res) => {
  const parsed = Credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(parsed.data.username);
  if (exists) {
    res.status(409).json({ error: 'そのユーザー名は既に使われています' });
    return;
  }
  res.json(createUser(parsed.data.username, parsed.data.password));
});
