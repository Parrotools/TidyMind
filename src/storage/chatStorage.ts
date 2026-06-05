import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types/chat';

const STORAGE_KEY = 'tidymind.chat.v1';
const MAX_MESSAGES = 50;

/** 剔除消息中的 base64 图片数据，仅保留文字 */
function stripImages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_MESSAGES).map(m => ({
    ...m,
    imageBase64: undefined,
    images: undefined,
    generatedImage: undefined,
  }));
}

export async function loadChatMessages(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  try {
    const safe = stripImages(messages);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch (err) {
    // 存储失败（如数据过大），尝试仅保留最近 10 条
    try {
      const minimal = stripImages(messages.slice(-10));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // 最终降级：清空
    }
  }
}
