import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import {
  notesToMarkdown,
  copyToClipboard,
  shareMarkdown,
} from '../services/exportMarkdown';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

const FORMATS = ['Markdown'] as const;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notes } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format] = useState<string>(FORMATS[0]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  const selectedNotes = useMemo(
    () => sortedNotes.filter(n => selectedIds.includes(n.id)),
    [sortedNotes, selectedIds],
  );

  const preview = useMemo(
    () => notesToMarkdown(selectedNotes),
    [selectedNotes],
  );

  const toggleSelection = (noteId: string) => {
    setSelectedIds(current =>
      current.includes(noteId)
        ? current.filter(id => id !== noteId)
        : [...current, noteId],
    );
  };

  const handleCopy = () => {
    if (!selectedIds.length) {
      Alert.alert('未选择笔记', '请至少选择一篇笔记进行导出。');
      return;
    }
    copyToClipboard(preview);
    Alert.alert('已复制', `已将 ${selectedIds.length} 篇笔记的 Markdown 复制到剪贴板。`);
  };

  const handleShare = async () => {
    if (!selectedIds.length) {
      Alert.alert('未选择笔记', '请至少选择一篇笔记进行导出。');
      return;
    }
    await shareMarkdown(preview);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>导出</Text>
          <View style={styles.backButton} />
        </View>

        <Text style={styles.subtitle}>选择笔记并导出为 {format} 格式</Text>

        {/* Format indicator */}
        <View style={styles.formatRow}>
          {FORMATS.map(option => (
            <View
              key={option}
              style={[
                styles.formatChip,
                option === format && styles.formatChipActive,
              ]}
            >
              <Text
                style={[
                  styles.formatText,
                  option === format && styles.formatTextActive,
                ]}
              >
                {option}
              </Text>
            </View>
          ))}
        </View>

        {/* Note list */}
        <ScrollView style={styles.noteList} showsVerticalScrollIndicator={false}>
          {sortedNotes.map(note => {
            const isSelected = selectedIds.includes(note.id);
            return (
              <Pressable
                key={note.id}
                style={[styles.noteRow, isSelected && styles.noteRowSelected]}
                onPress={() => toggleSelection(note.id)}
              >
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                  <Text style={styles.noteMeta}>
                    {note.tags.join(', ') || '无标签'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Markdown Preview (当选中笔记时) */}
        {selectedNotes.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>
              Markdown 预览（{selectedNotes.length} 篇）
            </Text>
            <ScrollView style={styles.previewBox} horizontal={false}>
              <Text style={styles.previewText} selectable>
                {preview}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.copyButton]}
            onPress={handleCopy}
          >
            <Text style={styles.actionButtonText}>复制</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
          >
            <Text style={styles.actionButtonText}>分享</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundStart },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  headerRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.lg },
  formatRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  formatChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
  },
  formatChipActive: { backgroundColor: Colors.active },
  formatText: { fontSize: 12, color: Colors.textOnDark, fontWeight: '500' },
  formatTextActive: { color: Colors.textOnDark },
  noteList: { maxHeight: '40%', marginBottom: Spacing.md },
  noteRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noteRowSelected: {
    borderWidth: 2,
    borderColor: Colors.active,
  },
  noteInfo: { flex: 1, marginRight: Spacing.md },
  noteTitle: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  noteMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.active,
    backgroundColor: Colors.active,
  },
  checkmark: { color: Colors.textOnDark, fontSize: 14, fontWeight: '700' },
  previewSection: { marginBottom: Spacing.md, flex: 1 },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  previewBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    maxHeight: 200,
  },
  previewText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  copyButton: { backgroundColor: Colors.inactive },
  shareButton: { backgroundColor: Colors.active },
  actionButtonText: { color: Colors.textOnDark, fontWeight: '600', fontSize: 14 },
});