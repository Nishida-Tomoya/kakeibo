import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { RECEIPT_PROMPT, ReceiptReadError, ReceiptSchema, type ImageMediaType, type ReceiptAnalysis } from './receiptPrompt.ts';

// 無料枠で使える Flash 系モデル。.env の GEMINI_MODEL で最初に使うモデルを変えられる
const DEFAULT_MODEL = 'gemini-3.8-flash';
// 最初のモデルが混雑中（503）や回数上限（429）のときに、代わりに使う軽いモデル
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

let client: GoogleGenAI | null = null;

/** Gemini API でレシートを読み取る（AI_PROVIDER=gemini のとき。既定） */
export async function analyzeWithGemini(imageBase64: string, mediaType: ImageMediaType): Promise<ReceiptAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ReceiptReadError('GEMINI_API_KEY が設定されていません（server/.env を確認してください）');
  }
  client ??= new GoogleGenAI({ apiKey });

  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, FALLBACK_MODEL])];
  let lastStatus = 0;
  for (const model of models) {
    try {
      return parseResult(await generate(client, model, imageBase64, mediaType));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 429 || err.status === 503)) {
        console.warn(`[gemini] ${model} が使えなかったため、次のモデルを試します（${err.status}）`);
        lastStatus = err.status;
        continue;
      }
      if (err instanceof ApiError && (err.status === 400 || err.status === 403) && /API key/i.test(err.message)) {
        throw new ReceiptReadError('GEMINI_API_KEY が正しくありません（server/.env を確認してください）');
      }
      throw err;
    }
  }
  throw new ReceiptReadError(
    lastStatus === 429
      ? 'AI の無料枠の利用回数の上限に達しました。しばらく時間をおいてからお試しください'
      : 'AI が混み合っています。しばらく時間をおいてからお試しください',
  );
}

async function generate(client: GoogleGenAI, model: string, imageBase64: string, mediaType: ImageMediaType) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: RECEIPT_PROMPT }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(ReceiptSchema),
      temperature: 0.1,
    },
  });
  return response.text;
}

function parseResult(text: string | undefined): ReceiptAnalysis {
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // 下の safeParse で失敗として扱う
  }
  const parsed = ReceiptSchema.safeParse(json);
  if (!parsed.success) {
    throw new ReceiptReadError('読み取り結果の形式が正しくありませんでした。もう一度お試しください');
  }
  return parsed.data;
}
