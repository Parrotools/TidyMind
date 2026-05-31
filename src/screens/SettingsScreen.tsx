import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** A settings row that animates on press */
function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      tension: 200,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 200,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.settingRow, { transform: [{ scale }] }]}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onValueChange(!value)}
      >
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.inactive, true: Colors.active }}
          thumbColor={Colors.surface}
        />
      </Pressable>
    </Animated.View>
  );
}

/** Animated back button */
function BackButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.backButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [autoSync, setAutoSync] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>设置</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.settingsGroup}>
          <SettingRow
            title="自动同步"
            subtitle="跨设备同步笔记"
            value={autoSync}
            onValueChange={setAutoSync}
          />
          <View style={styles.divider} />
          <SettingRow
            title="隐私模式"
            subtitle="隐藏敏感笔记预览"
            value={privateMode}
            onValueChange={setPrivateMode}
          />
          <View style={styles.divider} />
          <SettingRow
            title="AI 建议"
            subtitle="在导入过程中显示提示"
            value={aiSuggestions}
            onValueChange={setAiSuggestions}
          />
        </View>
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
    marginBottom: Spacing.xl,
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
  backButtonPlaceholder: {
    width: 24,
    height: 24,
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
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
});