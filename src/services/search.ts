/**
 * AI 语义搜索服务
 *
 * 将用户自然语言查询 + 笔记列表 → LLM 语义匹配 → 返回匹配结果
 */

import { callLLM } from './llm';
import { DEFAULT_MODEL } from './llm.config';
import { SEARCH_SYSTEM_PROMPT } from './prompts';
import { Note } from '../types/note';

// ── 类型 ──────────────────────────────────────────────────────────────────

export type SearchResult = {
  note: Note;
  /** 匹配分数 0~1 */
  score: number;
  /** AI 给出的匹配理由 */
  reasoning: string;
};

// ── 语义搜索 ──────────────────────────────────────────────────────────────

/**
 * 用 LLM 对笔记进行语义搜索
 *
 * @param query  用户的自然语言查询
 * @param notes  要搜索的笔记列表
 * @returns      按分数降序排列的匹配结果
 */
export async function semanticSearch(
  query: string,
  notes: Note[],
): Promise<SearchResult[]> {
  if (!notes.length) return [];

  // 构建笔记列表文本（每篇笔记截取前 300 字以控制 token 消耗）
  const notesText = notes
    .map(
      (n, i) =>
        `[${i}] 标题:${n.title} | 标签:${n.tags.join(',')} | 内容:${n.content.slice(0, 300)}`,
    )
    .join('\n---\n');

  const response = await callLLM({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SEARCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `查询: ${query}\n\n笔记列表:\n${notesText}`,
      },
    ],
    stream: false,
    temperature: 0.2,
    maxTokens: 2048,
  });

  // 解析 LLM 返回的 JSON
  try {
    const parsed = JSON.parse(response);
    const ids: string[] = parsed.ids ?? [];
    const reasoning: string = parsed.reasoning ?? '';

    // 构建结果列表
    const results: SearchResult[] = [];
    for (let i = 0; i < ids.length && i < notes.length; i++) {
      const note = notes.find(n => n.id === ids[i]);
      if (note) {
        results.push({
          note,
          score: 1 - i * 0.15, // 递减分数
          reasoning,
        });
      }
    }
    return results;
  } catch {
    // JSON 解析失败 → 尝试从响应中直接提取笔记 ID
    const idMatches = response.match(/[a-zA-Z0-9_-]{10,}/g) ?? [];
    const results: SearchResult[] = [];
    for (const id of idMatches) {
      const note = notes.find(n => n.id === id);
      if (note && !results.find(r => r.note.id === note.id)) {
        results.push({ note, score: 0.5, reasoning: '' });
      }
    }
    return results;
  }
}

// ── 本地关键词搜索（即时响应） ────────────────────────────────────────────

/**
 * 本地关键词过滤（毫秒级）
 *
 * 作为 AI 搜索前的即时反馈
 */
export function keywordSearch(query: string, notes: Note[]): Note[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return notes.filter(note => {
    const haystack =
      `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
