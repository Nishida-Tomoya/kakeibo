import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../../shared/categories.ts';

// レシート読み取りの共通部分（AI に返してほしい形・指示文・エラー）。
// claude.ts と gemini.ts の両方から使う。どちらを使うかは receipt.ts で切り替える。

export const ReceiptSchema = z.object({
  store_name_raw: z.string().describe('レシートに書かれている店名そのまま'),
  store_name: z.string().describe('支店名・法人格を除いて正規化したブランド名'),
  date: z.string().nullable().describe('YYYY-MM-DD。読めなければ null'),
  total: z.number().int().nullable().describe('税込の支払総額。読めなければ null'),
  total_source: z.string().describe('総額を取った行（例:「合計」）'),
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number().int().describe('金額。値引きはマイナス'),
      category: z.enum(EXPENSE_CATEGORIES),
    }),
  ),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type ReceiptAnalysis = z.infer<typeof ReceiptSchema>;
export type ImageMediaType = 'image/jpeg' | 'image/png';

// base_system/frontend/services/geminiService.ts のプロンプトを元にしている
export const RECEIPT_PROMPT = `あなたは日本のレシート画像を読み取り、家計簿データとして構造化するシステムです。

# 各項目のルール
- store_name: 支店名・法人格を落としてブランド名に統一する
  例:「セブン-イレブン○○店」→「セブンイレブン」、「株式会社マツモトキヨシ △△店」→「マツモトキヨシ」
  ブランドが特定できない場合は store_name_raw と同じ値にする
- total: 税込の実支払総額を1つだけ。「合計」「お買上計」が複数あるときは、税込・最下段・支払額に最も近いものを選ぶ。
  「お預り」「お釣り」「ポイント利用前金額」は total にしない
- items: 商品ごとに1行。「小計」「合計」「お預り」「お釣り」は含めない。
  値引き・割引は price をマイナスの整数にし、対象商品と同じカテゴリにする
- category: 食費（スーパー等の食材・飲料）/ 外食（飲食店・テイクアウト）/ 日用品 / 交通費 / 医療（薬を含む）/ 娯楽 / 衣服 / 光熱通信 / その他 から選ぶ
- 金額は円記号・カンマを除いた整数（"¥1,280" → 1280）

# 全体のルール
- 推測で埋めない。読めない項目は null にし、confidence を下げる
- 商品の合計と total が大きくずれる場合も confidence を下げる`;

/** 利用者に見せてよいメッセージを持つエラー（設定漏れ・回数制限・読み取り失敗など） */
export class ReceiptReadError extends Error {}
