import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../../shared/categories.ts';
import { db, RECEIPT_IMAGE_DIR } from '../db.ts';
import { analyzeReceipt, ReceiptReadError } from '../services/receipt.ts';

export const receiptsRouter = Router();

const ImageInput = z.object({
  image_base64: z.string().min(1),
  media_type: z.enum(['image/jpeg', 'image/png']),
});

/** レシート画像を Claude で読み取る（保存はしない） */
receiptsRouter.post('/analyze', async (req, res) => {
  const parsed = ImageInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '画像が正しく送られていません' });
    return;
  }
  try {
    res.json(await analyzeReceipt(parsed.data.image_base64, parsed.data.media_type));
  } catch (err) {
    if (err instanceof ReceiptReadError) {
      res.status(422).json({ error: err.message });
      return;
    }
    console.error('[receipt] 読み取りに失敗しました:', err);
    res.status(502).json({ error: 'レシートの読み取り中にエラーが起きました。時間をおいてもう一度お試しください' });
  }
});

const SaveInput = ImageInput.extend({
  store_name: z.string().trim().min(1, '店名を入力してください').max(100),
  store_name_raw: z.string().max(200).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  total: z.number().int().min(0),
  items: z.array(z.object({ name: z.string(), price: z.number().int(), category: z.string() })),
  // 家計簿に登録する、カテゴリごとの金額
  breakdown: z
    .array(z.object({ category: z.enum(EXPENSE_CATEGORIES), amount: z.number().int().min(1, '内訳の金額は1円以上にしてください') }))
    .min(1, '内訳を1行以上入力してください'),
});

/** 確認・修正したレシートを保存し、内訳を家計簿の支出として登録する */
receiptsRouter.post('/', (req, res) => {
  const parsed = SaveInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const r = parsed.data;
  const ext = r.media_type === 'image/png' ? 'png' : 'jpg';
  const imageFile = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(RECEIPT_IMAGE_DIR, imageFile), Buffer.from(r.image_base64, 'base64'));

  const save = db.transaction(() => {
    const receiptId = Number(
      db
        .prepare(
          `INSERT INTO receipts (store_name, store_name_raw, date, total, items_json, image_file, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(r.store_name, r.store_name_raw, r.date, r.total, JSON.stringify(r.items), imageFile, req.user!.id)
        .lastInsertRowid,
    );
    const insertTx = db.prepare(
      `INSERT INTO transactions (type, date, amount, category, store_name, memo, source, receipt_id, created_by)
       VALUES ('expense', ?, ?, ?, ?, '', 'receipt', ?, ?)`,
    );
    for (const b of r.breakdown) {
      insertTx.run(r.date, b.amount, b.category, r.store_name, receiptId, req.user!.id);
    }
    return receiptId;
  });

  try {
    res.json({ id: save(), transactions: r.breakdown.length });
  } catch (err) {
    fs.rmSync(path.join(RECEIPT_IMAGE_DIR, imageFile), { force: true });
    throw err;
  }
});

/** 保存したレシートの一覧。?q= で店名検索、?month=YYYY-MM で月を絞り込む */
receiptsRouter.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  const rows = db
    .prepare(
      `SELECT id, store_name, date, total, items_json, image_file, created_at FROM receipts
       WHERE (? = '' OR store_name LIKE '%' || ? || '%')
         AND (? = '' OR substr(date, 1, 7) = ?)
       ORDER BY date DESC, id DESC`,
    )
    .all(q, q, month, month) as { id: number; items_json: string; image_file: string | null }[];

  const breakdownStmt = db.prepare(
    'SELECT category, SUM(amount) AS amount FROM transactions WHERE receipt_id = ? GROUP BY category ORDER BY amount DESC',
  );
  res.json(
    rows.map(({ items_json, image_file, ...row }) => ({
      ...row,
      items: JSON.parse(items_json),
      has_image: Boolean(image_file),
      breakdown: breakdownStmt.all(row.id),
    })),
  );
});

/** レシートのある月の一覧（絞り込み用） */
receiptsRouter.get('/months', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT substr(date, 1, 7) AS month FROM receipts ORDER BY month DESC').all() as { month: string }[];
  res.json(rows.map((r) => r.month));
});

receiptsRouter.get('/:id/image', (req, res) => {
  const row = db.prepare('SELECT image_file FROM receipts WHERE id = ?').get(req.params.id) as { image_file: string | null } | undefined;
  if (!row?.image_file) {
    res.status(404).end();
    return;
  }
  res.sendFile(path.join(RECEIPT_IMAGE_DIR, row.image_file));
});

/** レシートを削除する。レシートから登録した家計簿の明細も一緒に消える */
receiptsRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT image_file FROM receipts WHERE id = ?').get(req.params.id) as { image_file: string | null } | undefined;
  if (!row) {
    res.status(404).json({ error: 'レシートが見つかりません' });
    return;
  }
  db.prepare('DELETE FROM receipts WHERE id = ?').run(req.params.id);
  if (row.image_file) fs.rmSync(path.join(RECEIPT_IMAGE_DIR, row.image_file), { force: true });
  res.json({ ok: true });
});
