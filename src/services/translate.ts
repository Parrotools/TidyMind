/**
 * 文本翻译服务 — Vivo 翻译 API
 *
 * API: POST /translation/query/self
 * 支持语言: zh-CHS (中文), en (英文), ja (日文), ko (韩文)
 */

import { generateUUID, LLM_API_CONFIG } from './llm.config';

export type Language = 'zh-CHS' | 'en' | 'ja' | 'ko';

const LANGUAGE_NAMES: Record<Language, string> = {
  'zh-CHS': '中文',
  en: '英文',
  ja: '日文',
  ko: '韩文',
};

/**
 * 翻译文本
 *
 * @param text  待翻译文本（≤1200字符）
 * @param from  源语言代码
 * @param to    目标语言代码
 * @returns 翻译结果字符串
 */
export async function translateText(
  text: string,
  from: Language,
  to: Language,
): Promise<string> {
  const appKey = LLM_API_CONFIG.appKey;
  const requestId = generateUUID();

  const response = await fetch(
    `https://api-ai.vivo.com.cn/translation/query/self?requestId=${requestId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        text: text.slice(0, 1200),
        app: 'test',
        requestId,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`翻译失败 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`翻译失败 [${data.code}]`);
  }

  return data?.data?.translation ?? '';
}

export { LANGUAGE_NAMES };
