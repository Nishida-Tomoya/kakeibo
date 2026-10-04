import cron from 'node-cron';
import { db } from '../db.ts';
import { addMonths, currentMonthJst, monthSummary } from './summary.ts';

// LINE Messaging API のブロードキャスト（公式アカウントを友だち追加した全員に送る）
const BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

export function lineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

const yen = (n: number) => `${n < 0 ? '-' : ''}¥${Math.abs(n).toLocaleString('ja-JP')}`;

/** 指定月（YYYY-MM）の集計レポートの文章を作る */
export function buildMonthlyReport(month: string): string {
  const s = monthSummary(month);
  const prev = monthSummary(addMonths(month, -1));
  const [y, m] = month.split('-').map(Number);

  const lines = [
    `📒 ${y}年${m}月の家計簿レポート`,
    '',
    `収入　${yen(s.income)}`,
    `支出　${yen(s.expense)}`,
    `収支　${yen(s.balance)}`,
  ];

  if (prev.expense > 0) {
    const diff = s.expense - prev.expense;
    lines.push(`（支出は前月より ${diff >= 0 ? '+' : ''}${yen(diff)}）`);
  }

  if (s.expenseByCategory.length > 0) {
    lines.push('', '■ 支出の内訳');
    for (const { category, amount } of s.expenseByCategory) {
      const pct = s.expense > 0 ? Math.round((amount / s.expense) * 100) : 0;
      lines.push(`・${category}　${yen(amount)}（${pct}%）`);
    }
  } else {
    lines.push('', 'この月の支出の登録はありませんでした。');
  }
  return lines.join('\n');
}

export async function broadcastText(text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません（server/.env を確認してください）');

  const res = await fetch(BROADCAST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ type: 'text', text }] }),
  });
  if (!res.ok) {
    throw new Error(`LINE への送信に失敗しました（${res.status}）: ${await res.text()}`);
  }
}

/** 前月分のレポートがまだ送られていなければ送る */
async function sendPreviousMonthReportIfNeeded(): Promise<void> {
  if (!lineConfigured()) return;
  const month = addMonths(currentMonthJst(), -1);
  const sent = db.prepare('SELECT 1 FROM line_reports WHERE month = ?').get(month);
  if (sent) return;

  try {
    await broadcastText(buildMonthlyReport(month));
    db.prepare('INSERT INTO line_reports (month) VALUES (?)').run(month);
    console.log(`[LINE] ${month} の月次レポートを送信しました`);
  } catch (err) {
    console.error('[LINE] 月次レポートの送信に失敗しました:', err);
  }
}

/**
 * 毎月1日 9:00（日本時間）に前月のレポートを送る。
 * その時刻にサーバーが止まっていた場合に備え、月の1〜7日に起動したときは未送信なら送る。
 */
export function scheduleMonthlyReport(): void {
  cron.schedule('0 9 1 * *', sendPreviousMonthReportIfNeeded, { timezone: 'Asia/Tokyo' });

  const nowJst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const day = nowJst.getDate();
  const missedThisMonth = (day === 1 && nowJst.getHours() >= 9) || (day > 1 && day <= 7);
  if (missedThisMonth) void sendPreviousMonthReportIfNeeded();
}
