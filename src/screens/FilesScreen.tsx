import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import NoteEditorModal from '../components/NoteEditorModal';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing, Typography } from '../theme/designTokens';
import { Note } from '../types/note';

const FILE_TYPE_TABS = ['全部', '文字', '链接', '视频/照片', '录音'] as const;

export default function FilesScreen() {
  const { notes, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('全部');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter(note => {
        if (activeType !== '全部') {
          const typeTagMap: Record<string, string> = {
            '文字': 'text',
            '链接': 'link',
            '视频/照片': 'media',
            '录音': 'audio',
          };
          const mappedTag = typeTagMap[activeType];
          if (mappedTag && !note.tags.includes(mappedTag)) {
            return false;
          }
        }
        if (!normalized) {
          return true;
        }
        const haystack = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query, activeType]);

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
    tags: string[];
  }) => {
    if (!payload.title) {
      Alert.alert('缺少标题', '请在保存前添加标题。');
      return;
    }
    upsertNote(payload);
    setEditorVisible(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('删除笔记？', '此操作无法撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
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
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Documents</Text>
          <Pressable style={styles.searchButton}>
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>

        {/* Type filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeTabs}
        >
          {FILE_TYPE_TABS.map(type => {
            const isActive = activeType === type;
            return (
              <Pressable
                key={type}
                style={[styles.typeTab, isActive && styles.typeTabActive]}
                onPress={() => setActiveType(type)}
              >
                <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchCard}>
          <Text style={styles.searchIconSmall}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索笔记..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Tag chips */}
        {availableTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
          >
            {availableTags.map(tag => (
              <Pressable
                key={tag}
                style={styles.tagChip}
                onPress={() => setQuery(tag)}
              >
                <Text style={styles.tagChipText}>{tag}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Notes list */}
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
              <Text style={styles.emptyTitle}>暂无笔记</Text>
              <Text style={styles.emptySubtitle}>
                点击右上角加号创建第一篇笔记
              </Text>
              <Pressable style={styles.addButton} onPress={handleOpenNew}>
                <Text style={styles.addButtonText}>+ 新建笔记</Text>
              </Pressable>
            </View>
          }
        />

        {/* FAB - Add note */}
        <Pressable style={styles.fab} onPress={handleOpenNew}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
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
    backgroundColor: Colors.backgroundStart,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchButton: {
    width: 37,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  typeTabs: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  typeTab: {
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inactive,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  typeTabActive: {
    backgroundColor: Colors.active,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textOnDark,
  },
  typeTabTextActive: {
    color: Colors.textOnDark,
  },
  searchCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  searchIconSmall: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tagChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tagChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  addButtonText: {
    color: Colors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    fontSize: 24,
    color: Colors.textOnDark,
    lineHeight: 28,
  },
});