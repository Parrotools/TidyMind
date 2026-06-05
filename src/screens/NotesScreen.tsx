import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import NoteEditorModal from '../components/NoteEditorModal';
import { useAppState } from '../state/AppState';
import { Note } from '../types/note';

export default function NotesScreen() {
  const { notes, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => { if (note.tag) tags.add(note.tag); });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter(note => {
        if (activeTag && note.tag !== activeTag) {
          return false;
        }
        if (!normalized) {
          return true;
        }
        const haystack = `${note.title} ${note.content} ${note.tag || ''}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query, activeTag]);

  const handleOpenNew = () => {
    setEditingNote(null);
    setEditorVisible(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const handleSave = (payload: {
    id?: string;
    title: string;
    content: string;
    tag: string;
  }) => {
    if (!payload.title) {
      Alert.alert('Missing title', 'Please add a title before saving.');
      return;
    }

    upsertNote(payload);
    setEditorVisible(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNote(noteId);
          setEditorVisible(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Notes</Text>
          <Pressable style={styles.primaryButton} onPress={handleOpenNew}>
            <Text style={styles.primaryButtonText}>New</Text>
          </Pressable>
        </View>

        <View style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, content, or tag"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.tagsRow}>
          <Pressable
            style={[styles.tagChip, !activeTag && styles.tagChipActive]}
            onPress={() => setActiveTag('')}
          >
            <Text style={[styles.tagText, !activeTag && styles.tagTextActive]}>All</Text>
          </Pressable>
          {availableTags.map(tag => (
            <Pressable
              key={tag}
              style={[styles.tagChip, activeTag === tag && styles.tagChipActive]}
              onPress={() => setActiveTag(tag)}
            >
              <Text
                style={[styles.tagText, activeTag === tag && styles.tagTextActive]}
                numberOfLines={1}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredNotes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={handleOpenEdit}
              onToggleFavorite={note => toggleFavorite(note.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching notes</Text>
              <Text style={styles.emptySubtitle}>Try a different keyword or tag.</Text>
            </View>
          }
        />
      </View>

      <NoteEditorModal
        visible={editorVisible}
        initialNote={editingNote}
        onCancel={() => setEditorVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 14,
    color: '#0f172a',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  tagChipActive: {
    backgroundColor: '#2563eb',
  },
  tagText: {
    fontSize: 12,
    color: '#475569',
  },
  tagTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
});

