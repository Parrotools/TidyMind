import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadChatMessages, saveChatMessages } from '../storage/chatStorage';
import { loadNotes, saveNotes } from '../storage/notesStorage';
import { ChatMessage } from '../types/chat';
import { Note } from '../types/note';

type UpsertNoteInput = {
  id?: string;
  title: string;
  content: string;
  tags: string[];
};

type AppStateContextValue = {
  notes: Note[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
  upsertNote: (payload: UpsertNoteInput) => void;
  deleteNote: (noteId: string) => void;
  toggleFavorite: (noteId: string) => void;
  addChatMessage: (role: ChatMessage['role'], content: string, imageBase64?: string) => ChatMessage;
  updateChatMessage: (id: string, content: string) => void;
  clearChat: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const [storedNotes, storedChat] = await Promise.all([
        loadNotes(),
        loadChatMessages(),
      ]);

      if (isMounted) {
        setNotes(storedNotes);
        setChatMessages(storedChat);
        setIsLoading(false);
        setIsHydrated(true);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      saveNotes(notes);
    }
  }, [notes, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      saveChatMessages(chatMessages);
    }
  }, [chatMessages, isHydrated]);

  const upsertNote = (payload: UpsertNoteInput) => {
    const now = new Date().toISOString();

    setNotes(current => {
      const existing = current.find(note => note.id === payload.id);
      if (existing) {
        return current.map(note =>
          note.id === payload.id
            ? {
                ...note,
                title: payload.title,
                content: payload.content,
                tags: payload.tags,
                updatedAt: now,
              }
            : note,
        );
      }

      return [
        {
          id: createId(),
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
        },
        ...current,
      ];
    });
  };

  const deleteNote = (noteId: string) => {
    setNotes(current => current.filter(note => note.id !== noteId));
  };

  const toggleFavorite = (noteId: string) => {
    setNotes(current =>
      current.map(note =>
        note.id === noteId
          ? { ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  const addChatMessage = (
    role: ChatMessage['role'],
    content: string,
    imageBase64?: string,
  ): ChatMessage => {
    const now = new Date().toISOString();
    const msg: ChatMessage = {
      id: createId(),
      role,
      content,
      ...(imageBase64 ? { imageBase64 } : {}),
      createdAt: now,
    };
    setChatMessages(current => [...current, msg]);
    return msg;
  };

  /** 更新指定 ID 的消息内容（用于流式更新 AI 回复） */
  const updateChatMessage = (id: string, content: string) => {
    setChatMessages(current =>
      current.map(m => (m.id === id ? { ...m, content } : m)),
    );
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const value = useMemo(
    () => ({
      notes,
      chatMessages,
      isLoading,
      upsertNote,
      deleteNote,
      toggleFavorite,
      addChatMessage,
      updateChatMessage,
      clearChat,
    }),
    [notes, chatMessages, isLoading],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

