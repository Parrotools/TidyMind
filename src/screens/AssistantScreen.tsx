import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
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
import { useAppState } from '../state/AppState';
import { useChat } from '../hooks/useChat';
import { pickFromGallery, capturePhoto } from '../services/camera';
import { AIMode, AI_MODES } from '../services/prompts';
import { buildNoteIndex, ragSearch } from '../services/search';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { ChatMessage } from '../types/chat';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_PROMPTS: Record<string, string[]> = {
  chat: ['总结最近的笔记', '创建学习计划', '提取关键行动'],
  rag: ['本周学了什么', '关于Python的笔记有哪些', '帮我总结知识点'],
  translate: ['翻译为英文', '翻译为日文', '翻译为韩文'],
  writing: ['润色这段话', '帮我写一篇作文', '修改语法错误'],
  image: ['照片', '相册'],
  generate: ['夕阳下的海滩', '赛博朋克城市', '国风山水画'],
};

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    chatMessages, addChatMessage, updateChatMessage, clearChat,
    notes, upsertNote,
  } = useAppState();
  const {
    isStreaming,
    sendMessage,
    sendImageMessage,
    generateImage,
    cancel,
  } = useChat();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AIMode>('chat');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentMode = AI_MODES.find(m => m.key === mode) ?? AI_MODES[0];

  // 进入问答模式时预构建向量索引，仅在笔记数量变化时重建
  useEffect(() => {
    if (mode === 'rag' && notes.length > 0) {
      buildNoteIndex(notes).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, notes.length]);

  // ── 发送消息 ──────────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput('');

    if (mode === 'image' && attachedImage) {
      await handleSendImage(trimmed, attachedImage);
      return;
    }
    if (mode === 'generate') {
      await handleGenerateImage(trimmed);
      return;
    }
    if (mode === 'rag' && notes.length > 0) {
      await handleRagQuery(trimmed);
      return;
    }

    addChatMessage('user', trimmed);
    const aiMsg = addChatMessage('assistant', '思考中...');

    const history: ChatMessage[] = [
      ...chatMessages,
      { id: 'u', role: 'user' as const, content: trimmed, createdAt: '' },
    ];

    await sendMessage(trimmed, history, (fullText, isDone) => {
      updateChatMessage(aiMsg.id, fullText);
    }, mode);

    scrollToBottom();
  }, [mode, attachedImage, isStreaming, chatMessages, notes, addChatMessage, updateChatMessage, sendMessage]);

  const handleSendImage = useCallback(async (text: string, imageB64: string) => {
    addChatMessage('user', text || '请分析这张图片', imageB64);
    setAttachedImage(null);
    const aiMsg = addChatMessage('assistant', '正在分析图片...');
    await sendImageMessage(
      text || '请分析这张图片的内容', imageB64,
      (fullText, _isDone) => updateChatMessage(aiMsg.id, fullText),
    );
    scrollToBottom();
  }, [addChatMessage, updateChatMessage, sendImageMessage]);

  const handleRagQuery = useCallback(async (query: string) => {
    addChatMessage('user', `📚 ${query}`);
    const aiMsg = addChatMessage('assistant', '正在检索笔记并生成回答...');
    try {
      const result = await ragSearch(query, notes);
      const src = result.sources.map(s => `- 《${s.title}》`).join('\n');
      updateChatMessage(aiMsg.id, `${result.answer}\n\n---\n📖 参考来源：\n${src}`);
    } catch (err: unknown) {
      updateChatMessage(aiMsg.id, `[错误] ${(err as Error).message}`);
    }
    scrollToBottom();
  }, [addChatMessage, updateChatMessage, notes]);

  const handleGenerateImage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    addChatMessage('user', `🎨 ${text}`);
    const aiMsg = addChatMessage('assistant', '正在构思画面（约需10-30秒）...');
    const result = await generateImage(text, (fullText, _isDone) => {
      updateChatMessage(aiMsg.id, fullText);
    });
    // 如果确实生成了图片，保存为笔记
    if (result.imageUrl) {
      upsertNote({
        title: `🎨 ${text.slice(0, 20)}`,
        content: `![AI生成图片](${result.imageUrl})\n\n绘图提示词: ${result.prompt}`,
        tags: ['AI绘图'],
      });
    }
    scrollToBottom();
  }, [isStreaming, addChatMessage, updateChatMessage, generateImage, upsertNote]);

  // ── 模式切换 ──────────────────────────────────────────────────────

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    setAttachedImage(null);
    if (newMode === 'image') handlePickImage();
    if (newMode === 'generate') setInput('请帮我生成一张图片：');
    if (newMode === 'translate') setInput('');
    if (newMode === 'writing') setInput('');
  };

  // ── 图片选择 ──────────────────────────────────────────────────────

  const handlePickImage = () => {
    const onSelect = (index: number) => {
      if (index === 1) capturePhoto().then(img => img && setAttachedImage(img));
      else if (index === 2) pickFromGallery().then(img => img && setAttachedImage(img));
    };
    if (Platform.OS === 'ios') {
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['取消', '拍照', '从相册选择'], cancelButtonIndex: 0 },
        onSelect,
      );
    } else {
      Alert.alert('选择图片', '', [
        { text: '取消', style: 'cancel' },
        { text: '拍照', onPress: () => onSelect(1) },
        { text: '从相册选择', onPress: () => onSelect(2) },
      ]);
    }
  };

  const handleClear = () => { clearChat(); setAttachedImage(null); };

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── 快捷提示 ──────────────────────────────────────────────────────

  const handleQuickPrompt = (prompt: string) => {
    if (mode === 'image') {
      handlePickImage();
      return;
    }
    if (mode === 'generate') {
      setInput(`请帮我生成一张图片：${prompt}`);
      return;
    }
    if (mode === 'translate') {
      setInput(`请${prompt}：`);
      return;
    }
    handleSend(prompt);
  };

  // ── 消息渲染 ──────────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasImage = !!item.imageBase64;
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {hasImage && (
          <Image source={{ uri: item.imageBase64 }} style={styles.msgImage} resizeMode="cover" />
        )}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
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
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>AI 助手</Text>
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        {/* Mode selector bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeBar}
        >
          {AI_MODES.map(m => {
            const isActive = mode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.modeChip, isActive && styles.modeChipActive]}
                onPress={() => handleModeChange(m.key)}
              >
                <Text style={styles.modeIcon}>{m.icon}</Text>
                <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active mode indicator */}
        <View style={styles.modeBanner}>
          <Text style={styles.modeBannerIcon}>{currentMode.icon}</Text>
          <Text style={styles.modeBannerText}>
            {currentMode.label}模式
            {mode === 'translate' ? ' — 中英日韩互译' :
             mode === 'writing' ? ' — 写作指导与润色' :
             mode === 'image' ? ' — 拍照识别图片内容' :
             mode === 'generate' ? ' — AI 文生图' :
             ' — 通用知识助手'}
          </Text>
        </View>

        {/* AI Avatar + Quick prompts (only when empty) */}
        {chatMessages.length === 0 && (
          <>
            <View style={styles.aiSection}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>{currentMode.icon}</Text>
              </View>
              <Text style={styles.aiGreeting}>
                {mode === 'translate' ? '翻译助手' :
                 mode === 'writing' ? '写作指导' :
                 mode === 'image' ? '图片识别' :
                 mode === 'generate' ? 'AI 绘图' :
                 '您好！我是你的AI助手'}
              </Text>
              <Text style={styles.aiSubGreeting}>选择一个模式，然后开始对话</Text>
            </View>

            <View style={styles.promptRow}>
              {(QUICK_PROMPTS[mode] ?? QUICK_PROMPTS.chat).map(prompt => (
                <Pressable
                  key={prompt}
                  style={styles.promptChip}
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Text style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </>
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
                选择上方模式，向AI助手提问
              </Text>
            </View>
          }
        />

        {/* Attached image preview */}
        {attachedImage && mode === 'image' && (
          <View style={styles.attachPreview}>
            <Image source={{ uri: attachedImage }} style={styles.attachImage} resizeMode="cover" />
            <Pressable style={styles.attachRemove} onPress={() => setAttachedImage(null)}>
              <Text style={styles.attachRemoveText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {mode === 'image' && (
            <Pressable style={styles.imageButton} onPress={handlePickImage}>
              <Text style={styles.imageButtonText}>📷</Text>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            placeholder={
              mode === 'translate' ? '输入需要翻译的内容...' :
              mode === 'writing' ? '输入需要润色或指导的内容...' :
              mode === 'generate' ? '描述你想生成的画面...' :
              mode === 'image' ? '输入图片描述（可选）...' :
              '发送消息...'
            }
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isStreaming}
            onSubmitEditing={() => { if (input.trim() || (mode === 'image' && attachedImage)) handleSend(input); }}
          />
          <View style={styles.inputActions}>
            {isStreaming ? (
              <Pressable style={styles.stopButton} onPress={cancel}>
                <Text style={styles.stopButtonText}>■</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.sendButton,
                  (!input.trim() && !attachedImage) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSend(input)}
                disabled={!input.trim() && !attachedImage}
              >
                <Text style={styles.sendButtonText}>↑</Text>
              </Pressable>
            )}
          </View>
        </View>

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
    marginTop: Spacing.md, marginBottom: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backButton: {
    width: 24, height: 24, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  clearButton: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
  },
  clearText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  // Mode bar
  modeBar: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeChipActive: {
    backgroundColor: Colors.active, borderColor: Colors.active,
  },
  modeIcon: { fontSize: 14 },
  modeLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  modeLabelActive: { color: Colors.textOnDark },

  // Mode banner
  modeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  modeBannerIcon: { fontSize: 16 },
  modeBannerText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  // AI Section
  aiSection: { alignItems: 'center', marginBottom: Spacing.lg },
  aiAvatar: {
    width: 72, height: 72, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.inactive, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  aiAvatarText: { fontSize: 28 },
  aiGreeting: { fontSize: 20, fontWeight: '500', color: Colors.textPrimary },
  aiSubGreeting: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.xs },

  // Quick prompts
  promptRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  promptChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  promptText: { fontSize: 12, color: Colors.textPrimary },

  // Chat
  listContent: { paddingBottom: Spacing.lg, gap: Spacing.sm },
  bubble: {
    maxWidth: '85%', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.active },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  msgImage: {
    width: '100%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md, marginBottom: Spacing.sm,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: Colors.textOnDark },
  assistantText: { color: Colors.textPrimary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },

  // Attachment
  attachPreview: { marginBottom: Spacing.sm, position: 'relative', alignSelf: 'flex-start' },
  attachImage: { width: 120, height: 90, borderRadius: BorderRadius.md },
  attachRemove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  attachRemoveText: { fontSize: 12, color: Colors.textOnDark, fontWeight: '700' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    marginBottom: Spacing.xs, minHeight: 64,
  },
  imageButton: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    backgroundColor: Colors.inactive, alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  imageButtonText: { fontSize: 18 },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary, maxHeight: 100 },
  inputActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.sm },
  sendButton: {
    width: 32, height: 32, borderRadius: BorderRadius.full,
    backgroundColor: Colors.active, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.inactive },
  sendButtonText: { color: Colors.textOnDark, fontSize: 16, fontWeight: '600' },
  stopButton: {
    width: 32, height: 32, borderRadius: BorderRadius.full,
    backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  stopButtonText: { color: Colors.textOnDark, fontSize: 12 },

  // Streaming
  streamingBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.lg,
  },
  streamingText: { fontSize: 12, color: Colors.textSecondary },
});
