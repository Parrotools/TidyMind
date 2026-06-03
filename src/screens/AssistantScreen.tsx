import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
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
import { useChat } from '../hooks/useChat';
import { pickFromGallery, capturePhoto } from '../services/camera';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { ChatMessage } from '../types/chat';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_PROMPTS = [
  { label: '总结笔记', text: '总结最近的笔记' },
  { label: '学习计划', text: '创建学习计划' },
  { label: '识别图片', text: '识别图片', isImage: true },
  { label: '生成图片', text: '生成图片', isGen: true },
];

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { chatMessages, addChatMessage, updateChatMessage, clearChat } =
    useAppState();
  const {
    isStreaming,
    sendMessage,
    sendImageMessage,
    generateImage,
    cancel,
  } = useChat();

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── 文字消息 ──────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput('');

    if (attachedImage) {
      // 图片 + 文字 → 多模态分析
      await handleSendImage(trimmed, attachedImage);
      return;
    }

    addChatMessage('user', trimmed);
    const aiMsg = addChatMessage('assistant', '思考中...');

    const history: ChatMessage[] = [
      ...chatMessages,
      { id: 'u', role: 'user' as const, content: trimmed, createdAt: '' },
    ];

    await sendMessage(trimmed, history, async (fullText, isDone) => {
      updateChatMessage(aiMsg.id, fullText);
    });

    scrollToBottom();
  };

  // ── 图片消息 ──────────────────────────────────────────────────────

  const handleSendImage = async (text: string, imageB64: string) => {
    addChatMessage('user', text || '请分析这张图片', imageB64);
    setAttachedImage(null);

    const aiMsg = addChatMessage('assistant', '正在分析图片...');

    await sendImageMessage(
      text || '请分析这张图片的内容',
      imageB64,
      (fullText, isDone) => {
        updateChatMessage(aiMsg.id, fullText);
      },
    );

    scrollToBottom();
  };

  // ── 图片生成 ──────────────────────────────────────────────────────

  const handleGenerateImage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    addChatMessage('user', `帮我画一张图：${trimmed}`);
    const aiMsg = addChatMessage('assistant', '正在构思画面...');

    await generateImage(trimmed, (fullText, isDone) => {
      updateChatMessage(aiMsg.id, fullText);
    });

    scrollToBottom();
  };

  // ── 快速操作 ──────────────────────────────────────────────────────

  const handleQuickPrompt = (prompt: (typeof QUICK_PROMPTS)[0]) => {
    if (prompt.isImage) {
      handlePickImage();
      return;
    }
    if (prompt.isGen) {
      setInput('请帮我生成一张图片：');
      return;
    }
    handleSend(prompt.text);
  };

  const handlePickImage = () => {
    const options = Platform.OS === 'ios'
      ? ['取消', '拍照', '从相册选择']
      : ['取消', '拍照', '从相册选择'];

    const onSelect = (index: number) => {
      if (index === 1) capturePhoto().then(img => img && setAttachedImage(img));
      else if (index === 2) pickFromGallery().then(img => img && setAttachedImage(img));
    };

    if (Platform.OS === 'ios') {
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        onSelect,
      );
    } else {
      Alert.alert('选择图片来源', '', [
        { text: '取消', style: 'cancel' },
        { text: '拍照', onPress: () => onSelect(1) },
        { text: '从相册选择', onPress: () => onSelect(2) },
      ]);
    }
  };

  const handleClear = () => {
    clearChat();
    setAttachedImage(null);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // ── 消息渲染 ──────────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasImage = !!item.imageBase64;

    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {/* 图片附件 */}
        {hasImage && (
          <Image
            source={{ uri: item.imageBase64 }}
            style={styles.msgImage}
            resizeMode="cover"
          />
        )}
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

  // ── 渲染 ──────────────────────────────────────────────────────────

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
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        {/* AI Avatar (only when empty) */}
        {chatMessages.length === 0 && (
          <View style={styles.aiSection}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>AI</Text>
            </View>
            <Text style={styles.aiGreeting}>您好！我是你的AI助手</Text>
            <Text style={styles.aiSubGreeting}>
              支持文字对话、图片识别、图片生成
            </Text>
          </View>
        )}

        {/* Quick prompts */}
        {chatMessages.length === 0 && (
          <View style={styles.promptRow}>
            {QUICK_PROMPTS.map(prompt => (
              <Pressable
                key={prompt.label}
                style={[
                  styles.promptChip,
                  (prompt.isImage || prompt.isGen) && styles.promptChipImage,
                ]}
                onPress={() => handleQuickPrompt(prompt)}
              >
                <Text
                  style={[
                    styles.promptText,
                    (prompt.isImage || prompt.isGen) && styles.promptTextImage,
                  ]}
                >
                  {prompt.isImage ? '📷 ' : prompt.isGen ? '🎨 ' : ''}
                  {prompt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Chat messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
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

        {/* Attached image preview */}
        {attachedImage && (
          <View style={styles.attachPreview}>
            <Image
              source={{ uri: attachedImage }}
              style={styles.attachImage}
              resizeMode="cover"
            />
            <Pressable
              style={styles.attachRemove}
              onPress={() => setAttachedImage(null)}
            >
              <Text style={styles.attachRemoveText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <Pressable style={styles.imageButton} onPress={handlePickImage}>
            <Text style={styles.imageButtonText}>📷</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={
              attachedImage
                ? '输入图片描述（可选）...'
                : '发送消息或按住对话'
            }
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isStreaming}
          />
          <View style={styles.inputActions}>
            {isStreaming ? (
              <Pressable style={styles.stopButton} onPress={cancel}>
                <Text style={styles.stopButtonText}>■</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.sendButton,
                  !input.trim() &&
                    !attachedImage &&
                    styles.sendButtonDisabled,
                ]}
                onPress={() => {
                  if (attachedImage) handleSend(input || '请分析这张图片');
                  else handleSend(input);
                }}
                disabled={!input.trim() && !attachedImage}
              >
                <Text style={styles.sendButtonText}>↑</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Streaming indicator */}
        {isStreaming && (
          <View style={styles.streamingBar}>
            <ActivityIndicator size="small" color={Colors.active} />
            <Text style={styles.streamingText}>AI 正在处理...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundStart },
  container: { flex: 1, paddingHorizontal: Spacing.lg },

  // Header
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
  backIcon: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  clearText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  // AI Section
  aiSection: { alignItems: 'center', marginBottom: Spacing.xl },
  aiAvatar: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  aiAvatarText: { fontSize: 24, fontWeight: '600', color: Colors.textOnDark },
  aiGreeting: { fontSize: 20, fontWeight: '500', color: Colors.textPrimary },
  aiSubGreeting: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Quick prompts
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
  promptChipImage: {
    backgroundColor: Colors.active,
    borderColor: Colors.active,
  },
  promptText: { fontSize: 12, color: Colors.textPrimary },
  promptTextImage: { color: Colors.textOnDark },

  // Chat
  listContent: { paddingBottom: Spacing.lg, gap: Spacing.sm },
  bubble: {
    maxWidth: '85%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.active },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
  },
  msgImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: Colors.textOnDark },
  assistantText: { color: Colors.textPrimary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32 },
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

  // Image attachment preview
  attachPreview: {
    marginBottom: Spacing.sm,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  attachImage: {
    width: 120,
    height: 90,
    borderRadius: BorderRadius.md,
  },
  attachRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachRemoveText: {
    fontSize: 12,
    color: Colors.textOnDark,
    fontWeight: '700',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xs,
    minHeight: 64,
  },
  imageButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  imageButtonText: { fontSize: 18 },
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
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.inactive },
  sendButtonText: {
    color: Colors.textOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: { color: Colors.textOnDark, fontSize: 12 },

  // Streaming
  streamingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  streamingText: { fontSize: 12, color: Colors.textSecondary },
});
