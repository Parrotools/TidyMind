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
import { AIMode, AI_MODES, TAG_SUGGESTION_PROMPT, NOTE_GENERATION_PROMPT, FILE_TO_NOTE_PROMPT } from '../services/prompts';
import { callLLM } from '../services/llm';
import { DEFAULT_MODEL } from '../services/llm.config';
import { buildNoteIndex, ragSearch } from '../services/search';
import { BorderRadius, Colors, Spacing } from '../theme/designTokens';
import { ChatMessage } from '../types/chat';
import { NoteBlock } from '../types/note';
import { RootStackParamList } from '../navigation/types';
import BlockRenderer from '../components/BlockRenderer';
import { pickFile, PickedFile } from '../services/filePicker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** 从 AI 回复中提取第一行作为笔记标题 */
function extractTitle(content: string): string {
  const firstLine =
    content
      .split('\n')
      .find(l => l.trim().length > 0) ?? '';
  return firstLine.replace(/^[#*>\-\s]+/, '').trim().slice(0, 30) || 'AI 笔记';
}

const QUICK_PROMPTS: Record<string, string[]> = {
  chat: ['总结最近的笔记', '创建学习计划', '提取关键行动'],
  rag: ['本周学了什么', '关于Python的笔记有哪些', '帮我总结知识点'],
  translate: ['翻译为英文', '翻译为日文', '翻译为韩文'],
  writing: ['润色这段话', '帮我写一篇作文', '修改语法错误'],
  image: ['照片', '相册'],
  generate: ['夕阳下的海滩', '赛博朋克城市', '国风山水画'],
  note: ['Python 入门笔记', '时间管理方法', '健身饮食计划', '读书笔记模板'],
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
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [noteData, setNoteData] = useState<{
    title: string; summary: string; keyPoints: string[];
    tag: string; blocks: NoteBlock[];
  } | null>(null);
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

    // ── 优先处理文件上传 + 用户指令 ──────────────────────────────
    if (pendingFiles.length > 0) {
      const files = [...pendingFiles];
      setPendingFiles([]);

      const fileNames = files.map(f => f.name).join('、');
      addChatMessage('user', `📎 ${fileNames}\n\n${trimmed}`, files[0].base64);

      const aiMsg = addChatMessage('assistant',
        `正在分析 ${files.length} 个文件（${fileNames}），按要求整理为结构化知识库（约需 30-60 秒）...`);
      setNoteData(null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userContent: any[] = [{ type: 'text', text: trimmed }];
        let textFiles = 0;
        for (const f of files) {
          if (f.text && f.text.length > 0) {
            // TXT/MD/CSV: 文本直接附加（限制长度避免超 token）
            const maxLen = 4000;
            const content = f.text.length > maxLen ? f.text.slice(0, maxLen) + '\n...(内容已截断)' : f.text;
            userContent.push({ type: 'text', text: `\n--- 文件: ${f.name} ---\n${content}` });
            textFiles++;
          } else {
            userContent.push({ type: 'image_url', image_url: { url: f.base64 } });
          }
        }

        // 构建消息：所有文件在一个 user 消息中
        const hasImages = files.length > textFiles;
        const hasText = textFiles > 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await callLLM({
          model: DEFAULT_MODEL,
          messages: [
            { role: 'system', content: FILE_TO_NOTE_PROMPT },
            // 如果有图片+文本混合，拆成两条消息
            ...(hasImages && hasText ? [
              { role: 'user' as const, content: `我上传了 ${textFiles} 个文本文件和 ${files.length - textFiles} 个图片文件。` },
              { role: 'user' as const, content: userContent as any },
            ] : [
              { role: 'user' as const, content: userContent as any },
            ]),
          ],
          stream: false, temperature: 0.5, maxTokens: 8192,
        });

        // 提取 JSON（多策略）
        let jsonStr = response.trim();
        // 策略1：去掉 markdown 代码块
        jsonStr = jsonStr
          .replace(/^```(?:json)?\s*\n?/im, '')
          .replace(/\n?```\s*$/im, '');
        // 策略2：提取最外层 {...}（支持嵌套）
        const fb = jsonStr.indexOf('{');
        if (fb >= 0) {
          let depth = 0, lb = fb;
          for (let ci = fb; ci < jsonStr.length; ci++) {
            if (jsonStr[ci] === '{') depth++;
            if (jsonStr[ci] === '}') depth--;
            if (depth === 0) { lb = ci; break; }
          }
          jsonStr = jsonStr.slice(fb, lb + 1);
        }
        // 策略3：修复常见 JSON 问题
        jsonStr = jsonStr
          .replace(/,(\s*[}\]])/g, '$1')  // 尾随逗号
          .replace(/\n/g, ' ')            // 换行转空格
          .replace(/\t/g, ' ');           // tab 转空格

        const parsed = JSON.parse(jsonStr);
        const structured = {
          title: parsed.title ?? '知识整理',
          summary: parsed.summary ?? '',
          keyPoints: parsed.key_points ?? [],
          tag: parsed.tag ?? (parsed.tags?.[0]) ?? '知识整理',
          blocks: (parsed.blocks ?? []) as NoteBlock[],
        };
        setNoteData(structured);

        const preview = `📋 **${structured.title}**

${structured.summary}

🔑 **关键要点**
${structured.keyPoints.map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}

✅ 已将 ${files.length} 个文件整理为结构化知识库，共 ${structured.blocks.length} 个内容块。点击「💾 保存为笔记」保存。`;
        updateChatMessage(aiMsg.id, preview);
      } catch (err: unknown) {
        const errMsg = (err as Error).message || String(err);
        // 显示更详细的错误信息帮助调试
        if (errMsg.includes('JSON')) {
          updateChatMessage(aiMsg.id, `[JSON 解析失败] AI 返回格式异常，请重试并确认文件清晰可读。\n\n提示：可以尝试减少文件数量或简化指令后重试。`);
        } else if (errMsg.includes('401') || errMsg.includes('api-key')) {
          updateChatMessage(aiMsg.id, '[错误] AppKey 无效或过期，请检查配置。');
        } else if (errMsg.includes('429') || errMsg.includes('rate')) {
          updateChatMessage(aiMsg.id, '[错误] 请求过于频繁，请稍后重试。');
        } else {
          updateChatMessage(aiMsg.id, `[错误] 分析失败：${errMsg}\n\n请尝试减少文件数量或重试。`);
        }
        setNoteData(null);
      }
      scrollToBottom();
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
    if (mode === 'note') {
      await handleGenerateNote(trimmed);
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
  }, [mode, pendingFiles, isStreaming, chatMessages, notes, addChatMessage, updateChatMessage, sendMessage]);

  const handleSendImage = useCallback(async (text: string, imageB64: string) => {
    // 兼容旧 image 模式：将单张图片加入待处理队列
    setPendingFiles(prev => [...prev, { name: 'image.jpg', mimeType: 'image/jpeg', base64: imageB64, size: 0 }]);
    setInput(text || '请分析这张图片');
  }, []);

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

  // ── AI 笔记生成 ──────────────────────────────────────────────────

  const handleGenerateNote = useCallback(async (topic: string) => {
    if (!topic.trim() || isStreaming) return;
    setInput('');
    setNoteData(null);

    addChatMessage('user', `📝 ${topic}`);
    const aiMsg = addChatMessage('assistant', '正在生成结构化笔记（约需 15-30 秒）...');

    try {
      const response = await callLLM({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: NOTE_GENERATION_PROMPT },
          { role: 'user', content: topic },
        ],
        stream: false,
        temperature: 0.7,
        maxTokens: 4096,
      });

      // 提取 JSON（多策略）
      let jsonStr = response.trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/im, '').replace(/\n?```\s*$/im, '');
      const fb = jsonStr.indexOf('{');
      if (fb >= 0) {
        let depth = 0, lb = fb;
        for (let ci = fb; ci < jsonStr.length; ci++) {
          if (jsonStr[ci] === '{') depth++;
          if (jsonStr[ci] === '}') depth--;
          if (depth === 0) { lb = ci; break; }
        }
        jsonStr = jsonStr.slice(fb, lb + 1);
      }
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1').replace(/\n/g, ' ').replace(/\t/g, ' ');

      const parsed = JSON.parse(jsonStr);

      const structured = {
        title: parsed.title ?? topic,
        summary: parsed.summary ?? '',
        keyPoints: parsed.key_points ?? [],
        tag: parsed.tag ?? (parsed.tags?.[0]) ?? topic,
        blocks: (parsed.blocks ?? []) as NoteBlock[],
      };

      setNoteData(structured);

      // 渲染摘要文本
      const preview = `📋 **${structured.title}**

${structured.summary}

🔑 **关键要点**
${structured.keyPoints.map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}

✅ 共 ${structured.blocks.length} 个内容块。点击「💾 保存为笔记」保存。`;

      updateChatMessage(aiMsg.id, preview);
    } catch (err: unknown) {
      updateChatMessage(aiMsg.id, `[错误] 笔记生成失败，请重试：${(err as Error).message}`);
      setNoteData(null);
    }

    scrollToBottom();
  }, [isStreaming, addChatMessage, updateChatMessage]);

  // ── 添加文件到待处理队列 ──────────────────────────────────────

  const handleAddFiles = useCallback(async () => {
    const file = await pickFile();
    if (!file) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allFiles: PickedFile[] = (file as any).__multi ?? [file];
    setPendingFiles(prev => [...prev, ...allFiles]);
  }, []);

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

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
        tag: 'AI绘图',
      });
    }
    scrollToBottom();
  }, [isStreaming, addChatMessage, updateChatMessage, generateImage, upsertNote]);

  // ── 模式切换 ──────────────────────────────────────────────────────

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    setPendingFiles([]);
    setNoteData(null);
    if (newMode === 'image') handlePickImage();
    if (newMode === 'generate') setInput('请帮我生成一张图片：');
    if (newMode === 'note') setInput('');
    if (newMode === 'translate') setInput('');
    if (newMode === 'writing') setInput('');
  };

  // ── 图片选择 ──────────────────────────────────────────────────────

  const handlePickImage = () => {
    const onSelect = (index: number) => {
      if (index === 1) capturePhoto().then(img => {
        if (img) setPendingFiles(prev => [...prev, { name: 'camera.jpg', mimeType: 'image/jpeg', base64: img, size: 0 }]);
      });
      else if (index === 2) pickFromGallery().then(img => {
        if (img) setPendingFiles(prev => [...prev, { name: 'gallery.jpg', mimeType: 'image/jpeg', base64: img, size: 0 }]);
      });
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

  const handleClear = () => { clearChat(); setPendingFiles([]); setNoteData(null); };

  const handleSaveAsNote = async (msg: ChatMessage) => {
    // 如果有结构化笔记数据，直接使用
    if (noteData) {
      upsertNote({
        title: noteData.title,
        content: msg.content,
        tag: noteData.tag || '笔记',
        blocks: noteData.blocks,
        summary: noteData.summary,
        keyPoints: noteData.keyPoints,
      });
      Alert.alert('已保存', `结构化笔记「${noteData.title}」已创建`);
      return;
    }

    const title = extractTitle(msg.content);

    // 用 LLM 分析内容生成一个标签
    let tag = '笔记';
    try {
      const response = await callLLM({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: TAG_SUGGESTION_PROMPT },
          { role: 'user', content: `标题: ${title}\n内容: ${msg.content.slice(0, 500)}` },
        ],
        stream: false,
        temperature: 0.3,
        maxTokens: 100,
      });
      const parsed = JSON.parse(response);
      tag = (parsed.tags ?? [])[0] ?? parsed.tag ?? '笔记';
    } catch {
      // LLM 失败时使用默认标签
    }

    upsertNote({
      title,
      content: msg.content,
      tag,
    });
    Alert.alert('已保存', `笔记「${title}」已创建`);
  };

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
    const isError = item.content.startsWith('[错误]');
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {hasImage && (
          <Image source={{ uri: item.imageBase64 }} style={styles.msgImage} resizeMode="cover" />
        )}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
        {/* AI 消息保存为笔记按钮 */}
        {!isUser && item.content.trim().length > 0 && !isError && (
          <Pressable
            style={styles.saveNoteBtn}
            onPress={() => handleSaveAsNote(item)}
          >
            <Text style={styles.saveNoteText}>📄 保存为笔记</Text>
          </Pressable>
        )}
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
             mode === 'note' ? ' — AI 生成结构化笔记' :
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
                 mode === 'note' ? 'AI 笔记生成' :
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

        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <View style={styles.fileChipsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fileChipsInner}>
              {pendingFiles.map((f, i) => (
                <View key={i} style={styles.fileChip}>
                  <Text style={styles.fileChipIcon}>{f.mimeType.startsWith('image/') ? '🖼' : '📄'}</Text>
                  <Text style={styles.fileChipName} numberOfLines={1}>{f.name}</Text>
                  <Pressable onPress={() => removePendingFile(i)} hitSlop={8}>
                    <Text style={styles.fileChipRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.fileChipHint}>输入处理要求后发送（如：整理成复习笔记）</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* 文件上传按钮（所有模式通用） */}
          <Pressable style={styles.imageButton} onPress={handleAddFiles}>
            <Text style={styles.imageButtonText}>📎</Text>
          </Pressable>
          {/* 图片拍照按钮（image 模式专用） */}
          {mode === 'image' && (
            <Pressable style={styles.imageButton} onPress={handlePickImage}>
              <Text style={styles.imageButtonText}>📷</Text>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            placeholder={
              pendingFiles.length > 0 ? '输入处理要求，如：整理成考试复习笔记...' :
              mode === 'translate' ? '输入需要翻译的内容...' :
              mode === 'writing' ? '输入需要润色或指导的内容...' :
              mode === 'generate' ? '描述你想生成的画面...' :
              '发送消息...'
            }
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isStreaming}
            onSubmitEditing={() => { if (input.trim() || pendingFiles.length > 0) handleSend(input); }}
          />
          <View style={styles.inputActions}>
            {isStreaming ? (
              <Pressable style={styles.stopButton} onPress={cancel}>
                <Text style={styles.stopButtonText}>■</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.sendButton,
                  (!input.trim() && pendingFiles.length === 0) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSend(input)}
                disabled={!input.trim() && pendingFiles.length === 0}
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
  saveNoteBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    backgroundColor: Colors.inactive,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  saveNoteText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textOnDark,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: Colors.textOnDark },
  assistantText: { color: Colors.textPrimary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },

  // File chips
  fileChipsBar: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileChipsInner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundStart,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileChipIcon: { fontSize: 13 },
  fileChipName: { fontSize: 12, color: Colors.textPrimary, maxWidth: 100 },
  fileChipRemove: { fontSize: 12, color: Colors.textTertiary, paddingHorizontal: 4, fontWeight: '700' },
  fileChipHint: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },

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
