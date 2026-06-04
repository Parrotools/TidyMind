/**
 * 语义搜索 Hook
 *
 * 管理搜索模式和状态的切换：
 * - 输入时：即时本地关键词过滤
 * - 提交搜索：AI 语义搜索
 */

import { useState, useCallback, useRef } from 'react';
import { semanticSearch, keywordSearch, SearchResult } from '../services/search';
import { Note } from '../types/note';

export type SearchMode = 'idle' | 'keyword' | 'ai';

export function useSemanticSearch() {
  const [mode, setMode] = useState<SearchMode>('idle');
  const [isSearching, setIsSearching] = useState(false);
  const [aiResults, setAiResults] = useState<SearchResult[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [error, setError] = useState('');

  /**
   * 执行 AI 语义搜索
   */
  const searchWithAI = useCallback(
    async (query: string, notes: Note[]) => {
      if (!query.trim() || !notes.length) {
        setMode('idle');
        setAiResults([]);
        return;
      }

      setIsSearching(true);
      setMode('ai');
      setError('');

      try {
        const results = await semanticSearch(query, notes);
        setAiResults(results);
        if (results.length > 0 && results[0].reasoning) {
          setAiSummary(results[0].reasoning);
        } else {
          setAiSummary(
            results.length > 0
              ? `找到 ${results.length} 篇相关笔记`
              : '未找到匹配的笔记',
          );
        }
      } catch (err: unknown) {
        setError((err as Error).message ?? '搜索失败');
        setAiResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  /**
   * 本地关键词搜索（即时）
   */
  const searchLocal = useCallback((query: string, notes: Note[]): Note[] => {
    if (!query.trim()) {
      setMode('idle');
      setAiResults([]);
      return [];
    }
    setMode('keyword');
    return keywordSearch(query, notes);
  }, []);

  /** 清除搜索 */
  const clear = useCallback(() => {
    setMode('idle');
    setAiResults([]);
    setAiSummary('');
    setError('');
  }, []);

  return {
    mode,
    isSearching,
    aiResults,
    aiSummary,
    error,
    searchWithAI,
    searchLocal,
    clear,
  };
}
