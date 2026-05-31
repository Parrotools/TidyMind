import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types/chat';

const STORAGE_KEY = 'tidymind.chat.v1';

export async function loadChatMessages(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

