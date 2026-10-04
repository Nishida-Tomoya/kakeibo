import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../../shared/categories.ts';

// ANTHROPIC_API_KEY を環境変数から読む
const client = new Anthropic();

const ReceiptSchema = z.object({
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

// base_system/frontend/services/geminiService.ts のプロンプトを元にしている
const RECEIPT_PROMPT = `あなたは日本のレシート画像を読み取り、家計簿データとして構造化するシステムです。

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

export class ReceiptReadError extends Error {}

export async function analyzeReceipt(imageBase64: string, mediaType: 'image/jpeg' | 'image/png'): Promise<ReceiptAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ReceiptReadError('ANTHROPIC_API_KEY が設定されていません（server/.env を確認してください）');
  }

  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ReceiptSchema) },
    // 安全上の理由で断られた場合に、別モデルで自動的にやり直す
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: RECEIPT_PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new ReceiptReadError('この画像は読み取れませんでした');
  }
  if (!response.parsed_output) {
    throw new ReceiptReadError('読み取り結果の形式が正しくありませんでした。もう一度お試しください');
  }
  return response.parsed_output;
}
