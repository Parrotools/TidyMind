import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

const FORMATS = ['PDF', 'Word', 'Markdown'] as const;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notes } = useAppState();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<string>(FORMATS[0]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  const toggleSelection = (noteId: string) => {
    setSelectedIds(current =>
      current.includes(noteId) ? current.filter(id => id !== noteId) : [...current, noteId],
    );
  };

  const handleExport = () => {
    if (!selectedIds.length) {
      Alert.alert('未选择笔记', '请至少选择一篇笔记进行导出。');
      return;
    }
    Alert.alert('导出就绪', `已准备 ${selectedIds.length} 篇笔记，格式：${format}。`);
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

        <Text style={styles.subtitle}>选择笔记和导出格式</Text>

        {/* Format selector */}
        <View style={styles.formatRow}>
          {FORMATS.map(option => (
            <Pressable
              key={option}
              style={[styles.formatChip, option === format && styles.formatChipActive]}
              onPress={() => setFormat(option)}
            >
              <Text style={[styles.formatText, option === format && styles.formatTextActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Note list */}
        <View style={styles.noteList}>
          {sortedNotes.map(note => {
            const isSelected = selectedIds.includes(note.id);
            return (
              <Pressable
                key={note.id}
                style={[styles.noteRow, isSelected && styles.noteRowSelected]}
                onPress={() => toggleSelection(note.id)}
              >
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.noteMeta}>{note.tags.join(', ') || '无标签'}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleExport}>
          <Text style={styles.primaryButtonText}>导出已选笔记</Text>
        </Pressable>
      </View>
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
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  formatRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  formatChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
  },
  formatChipActive: {
    backgroundColor: Colors.active,
  },
  formatText: {
    fontSize: 12,
    color: Colors.textOnDark,
    fontWeight: '500',
  },
  formatTextActive: {
    color: Colors.textOnDark,
  },
  noteList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  noteRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteRowSelected: {
    borderWidth: 2,
    borderColor: Colors.active,
  },
  noteInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
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
  checkmark: {
    color: Colors.textOnDark,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 'auto',
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  primaryButtonText: {
    color: Colors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
});