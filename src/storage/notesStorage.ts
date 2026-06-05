import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types/note';

const STORAGE_KEY = 'tidymind.notes.v1';

/** 剔除笔记中的超大 base64 图片数据 */
function stripLargeData(notes: Note[]): Note[] {
  return notes.map(n => ({
    ...n,
    // 移除所有 base64 图片附件（它们通常很大）
    images: undefined,
    // 限制单篇笔记内容长度
    content: n.content.length > 100000 ? n.content.slice(0, 100000) + '\n...(内容已截断)' : n.content,
  }));
}

export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  try {
    const safe = stripLargeData(notes);
    const json = JSON.stringify(safe);
    // 如果 JSON 仍然太大（>1.5MB），进一步精简
    if (json.length > 1500000) {
      const minimal = notes.map(n => ({
        id: n.id, title: n.title, content: n.content.slice(0, 50000),
        tag: n.tag, createdAt: n.createdAt, updatedAt: n.updatedAt,
        isFavorite: n.isFavorite, blocks: n.blocks, summary: n.summary, keyPoints: n.keyPoints,
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, json);
    }
  } catch {
    // 存储失败，尝试最小化
    try {
      const minimal = notes.map(n => ({
        id: n.id, title: n.title, content: n.content.slice(0, 10000),
        tag: n.tag, createdAt: n.createdAt, updatedAt: n.updatedAt,
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // 最终降级：无法保存，静默失败避免崩溃
    }
  }
}
