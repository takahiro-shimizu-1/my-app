/**
 * OCR Client Abstraction
 *
 * Wraps Gemini API for document OCR processing.
 * Replaces the inline Gemini calls from the original main.py.
 */

export interface OcrResult {
  markdown: string;
  structuredData: Record<string, unknown>;
  pageCount: number;
}

export interface OcrClient {
  processDocument(pdfBuffer: Buffer, documentId: string): Promise<OcrResult>;
}

export interface OcrConfig {
  apiKey: string;
  model?: string;
  maxConcurrency?: number;
  maxRetries?: number;
}

/**
 * Gemini-based OCR client.
 * Sends PDF buffers to Gemini API and extracts structured data.
 */
export class GeminiOcrClient implements OcrClient {
  private config: Required<OcrConfig>;

  constructor(config: OcrConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? "gemini-2.5-flash",
      maxConcurrency: config.maxConcurrency ?? 5,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  async processDocument(pdfBuffer: Buffer, _documentId: string): Promise<OcrResult> {
    const base64Pdf = pdfBuffer.toString("base64");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Pdf,
                  },
                },
                {
                  text: `この入札公告PDFを分析し、以下の情報をJSON形式で抽出してください：
1. 工事名 (workName)
2. 発注機関 (agencyName)
3. 入札方式 (bidType)
4. 工事場所 (workPlace)
5. 入札期限 (bidEndDate)
6. 要件一覧 (requirements): 各要件のtype(欠格要件/実績要件/所在地要件/等級・種別要件/技術者要件)とtext
7. その他重要事項 (notes)

JSON形式のみで回答してください。`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let structuredData: Record<string, unknown>;
    try {
      structuredData = JSON.parse(text);
    } catch {
      structuredData = { raw: text };
    }

    return {
      markdown: text,
      structuredData,
      pageCount: 0,
    };
  }
}

/**
 * Mock OCR client for testing.
 */
export class MockOcrClient implements OcrClient {
  constructor(private responses: Map<string, OcrResult> = new Map()) {}

  async processDocument(_pdfBuffer: Buffer, documentId: string): Promise<OcrResult> {
    return (
      this.responses.get(documentId) ?? {
        markdown: "# Mock OCR Result",
        structuredData: {},
        pageCount: 1,
      }
    );
  }
}
