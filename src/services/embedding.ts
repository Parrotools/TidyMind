/**
 * 文本向量化服务 — Vivo Embedding API
 *
 * API: POST /embedding-model-api/predict/batch
 * 模型: bge-base-zh-v1.5 (中文召回) / m3e-base (通用)
 */

import { generateUUID, LLM_API_CONFIG } from './llm.config';

export type EmbeddingModel = 'bge-base-zh-v1.5' | 'm3e-base';

/**
 * 将文本列表转为向量数组
 *
 * @param sentences  文本列表，每条 ≤500 字符
 * @param model      模型名称
 * @returns 向量二维数组
 */
export async function embedTexts(
  sentences: string[],
  model: EmbeddingModel = 'bge-base-zh-v1.5',
): Promise<number[][]> {
  const appKey = LLM_API_CONFIG.appKey;
  const requestId = generateUUID();

  // bge 模型短 query 需要加 instruction 前缀
  const processed = sentences.map(s => {
    if (model === 'bge-base-zh-v1.5' && s.length < 100) {
      return `为这个句子生成表示以用于检索相关文章：${s}`;
    }
    return s;
  });

  const response = await fetch(
    `https://api-ai.vivo.com.cn/embedding-model-api/predict/batch?requestId=${requestId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appKey}`,
      },
      body: JSON.stringify({ model_name: model, sentences: processed }),
    },
  );

  if (!response.ok) {
    throw new Error(`Embedding Error ${response.status}`);
  }

  const data = await response.json();
  return data?.data ?? [];
}

// ── 工具函数 ──────────────────────────────────────────────────────────────

/** Cosine 相似度 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 在向量列表中找最相似的 Top-K
 */
export function topKSimilar(
  queryVec: number[],
  candidates: Array<{ id: string; vector: number[] }>,
  k = 5,
): Array<{ id: string; score: number }> {
  return candidates
    .map(c => ({ id: c.id, score: cosineSimilarity(queryVec, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
