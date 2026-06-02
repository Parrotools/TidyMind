import React, { useMemo, useRef, useState } from 'react';
import {
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
import { useAppState } from '../state/AppState';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { ChatMessage } from '../types/chat';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_PROMPTS = [
  '总结最近的笔记',
  '创建学习计划',
  '提取关键行动',
];

function buildAssistantReply(message: string) {
  return `基于"${message}"的快速回复：\n\n- 我可以帮你总结笔记\n- 建议下一步行动\n- 草拟复习大纲`;
}

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { chatMessages, addChatMessage, clearChat } = useAppState();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversation = useMemo(() => chatMessages, [chatMessages]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    addChatMessage('user', trimmed);
    addChatMessage('assistant', buildAssistantReply(trimmed));
    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
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
          <Text style={styles.title}>AI 助手</Text>
          <Pressable style={styles.clearButton} onPress={clearChat}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        {/* AI Avatar section */}
        <View style={styles.aiSection}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>AI</Text>
          </View>
          <Text style={styles.aiGreeting}>您好！我是你的AI助手</Text>
        </View>

        {/* Quick prompts */}
        <View style={styles.promptRow}>
          {QUICK_PROMPTS.map(prompt => (
            <Pressable
              key={prompt}
              style={styles.promptChip}
              onPress={() => handleSend(prompt)}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        {/* Chat messages */}
        <FlatList
          ref={flatListRef}
          data={conversation}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>开始对话</Text>
              <Text style={styles.emptySubtitle}>
                向AI助手提问，获取笔记摘要、学习计划或行动清单
              </Text>
            </View>
          }
        />

        {/* Input bar (Figma-style) */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="发送消息或按住对话"
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <View style={styles.inputActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => handleSend(input)}
            >
              <Text style={styles.iconButtonText}>↑</Text>
            </Pressable>
          </View>
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
    marginBottom: Spacing.lg,
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
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  aiSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  aiAvatar: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  aiAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textOnDark,
  },
  aiGreeting: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  promptChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promptText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.active,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: Colors.textOnDark,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 64,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: Colors.textOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
});