import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoteCard from '../components/NoteCard';
import NoteEditorModal from '../components/NoteEditorModal';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { Note } from '../types/note';

const QUICK_ACTIONS = [
  { id: 'import', label: '导入' },
  { id: 'export', label: '导出' },
  { id: 'assistant', label: 'AI 助手' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notes, isLoading, upsertNote, deleteNote, toggleFavorite } =
    useAppState();
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

  const [query, setQuery] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // ── 标签统计与筛选 ──────────────────────────────────────────────────

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(n => {
      if (n.tag) counts[n.tag] = (counts[n.tag] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // ── 搜索结果 ──────────────────────────────────────────────────────

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchLocal(query, notes);
  }, [query, notes, searchLocal]);

  const filteredNotes = useMemo(() => {
    let base = [...notes].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    );
    if (mode === 'ai') {
      base = aiResults.map(r => r.note);
    } else if (mode === 'keyword') {
      base = localResults;
    }
    // 标签筛选
    if (selectedTag) {
      base = base.filter(n => n.tag === selectedTag);
    }
    return base;
  }, [notes, mode, aiResults, localResults, selectedTag]);

  // ── 统计 ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const lastUpdated = notes.reduce((latest, note) => {
      if (!latest) return note.updatedAt;
      return note.updatedAt > latest ? note.updatedAt : latest;
    }, '');
    return {
      count: notes.length,
      favorites: notes.filter(note => note.isFavorite).length,
      lastUpdated,
    };
  }, [notes]);

  // ── 搜索处理 ──────────────────────────────────────────────────────

  const handleSearchSubmit = () => {
    if (!query.trim()) return;
    searchWithAI(query, notes);
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

  const handleQuickAction = (id: string) => {
    if (id === 'import') navigation.navigate('Import');
    else if (id === 'export') navigation.navigate('Export');
    else if (id === 'assistant') navigation.navigate('Assistant');
  };

  // ── 渲染 ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>TidyMind</Text>
            <Text style={styles.subtitle}>知识工作空间</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>TM</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchCard}>
            <Text style={styles.searchIcon}>⌕</Text>
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

        {/* Stats (hidden when searching) */}
        {mode !== 'ai' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.count}</Text>
                <Text style={styles.statLabel}>笔记</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.favorites}</Text>
                <Text style={styles.statLabel}>收藏</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.lastUpdated
                    ? new Date(stats.lastUpdated).toLocaleDateString('zh-CN')
                    : '--'}
                </Text>
                <Text style={styles.statLabel}>最近更新</Text>
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.quickRow}>
              {QUICK_ACTIONS.map(action => (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.quickAction,
                    pressed && styles.quickActionPressed,
                  ]}
                  onPress={() => handleQuickAction(action.id)}
                >
                  <Text style={styles.quickText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Tag filter bar */}
        {mode !== 'ai' && tagCounts.length > 0 && (
          <View style={styles.tagFilterWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagFilterInner}
            >
              <Pressable
                style={[
                  styles.tagFilterChip,
                  !selectedTag && styles.tagFilterChipActive,
                ]}
                onPress={() => setSelectedTag(null)}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    !selectedTag && styles.tagFilterTextActive,
                  ]}
                >
                  全部 ({notes.length})
                </Text>
              </Pressable>
              {tagCounts.map(([tag, count]) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagFilterChip,
                    selectedTag === tag && styles.tagFilterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedTag(prev => (prev === tag ? null : tag))
                  }
                >
                  <Text
                    style={[
                      styles.tagFilterText,
                      selectedTag === tag && styles.tagFilterTextActive,
                    ]}
                  >
                    {tag} ({count})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedTag
              ? `「${selectedTag}」(${filteredNotes.length})`
              : mode === 'ai'
                ? `AI 搜索结果 (${filteredNotes.length})`
                : mode === 'keyword'
                  ? `匹配笔记 (${filteredNotes.length})`
                  : '最近笔记'}
          </Text>
          {mode === 'idle' && (
            <Pressable onPress={handleOpenNew}>
              <Text style={styles.sectionAction}>+ 新建</Text>
            </Pressable>
          )}
        </View>

        {/* Note list */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={Colors.active} />
          </View>
        ) : (
          <FlatList
            data={filteredNotes.slice(0, 20)}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onPress={handleOpenNote}
                onToggleFavorite={note => toggleFavorite(note.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {query ? '未找到匹配笔记' : '还没有笔记'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {query
                    ? '尝试其他关键词或调整查询'
                    : '捕捉第一个想法，开始构建你的知识库'}
                </Text>
                {!query && (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={handleOpenNew}
                  >
                    <Text style={styles.primaryButtonText}>添加笔记</Text>
                  </Pressable>
                )}
              </View>
            }
          />
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
  safeArea: { flex: 1, backgroundColor: Colors.backgroundStart },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 16 },

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
  searchIcon: {
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Tag filter
  tagFilterWrap: {
    marginBottom: Spacing.lg,
  },
  tagFilterInner: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  tagFilterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagFilterChipActive: {
    backgroundColor: Colors.active,
    borderColor: Colors.active,
  },
  tagFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tagFilterTextActive: {
    color: Colors.textOnDark,
  },

  // Quick actions (original)
  quickAction: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
    alignItems: 'center',
  },
  quickActionPressed: { backgroundColor: Colors.active },
  quickText: { color: Colors.textOnDark, fontWeight: '500', fontSize: 14 },

  // Section
  sectionHeader: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  sectionAction: { color: Colors.active, fontWeight: '500', fontSize: 14 },

  // List
  listContent: { paddingBottom: Spacing.xl },
  loadingWrap: { marginTop: Spacing.xl },
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
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primaryButtonText: { color: Colors.textOnDark, fontWeight: '600', fontSize: 14 },
});
