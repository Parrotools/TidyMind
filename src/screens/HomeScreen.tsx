import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing, Typography } from '../theme/designTokens';
import { Note } from '../types/note';

const QUICK_ACTIONS = [
  { id: 'import', label: '导入' },
  { id: 'export', label: '导出' },
  { id: 'assistant', label: 'AI 助手' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notes, isLoading, upsertNote, deleteNote, toggleFavorite } = useAppState();
  const [query, setQuery] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!normalized) {
      return sorted;
    }
    return sorted.filter(note => {
      const haystack = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [notes, query]);

  const stats = useMemo(() => {
    const lastUpdated = notes.reduce((latest, note) => {
      if (!latest) {
        return note.updatedAt;
      }
      return note.updatedAt > latest ? note.updatedAt : latest;
    }, '');

    return {
      count: notes.length,
      favorites: notes.filter(note => note.isFavorite).length,
      lastUpdated,
    };
  }, [notes]);

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

  const handleQuickAction = (id: string) => {
    if (id === 'import') {
      navigation.navigate('Import');
      return;
    }
    if (id === 'export') {
      navigation.navigate('Export');
      return;
    }
    if (id === 'assistant') {
      navigation.navigate('Assistant');
      return;
    }
  };

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

        {/* Search */}
        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索笔记..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Stats */}
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

        {/* Recent notes section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近笔记</Text>
          <Pressable onPress={handleOpenNew}>
            <Text style={styles.sectionAction}>+ 新建</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={Colors.active} />
          </View>
        ) : (
          <FlatList
            data={filteredNotes.slice(0, 10)}
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
                <Text style={styles.emptyTitle}>还没有笔记</Text>
                <Text style={styles.emptySubtitle}>
                  捕捉第一个想法，开始构建你的知识库
                </Text>
                <Pressable style={styles.primaryButton} onPress={handleOpenNew}>
                  <Text style={styles.primaryButtonText}>添加笔记</Text>
                </Pressable>
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
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundStart,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textOnDark,
    fontWeight: '700',
    fontSize: 16,
  },
  searchCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  searchIcon: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
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
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickAction: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
    alignItems: 'center',
  },
  quickActionPressed: {
    backgroundColor: Colors.active,
  },
  quickText: {
    color: Colors.textOnDark,
    fontWeight: '500',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionAction: {
    color: Colors.active,
    fontWeight: '500',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  loadingWrap: {
    marginTop: Spacing.xl,
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
  },
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
  primaryButtonText: {
    color: Colors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
});