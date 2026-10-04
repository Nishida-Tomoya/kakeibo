import { analyzeWithClaude } from './claude.ts';
import { analyzeWithGemini } from './gemini.ts';
import type { ImageMediaType, ReceiptAnalysis } from './receiptPrompt.ts';

export { ReceiptReadError } from './receiptPrompt.ts';

/** レシート読み取りに使う AI。.env の AI_PROVIDER で切り替える（既定は gemini） */
export function aiProvider(): 'gemini' | 'claude' {
  return process.env.AI_PROVIDER === 'claude' ? 'claude' : 'gemini';
}

export function analyzeReceipt(imageBase64: string, mediaType: ImageMediaType): Promise<ReceiptAnalysis> {
  return aiProvider() === 'claude'
    ? analyzeWithClaude(imageBase64, mediaType)
    : analyzeWithGemini(imageBase64, mediaType);
}
