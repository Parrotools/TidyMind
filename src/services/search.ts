/**
 * AI 语义搜索 + RAG 问答服务
 *
 * 两阶段搜索：
 * 1. LLM 语义搜索（现有）
 * 2. RAG 向量搜索 + 精排（新增）
 */

import { callLLM } from './llm';
import { DEFAULT_MODEL } from './llm.config';
import { SEARCH_SYSTEM_PROMPT } from './prompts';
import { embedTexts, topKSimilar } from './embedding';
import { rerank } from './rerank';
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
        `[${i}] 标题:${n.title} | 标签:${n.tag || ''} | 内容:${n.content.slice(0, 300)}`,
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

// ── RAG 问答（向量召回 + 精排 + LLM 生成） ──────────────────────────────

/**
 * 向量缓存 — 避免每次搜索都重新向量化所有笔记
 *
 * key: note.id, value: vector
 */
const vectorCache = new Map<string, number[]>();

/** 为所有笔记构建/更新向量索引 */
export async function buildNoteIndex(notes: Note[]): Promise<void> {
  const uncached = notes.filter(n => !vectorCache.has(n.id));
  if (uncached.length === 0) return;

  const texts = uncached.map(
    n => `${n.title}\n${n.tag || ''}\n${n.content.slice(0, 400)}`,
  );

  try {
    const vectors = await embedTexts(texts);
    vectors.forEach((vec, i) => {
      vectorCache.set(uncached[i].id, vec);
    });
  } catch {
    // 向量化失败时降级为 LLM 搜索
  }
}

/**
 * RAG 问答：向量召回 → 精排 → 构建上下文 → LLM 生成
 *
 * @returns { answer, sources } AI 回答 + 引用来源
 */
export async function ragSearch(
  query: string,
  notes: Note[],
): Promise<{ answer: string; sources: Note[] }> {
  // 阶段 1：向量召回 Top-10
  let candidates: Array<{ id: string; score: number }> = [];

  try {
    const [queryVec] = await embedTexts([query]);
    const candidatesList = notes
      .filter(n => vectorCache.has(n.id))
      .map(n => ({ id: n.id, vector: vectorCache.get(n.id)! }));

    if (candidatesList.length > 0) {
      candidates = topKSimilar(queryVec, candidatesList, 10);
    }
  } catch {
    // 向量召回失败 → 降级为 LLM 搜索
    const results = await semanticSearch(query, notes);
    return {
      answer: `（向量搜索不可用，使用 AI 搜索）\n\n${results.map(r => `- ${r.note.title}`).join('\n')}`,
      sources: results.map(r => r.note).slice(0, 3),
    };
  }

  if (candidates.length === 0) {
    return { answer: '未在笔记中找到相关内容。', sources: [] };
  }

  // 阶段 2：Rerank 精排
  const candidateNotes = candidates
    .map(c => notes.find(n => n.id === c.id))
    .filter((n): n is Note => !!n);

  let ranked = candidateNotes;
  try {
    const snippets = candidateNotes.map(
      n => `${n.title}: ${n.content.slice(0, 300)}`,
    );
    const scores = await rerank(query, snippets);
    // 按 rerank 分数排序
    ranked = candidateNotes
      .map((n, i) => ({ note: n, score: scores[i] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(r => r.note);
  } catch {
    // rerank 失败 → 使用向量分数排序
  }

  const topK = ranked.slice(0, 3);

  // 阶段 3：LLM 基于 Top-3 笔记生成回答
  const context = topK
    .map(
      (n, i) =>
        `[笔记${i + 1}] 标题: ${n.title}\n标签: ${n.tag || ''}\n内容: ${n.content}`,
    )
    .join('\n\n---\n\n');

  const answer = await callLLM({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: `你是一个基于用户笔记库回答问题的助手。请根据以下笔记内容回答用户的问题。回答时引用笔记标题，300字以内。`,
      },
      {
        role: 'user',
        content: `## 相关笔记\n\n${context}\n\n## 用户问题\n${query}`,
      },
    ],
    stream: false,
    temperature: 0.3,
    maxTokens: 1024,
  });

  return { answer, sources: topK };
}

// ── 笔记去重 ────────────────────────────────────────────────────────────

/** 检测新笔记是否与已有笔记重复。rerank 分数 > 3 视为高度相似 */
export async function detectDuplicate(
  newTitle: string, newContent: string, existingNotes: Note[],
): Promise<{ note: Note; score: number } | null> {
  if (existingNotes.length === 0) return null;
  try {
    const newText = `${newTitle}\n${newContent.slice(0, 300)}`;
    const snippets = existingNotes.map(n => `${n.title}: ${n.content.slice(0, 300)}`);
    const scores = await rerank(newText, snippets);
    let maxScore = -Infinity, maxIdx = -1;
    scores.forEach((s, i) => { if (s > maxScore) { maxScore = s; maxIdx = i; } });
    if (maxIdx >= 0 && maxScore > 3) return { note: existingNotes[maxIdx], score: maxScore };
  } catch {}
  return null;
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
      `${note.title} ${note.content} ${note.tag || ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
