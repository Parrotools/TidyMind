/**
 * 文本相似度排序服务 — Vivo Rerank API
 *
 * API: POST /rerank
 * 模型: bge-reranker-large
 * 用途: 对召回结果精排，提升搜索质量
 */

import { generateUUID, LLM_API_CONFIG } from './llm.config';

/**
 * 计算 query 与每个候选句子的相似度分数
 *
 * @param query     查询文本
 * @param sentences 候选句子列表
 * @returns 每个候选句子的分数（越高越相关）
 */
export async function rerank(
  query: string,
  sentences: string[],
): Promise<number[]> {
  const appKey = LLM_API_CONFIG.appKey;
  const requestId = generateUUID();

  const response = await fetch(
    `https://api-ai.vivo.com.cn/rerank?requestId=${requestId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appKey}`,
      },
      body: JSON.stringify({
        model_name: 'bge-reranker-large',
        query,
        sentences,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Rerank Error ${response.status}`);
  }

  const data = await response.json();
  return data?.data ?? [];
}
