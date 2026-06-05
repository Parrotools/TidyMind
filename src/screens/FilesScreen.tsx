import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { usePhotoToNote } from '../hooks/usePhotoToNote';
import { useAppState } from '../state/AppState';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { Note } from '../types/note';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const FILE_TYPE_TABS = ['全部', '文字', '链接', '视频/照片', '录音'] as const;

export default function FilesScreen() {
  const navigation = useNavigation<NavProp>();
  const { notes, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const {
    mode,
    isSearching,
    aiResults,
    aiSummary,
    error,
    searchWithAI,
    searchLocal,
    clear,
  } = useSemanticSearch();
  const { processPhoto, processGallery, isProcessing, statusText } =
    usePhotoToNote(() => {
      Alert.alert('笔记已创建', '拍照识别的内容已保存为笔记。');
    });

  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('全部');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // ── 标签 ──────────────────────────────────────────────────────────

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => { if (note.tag) tags.add(note.tag); });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  // ── 搜索结果 ──────────────────────────────────────────────────────

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchLocal(query, notes);
  }, [query, notes, searchLocal]);

  const typeFiltered = useMemo(() => {
    if (activeType === '全部') return notes;
    const typeTagMap: Record<string, string> = {
      '文字': 'text',
      '链接': 'link',
      '视频/照片': 'media',
      '录音': 'audio',
    };
    const tag = typeTagMap[activeType];
    return tag ? notes.filter(n => n.tag === tag) : notes;
  }, [notes, activeType]);

  const filteredNotes = useMemo(() => {
    const sorted = [...typeFiltered].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    );
    if (mode === 'ai') {
      return aiResults.map(r => r.note).filter(n => typeFiltered.includes(n));
    }
    if (mode === 'keyword') {
      return localResults.filter(n => typeFiltered.includes(n));
    }
    return sorted;
  }, [typeFiltered, mode, aiResults, localResults]);

  // ── 搜索处理 ──────────────────────────────────────────────────────

  const handleSearchSubmit = () => {
    if (!query.trim()) return;
    searchWithAI(query, typeFiltered);
  };

  const handleClearSearch = () => {
    setQuery('');
    clear();
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) clear();
  };

  // ── 笔记操作 ──────────────────────────────────────────────────────

  const handleOpenNew = () => {
    setEditingNote(null);
    setEditorVisible(true);
  };
  const handleOpenNote = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };
  const handleSave = (payload: {
    id?: string;
    title: string;
    content: string;
    tag: string;
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

  // ── 拍照 ──────────────────────────────────────────────────────────

  const handleCameraPress = () => {
    if (Platform.OS === 'ios') {
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['取消', '拍照', '从相册选择'], cancelButtonIndex: 0 },
        (index: number) => {
          if (index === 1) processPhoto();
          else if (index === 2) processGallery();
        },
      );
    } else {
      Alert.alert('添加笔记', '', [
        { text: '取消', style: 'cancel' },
        { text: '拍照', onPress: processPhoto },
        { text: '从相册选择', onPress: processGallery },
      ]);
    }
  };

  // ── 渲染 ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header + FAB */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Documents</Text>
          <Pressable style={styles.searchButton} onPress={handleOpenNew}>
            <Text style={styles.searchIcon}>+</Text>
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
                <Text
                  style={[
                    styles.typeTabText,
                    isActive && styles.typeTabTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchCard}>
            <Text style={styles.searchIconSmall}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={
                mode === 'idle'
                  ? '搜索笔记...'
                  : mode === 'keyword'
                    ? '输入关键词过滤 — 按回车AI搜索'
                    : 'AI 语义搜索结果'
              }
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={handleClearSearch} hitSlop={8}>
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            )}
          </View>
          {query.trim().length > 0 && mode !== 'ai' && (
            <Pressable
              style={styles.aiSearchButton}
              onPress={handleSearchSubmit}
            >
              <Text style={styles.aiSearchText}>AI</Text>
            </Pressable>
          )}
        </View>

        {/* AI 搜索状态栏 */}
        {mode === 'ai' && (
          <View style={styles.aiStatusBar}>
            {isSearching ? (
              <View style={styles.aiStatusRow}>
                <ActivityIndicator size="small" color={Colors.textOnDark} />
                <Text style={styles.aiStatusText}>AI 正在分析...</Text>
              </View>
            ) : error ? (
              <Text style={styles.aiErrorText}>{error}</Text>
            ) : (
              <Text style={styles.aiStatusText} numberOfLines={2}>
                {aiSummary}
              </Text>
            )}
            <Pressable onPress={handleClearSearch}>
              <Text style={styles.aiBackText}>返回全部</Text>
            </Pressable>
          </View>
        )}

        {/* Tag chips */}
        {mode !== 'ai' && availableTags.length > 0 && (
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

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {mode === 'ai'
              ? `AI 搜索结果 (${filteredNotes.length})`
              : mode === 'keyword'
                ? `匹配笔记 (${filteredNotes.length})`
                : `全部笔记 (${filteredNotes.length})`}
          </Text>
        </View>

        {/* Notes list */}
        <FlatList
          key="grid-2col"
          data={filteredNotes}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={handleOpenNote}
              onToggleFavorite={note => toggleFavorite(note.id)}
              onLongPress={n => Alert.alert('删除笔记', `确定删除「${n.title}」？`, [{text:'取消',style:'cancel'},{text:'删除',style:'destructive',onPress:()=>deleteNote(n.id)}])}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query || activeType !== '全部' ? '未找到笔记' : '暂无笔记'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query
                  ? '尝试其他关键词或调整筛选条件'
                  : '点击右上角 + 创建第一篇笔记'}
              </Text>
            </View>
          }
        />

        {/* FAB: 拍照 */}
        {!isProcessing && (
          <Pressable style={styles.fabCamera} onPress={handleCameraPress}>
            <Text style={styles.fabIcon}>📷</Text>
          </Pressable>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingBar}>
            <ActivityIndicator size="small" color={Colors.textOnDark} />
            <Text style={styles.processingText}>{statusText}</Text>
          </View>
        )}
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
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg },

  // Header
  headerRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  searchButton: {
    width: 37,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },

  // Type tabs
  typeTabs: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  typeTab: {
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inactive,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  typeTabActive: { backgroundColor: Colors.active },
  typeTabText: { fontSize: 14, fontWeight: '500', color: Colors.textOnDark },
  typeTabTextActive: { color: Colors.textOnDark },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconSmall: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginRight: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  clearIcon: { fontSize: 14, color: Colors.textTertiary, padding: Spacing.xs },
  aiSearchButton: {
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  aiSearchText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnDark,
  },

  // AI status bar
  aiStatusBar: {
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  aiStatusText: {
    fontSize: 12,
    color: Colors.textOnDark,
    flex: 1,
    lineHeight: 18,
  },
  aiErrorText: { fontSize: 12, color: '#fee2e2', flex: 1 },
  aiBackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnDark,
    marginLeft: Spacing.md,
  },

  // Tags
  tagsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tagChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tagChipText: { fontSize: 12, color: Colors.textSecondary },

  // Section
  sectionHeader: {
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },

  // List
  listContent: { paddingBottom: 80 },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // FAB
  fabCamera: {
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
  fabIcon: { fontSize: 22 },

  // Processing
  processingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.active,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  processingText: { fontSize: 14, color: Colors.textOnDark },
});
