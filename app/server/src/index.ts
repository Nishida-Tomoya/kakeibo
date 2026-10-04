import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { loadUser, requireLogin } from './auth.ts';
import { authRouter } from './routes/auth.ts';
import { receiptsRouter } from './routes/receipts.ts';
import { reportsRouter } from './routes/reports.ts';
import { transactionsRouter } from './routes/transactions.ts';
import { scheduleMonthlyReport } from './services/line.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' })); // レシート画像を base64 で受け取るため大きめ
app.use(loadUser);

// パスワードの総当たりを防ぐため、ログイン系は15分に20回までに制限する
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { error: '試行回数が多すぎます。しばらく待ってからお試しください' } });
app.use(['/api/auth/login', '/api/auth/setup'], authLimiter);

app.use('/api/auth', authRouter);
app.use('/api/transactions', requireLogin, transactionsRouter);
app.use('/api/receipts', requireLogin, receiptsRouter);
app.use('/api/reports', requireLogin, reportsRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 本番では、ビルド済みの画面（web/dist）もこのサーバーから配信する
const webDist = path.resolve(here, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーでエラーが起きました' });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`家計簿サーバーを起動しました: http://localhost:${PORT}`);
  scheduleMonthlyReport();
});
