import { Router } from 'express';
import { buildMonthlyReport, broadcastText, lineConfigured } from '../services/line.ts';
import { addMonths, currentMonthJst, monthSummary, trend } from '../services/summary.ts';

export const reportsRouter = Router();

const MONTH = /^\d{4}-\d{2}$/;

function monthParam(value: unknown, fallback: string): string {
  return typeof value === 'string' && MONTH.test(value) ? value : fallback;
}

/** 集計画面用：指定月の集計と、直近6か月の推移 */
reportsRouter.get('/summary', (req, res) => {
  const month = monthParam(req.query.month, currentMonthJst());
  res.json({ ...monthSummary(month), trend: trend(month, 6) });
});

/** LINE の設定状態と、送られるレポートのプレビュー（既定は前月分） */
reportsRouter.get('/line', (req, res) => {
  const month = monthParam(req.query.month, addMonths(currentMonthJst(), -1));
  res.json({ configured: lineConfigured(), month, preview: buildMonthlyReport(month) });
});

/** レポートを今すぐ LINE に送る（テスト用。自動送信の記録には残さない） */
reportsRouter.post('/line/send', async (req, res) => {
  const month = monthParam(req.body?.month, addMonths(currentMonthJst(), -1));
  try {
    await broadcastText(buildMonthlyReport(month));
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : '送信に失敗しました' });
  }
});
