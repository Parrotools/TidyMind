import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notes } = useAppState();

  const totalNotes = notes.length;
  const totalFavorites = notes.filter(note => note.isFavorite).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>我的</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>TM</Text>
          </View>
          <View>
            <Text style={styles.name}>TidyMind 用户</Text>
            <Text style={styles.role}>学习者 · 知识构建者</Text>
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.editButtonText}>编辑</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalNotes}</Text>
            <Text style={styles.statLabel}>笔记</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalFavorites}</Text>
            <Text style={styles.statLabel}>收藏</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>导出</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷操作</Text>

          <Pressable
            style={styles.actionRow}
            onPress={() => navigation.navigate('Export')}
          >
            <Text style={styles.actionText}>导出笔记</Text>
            <Text style={styles.actionHint}>选择格式</Text>
          </Pressable>

          <Pressable
            style={styles.actionRow}
            onPress={() => navigation.navigate('Import')}
          >
            <Text style={styles.actionText}>导入知识</Text>
            <Text style={styles.actionHint}>链接、文件、文本</Text>
          </Pressable>

          <Pressable
            style={styles.actionRow}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionText}>设置</Text>
            <Text style={styles.actionHint}>隐私、账户</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textOnDark,
    fontWeight: '700',
    fontSize: 18,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  role: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  editButton: {
    backgroundColor: Colors.inactive,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textOnDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
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
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  actionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});