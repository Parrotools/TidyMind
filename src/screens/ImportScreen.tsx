import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

const IMPORT_TYPES = ['链接', '文件', '文本'] as const;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ImportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { upsertNote } = useAppState();
  const [importType, setImportType] = useState<string>(IMPORT_TYPES[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const handleImport = () => {
    if (!title.trim()) {
      Alert.alert('缺少标题', '请添加标题以创建笔记。');
      return;
    }

    upsertNote({
      title: title.trim(),
      content: content.trim() || `${importType} 导入就绪。`,
      tags: parsedTags,
    });

    navigation.goBack();
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
          <Text style={styles.title}>导入</Text>
          <View style={styles.backButton} />
        </View>

        <Text style={styles.subtitle}>从链接、文件或文本中捕捉知识</Text>

        {/* Type selector */}
        <View style={styles.typeRow}>
          {IMPORT_TYPES.map(option => (
            <Pressable
              key={option}
              style={[styles.typeChip, option === importType && styles.typeChipActive]}
              onPress={() => setImportType(option)}
            >
              <Text style={[styles.typeText, option === importType && styles.typeTextActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>标题</Text>
        <TextInput
          style={styles.input}
          placeholder="输入标题"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>标签</Text>
        <TextInput
          style={styles.input}
          placeholder="以逗号分隔的标签"
          placeholderTextColor={Colors.textTertiary}
          value={tags}
          onChangeText={setTags}
        />

        <Text style={styles.label}>内容</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="粘贴文本或描述文件"
          placeholderTextColor={Colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
        />

        <Pressable style={styles.primaryButton} onPress={handleImport}>
          <Text style={styles.primaryButtonText}>导入到笔记</Text>
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
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
  },
  typeChipActive: {
    backgroundColor: Colors.active,
  },
  typeText: {
    fontSize: 12,
    color: Colors.textOnDark,
    fontWeight: '500',
  },
  typeTextActive: {
    color: Colors.textOnDark,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: {
    minHeight: 140,
    textAlignVertical: 'top',
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