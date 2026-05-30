import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types/note';

const STORAGE_KEY = 'tidymind.notes.v1';

export async function loadNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

