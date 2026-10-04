import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { RECEIPT_PROMPT, ReceiptReadError, ReceiptSchema, type ImageMediaType, type ReceiptAnalysis } from './receiptPrompt.ts';

let client: Anthropic | null = null;

/** Claude API でレシートを読み取る（AI_PROVIDER=claude のとき） */
export async function analyzeWithClaude(imageBase64: string, mediaType: ImageMediaType): Promise<ReceiptAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ReceiptReadError('ANTHROPIC_API_KEY が設定されていません（server/.env を確認してください）');
  }
  client ??= new Anthropic();

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
