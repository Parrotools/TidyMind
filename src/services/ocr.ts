/**
 * OCR 识别 + LLM 结构化
 *
 * 方案 A: Vivo 通用 OCR API → 提取原始文字
 * 方案 B: LLM 多模态 → 直接图片理解
 *
 * 推荐组合：A（提取文字）→ B（结构化为笔记格式）
 */

import { callLLM } from './llm';
import { DEFAULT_MODEL } from './llm.config';
import { generateUUID } from './llm.config';
import { OCR_TO_NOTE_PROMPT } from './prompts';

// ── 类型 ──────────────────────────────────────────────────────────────────

export type OCRResult = {
  fullText: string;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
};

// ── Vivo 通用 OCR API ────────────────────────────────────────────────────

/**
 * 调用 Vivo 通用 OCR API 识别图片中的文字
 *
 * API: POST /ocr/general_recognition
 * 鉴权: Bearer AppKey
 */
export async function recognizeText(base64Image: string): Promise<OCRResult> {
  const { LLM_API_CONFIG } = require('./llm.config');
  const appKey = LLM_API_CONFIG.appKey;
  const appId = LLM_API_CONFIG.appId;
  const requestId = generateUUID();
  const domain = 'api-ai.vivo.com.cn';
  const uri = '/ocr/general_recognition';

  // 去掉 data:image/...;base64, 前缀
  const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const formData = new URLSearchParams();
  formData.append('image', pureBase64);
  formData.append('pos', '2');
  formData.append('businessid', `aigc${appId}`);

  const response = await fetch(
    `http://${domain}${uri}?requestId=${requestId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OCR API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Vivo OCR 返回格式: { code: 0, data: { text: "...", items: [...] } }
  const items = data?.data?.items ?? [];
  const fullText =
    data?.data?.text ?? items.map((it: Record<string, unknown>) => it.text).join('\n');

  return {
    fullText,
    lines: items.map((it: Record<string, unknown>) => ({
      text: (it.text as string) ?? '',
      confidence: (it.confidence as number) ?? 0,
    })),
  };
}

// ── LLM 多模态图片理解（备用方案） ───────────────────────────────────────

/**
 * 直接用大模型理解图片（不走 OCR）
 */
export async function analyzeImage(
  imageBase64: string,
  prompt: string,
): Promise<string> {
  return callLLM({
    model: 'Volc-DeepSeek-V3.2',
    messages: [
      {
        role: 'user',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
        ] as any,
      },
    ],
    stream: false,
    maxTokens: 2048,
    temperature: 0.3,
  });
}

// ── OCR 文字 → 笔记结构化 ────────────────────────────────────────────────

/**
 * 将 OCR 原始文本调用 LLM 转化为笔记结构
 */
export async function structureOCRToNote(ocrText: string): Promise<{
  title: string;
  content: string;
  tag: string;
}> {
  const response = await callLLM({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: OCR_TO_NOTE_PROMPT },
      { role: 'user', content: ocrText },
    ],
    stream: false,
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    const parsed = JSON.parse(response);
    return {
      title: parsed.title ?? '未命名笔记',
      content: parsed.content ?? ocrText,
      tag: parsed.tags?.[0] ?? parsed.tag ?? 'OCR',
    };
  } catch {
    return {
      title: 'OCR 识别笔记',
      content: ocrText,
      tag: 'OCR',
    };
  }
}