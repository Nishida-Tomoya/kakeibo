import { Router } from 'express';
import { z } from 'zod';
import { categoriesFor } from '../../../shared/categories.ts';
import { db } from '../db.ts';

export const transactionsRouter = Router();

export const TransactionInput = z
  .object({
    type: z.enum(['expense', 'income']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
    amount: z.number().int('金額は整数で入力してください').min(1, '金額は1円以上にしてください'),
    category: z.string(),
    store_name: z.string().trim().max(100).optional().default(''),
    memo: z.string().trim().max(500).optional().default(''),
  })
  .refine((t) => categoriesFor(t.type).includes(t.category), { message: 'カテゴリが正しくありません' });

const SELECT_COLUMNS = `t.id, t.type, t.date, t.amount, t.category, t.store_name, t.memo, t.source,
  t.receipt_id, t.created_at, u.username AS created_by_name`;

/** 明細の一覧。?month=YYYY-MM で月を絞り込む */
transactionsRouter.get('/', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : null;
  const rows = month
    ? db
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM transactions t LEFT JOIN users u ON u.id = t.created_by
           WHERE substr(t.date, 1, 7) = ? ORDER BY t.date DESC, t.id DESC`,
        )
        .all(month)
    : db
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM transactions t LEFT JOIN users u ON u.id = t.created_by
           ORDER BY t.date DESC, t.id DESC`,
        )
        .all();
  res.json(rows);
});

transactionsRouter.post('/', (req, res) => {
  const parsed = TransactionInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const t = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO transactions (type, date, amount, category, store_name, memo, source, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)`,
    )
    .run(t.type, t.date, t.amount, t.category, t.store_name, t.memo, req.user!.id);
  res.json({ id: Number(result.lastInsertRowid) });
});

transactionsRouter.put('/:id', (req, res) => {
  const parsed = TransactionInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const t = parsed.data;
  const result = db
    .prepare(
      `UPDATE transactions SET type = ?, date = ?, amount = ?, category = ?, store_name = ?, memo = ?,
       updated_at = datetime('now') WHERE id = ?`,
    )
    .run(t.type, t.date, t.amount, t.category, t.store_name, t.memo, req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '明細が見つかりません' });
    return;
  }
  res.json({ ok: true });
});

transactionsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '明細が見つかりません' });
    return;
  }
  res.json({ ok: true });
});
