import { GoogleGenAI, Type } from '@google/genai';
import { ReceiptData, EmailCandidate } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const RECEIPT_PROMPT = `
あなたは日本のレシート画像を読み取り、家計簿データとして構造化する専門システムです。
画像を解析し、指定のJSON形式のみで出力してください。説明文・マークダウン・コードブロックは一切含めないでください。

# 出力形式
{
 "store_name_raw": "レシート記載の店名そのまま",
 "store_name": "正規化した店舗ブランド名",
 "date": "YYYY-MM-DD または null",
 "total": 支払総額(税込・整数) または null,
 "total_source": "総額を取った行（例:「合計」）",
 "items": [
  { "name": "商品名", "price": 金額(整数), "category": "カテゴリ" }
 ],
 "category_breakdown": { "食費": 1200, "日用品": 480 },
 "confidence": "high / medium / low"
}

# カテゴリ（各商品ごとに1つ）
食費 / 外食 / 日用品 / 医療 / 娯楽 / 衣服 / その他

# 店名の正規化ルール
- 支店名・法人格を落としてブランド名に統一する
 例:「セブン-イレブン○○店」→「セブンイレブン」
 例:「株式会社マツモトキヨシ △△店」→「マツモトキヨシ」
- 全角・半角、カタカナ・英字の表記を一般的な呼称に寄せる
- ブランドが特定できない場合は store_name_raw と同じ値を入れる

# 金額・アイテムのルール
- 税込の実支払総額を total に1つだけ返す
- 「合計」「お買上計」が複数ある場合、税込・最下段・支払額に最も近いものを優先
- 「お預り」「お釣り」「ポイント利用前金額」は total にしない
- category_breakdown は items を category ごとに合計した値
- 値引き・割引は price をマイナス整数で該当カテゴリに反映する
- 「小計」「合計」「お預り」「お釣り」は items に含めない
- category_breakdown の合計が total と大きくずれる場合は confidence を下げる
- 金額は円記号・カンマを除いた整数（"¥1,280" → 1280）

# 全体ルール
- 推測で埋めない。判読不能なフィールドは null にし confidence を下げる
`;

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    store_name_raw: { type: Type.STRING },
    store_name: { type: Type.STRING },
    date: { type: Type.STRING, nullable: true },
    total: { type: Type.INTEGER, nullable: true },
    total_source: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.INTEGER },
          category: { type: Type.STRING }
        }
      }
    },
    category_breakdown: { type: Type.OBJECT },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] }
  },
  required: ["store_name_raw", "store_name", "total_source", "items", "category_breakdown", "confidence"]
};

export const analyzeReceiptImage = async (base64Image: string, mimeType: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: RECEIPT_PROMPT },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: receiptSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");
    
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText) as ReceiptData;
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze receipt image.");
  }
};

const EMAIL_PROMPT = `
あなたはメールの文面から支出情報を抽出するアシスタントです。
以下のメール本文から、支払いに関する情報を抽出し、JSON配列で出力してください。
自動引き落とし、クレジットカード利用通知、サブスクリプションの更新通知などが対象です。
説明文やマークダウンは含めず、JSON配列のみを出力してください。

# 出力形式
[
  {
    "sender": "送信元（推定されるサービス名や会社名）",
    "date": "YYYY-MM-DD（メール内の利用日や請求日。不明な場合はnull）",
    "amount": 金額（整数。不明な場合はnull）,
    "context": "金額が記載されている前後の文脈（30文字程度）"
  }
]

# ルール
- 金額が明記されている箇所を抽出してください。
- 抽出は保守的に行い、金額らしき数字がなければ候補を作らないでください。
- 金額は円記号・カンマを除いた整数にしてください。
`;

const emailSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      sender: { type: Type.STRING },
      date: { type: Type.STRING, nullable: true },
      amount: { type: Type.INTEGER, nullable: true },
      context: { type: Type.STRING }
    },
    required: ["sender", "context"]
  }
};

export const analyzeEmailText = async (emailText: string): Promise<Omit<EmailCandidate, 'id'>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: EMAIL_PROMPT + "\n\n---\n" + emailText }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: emailSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");
    
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText) as Omit<EmailCandidate, 'id'>[];
  } catch (error) {
    console.error("Error analyzing email:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze email text.");
  }
};
